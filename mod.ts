import * as XXH64 from "https://deno.land/x/xxhash64@2.0.0/mod.ts"

export default class Fliphash {
  static async instance(seed: bigint) {
    return new this(BigInt(seed), await XXH64.create3())
  }

  private seedBytes = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT)
  private seedView = new DataView(this.seedBytes.buffer)

  private constructor(private seed: bigint, private hasher: XXH64.Hasher) {}

  private generateSeed(seed: bigint): Uint8Array {
    this.seedView.setBigUint64(0, seed)
    return this.seedBytes
  }

  hash(key: string, buckets: number) {
    if (buckets <= 1) { return 0n }
    const end = buckets - 1

    const $h = (k: string, s: bigint, len: number, iteration: number) => {
      const mm = BigInt(len) + BigInt(iteration) << 32n
      return this.hasher.reseed(
        this.generateSeed(s ^ mm)
      ).update(k).digest('bigint') as bigint
    }

    const $p = (k: string, s: bigint, hash: bigint, mask: bigint) => {
      const mh = hash & mask
      if (mh === 0n) { return 0n }
      const log2 = mask.toString(2).length - 1
      const m2 = BigInt(Math.pow(2, mask.toString(2).length ) - 1) >> 1n
      console.log(log2.toString(2), m2.toString(2))
      const flip = $h(k, s, log2, 0) & m2
      return mh ^ flip
    }

    const mask = BigInt(Math.pow(2, end.toString(2).length) - 1)
    const hash = $h(key, this.seed, 0, 0)
    const ph = $p(key, this.seed, hash, mask)
    if (ph <= end) { return ph }

    const endl2 = end.toString(2).length - 1
    let iteration = 1

    while (true) {
      if (iteration > 64) { break }
      const draw = $h(key, this.seed, endl2, iteration) & mask
      console.log('l', draw)
      if (draw <= mask >> 1n) {break }
      else if (draw <= end) { return draw }
      iteration++
    }
    return $p(key, this.seed, hash, mask >> 1n)
  }
}
