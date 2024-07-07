import * as XXH64 from "https://deno.land/x/xxhash64@2.0.0/mod.ts"

type Key = bigint|string
interface Hasher {
  hash(k: Key, s: bigint, len: number, iteration: number): bigint;
}

class XXH3Hasher implements Hasher {
  private seedBytes = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT)
  private seedView = new DataView(this.seedBytes.buffer)

  constructor(private hasher: XXH64.Hasher) {}

  private generateSeed(seed: bigint): Uint8Array {
    this.seedView.setBigUint64(0, seed)
    return this.seedBytes
  }

  hash(k: string, s: bigint, len: number, iteration: number) {
    const mm = BigInt(len) + BigInt(iteration) << 32n
    return this.hasher.reseed(
      this.generateSeed(s ^ mm)
    ).update(k).digest('bigint') as bigint
  }
}

class MoremurHasher implements Hasher {
  // https://mostlymangling.blogspot.com/2019/12/stronger-better-morer-moremur-better.html
  hash(k: bigint, s: bigint, len: number, iteration: number) {
    k = k ^ s
    k = (k * (BigInt(len) * 2n + 1n)) & 0xffff_ffff_ffff_ffffn;
    k = ((k ^ (k >> 27n)) * 0x3C79AC492BA7B653n) & 0xffff_ffff_ffff_ffffn;
    k = (k * (BigInt(iteration) * 2n + 1n)) & 0xffff_ffff_ffff_ffffn;
    k = ((k ^ (k >> 33n)) * 0x1C69B3F74AC4AE35n) & 0xffff_ffff_ffff_ffffn;
    return k ^ (k >> 27n)
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

    const $p = (k: Key, s: bigint, hash: bigint, mask: bigint) => {
      const mh = hash & mask
      if (mh === 0n) { return 0n }
      const log2 = mh.toString(2).length - 1
      const m2 = BigInt(Math.pow(2, mh.toString(2).length ) - 1) >> 1n
      const flip = hasher.hash(k, s, log2, 0) & m2
      return mh ^ flip
    }

    const mask = BigInt(Math.pow(2, end.toString(2).length) - 1)
    const hash = hasher.hash(key, this.seed, 0, 0)
    const ph = $p(key, this.seed, hash, mask)
    if (ph <= end) { return ph }

    const endl2 = end.toString(2).length - 1
    let iteration = 1

    while (iteration <= 64) {
      const draw = hasher.hash(key, this.seed, endl2, iteration) & mask
      if (draw <= mask >> 1n) { break }
      else if (draw <= end) { return draw }
      iteration++
    }
    return $p(key, this.seed, hash, mask >> 1n)
  }
}
