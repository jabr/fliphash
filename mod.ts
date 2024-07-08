import * as XXH64 from "https://deno.land/x/xxhash64@2.0.0/mod.ts"

type Key = bigint|string
interface Hasher {
  hash(key: Key, seed: bigint, bits: number, iteration: number): bigint;
}

class XXH3Hasher implements Hasher {
  private seedBytes = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT)
  private seedView = new DataView(this.seedBytes.buffer)

  constructor(private hasher: XXH64.Hasher) {}

  private generateSeed(seed: bigint): Uint8Array {
    this.seedView.setBigUint64(0, seed)
    return this.seedBytes
  }

  hash(key: string, seed: bigint, bits: number, iteration: number) {
    const mask = BigInt(bits) + BigInt(iteration) << 32n
    return this.hasher.reseed(
      this.generateSeed(seed ^ mask)
    ).update(key).digest('bigint') as bigint
  }
}

function intLog2(value: number|bigint) {
  return (value.toString(2).length - 1)
}

function maskFrom(value: number|bigint) {
  return BigInt(Math.pow(2, value.toString(2).length) - 1)
}

class MoremurHasher implements Hasher {
  // https://mostlymangling.blogspot.com/2019/12/stronger-better-morer-moremur-better.html
  hash(key: bigint, seed: bigint, bits: number, iteration: number) {
    key = key ^ seed
    key = (key * (BigInt(bits) * 2n + 1n)) & 0xffff_ffff_ffff_ffffn;
    key = ((key ^ (key >> 27n)) * 0x3C79AC492BA7B653n) & 0xffff_ffff_ffff_ffffn;
    key = (key * (BigInt(iteration) * 2n + 1n)) & 0xffff_ffff_ffff_ffffn;
    key = ((key ^ (key >> 33n)) * 0x1C69B3F74AC4AE35n) & 0xffff_ffff_ffff_ffffn;
    return key ^ (key >> 27n)
  }
}

export default class Fliphash {
  static async instance(seed: bigint = 0n) {
    return new this(BigInt(seed), await XXH64.create3())
  }

  private constructor(private seed: bigint, hasher: XXH64.Hasher) {
    this.xxh3Hasher = new XXH3Hasher(hasher)
  }

  private moremurHasher = new MoremurHasher()
  private xxh3Hasher: XXH3Hasher

  hash_string(key: string, buckets: number) {
    return Number(this.internalHash(this.xxh3Hasher, key, buckets))
  }

  hash_bigint(key: bigint, buckets: number) {
    return Number(this.internalHash(this.moremurHasher, key, buckets))
  }

  private internalHash(hasher: Hasher, key: Key, buckets: number) {
    if (buckets <= 1) { return 0n }
    const end = buckets - 1

    const rehash = (hash: bigint, mask: bigint) => {
      const maskedHash = hash & mask
      if (maskedHash === 0n) { return 0n }
      const log2 = intLog2(maskedHash)
      const halfMask = maskFrom(maskedHash) >> 1n
      const flip = hasher.hash(key, this.seed, log2, 0) & halfMask
      return maskedHash ^ flip
    }

    const mask = maskFrom(end)
    const hash = hasher.hash(key, this.seed, 0, 0)
    const ph = rehash(hash, mask)
    if (ph <= end) { return ph }

    const endLog2 = intLog2(end)
    for (let iteration = 1; iteration <= 64; iteration++) {
      const draw = hasher.hash(key, this.seed, endLog2, iteration) & mask
      if (draw <= mask >> 1n) { break }
      else if (draw <= end) { return draw }
    }
    return rehash(hash, mask >> 1n)
  }
}
