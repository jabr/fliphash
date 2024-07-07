import * as XXH64 from "https://deno.land/x/xxhash64@2.0.0/mod.ts"

const seedBytes = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT)
const seedView = new DataView(seedBytes.buffer)

export default class Fliphash {
  static async instance(seed: bigint) {
    return new this(seed, await XXH64.create3())
  }

  private seedBytes = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT)
  private seedView = new DataView(this.seedBytes.buffer)

  private constructor(private seed: bigint, private hasher: XXH64.Hasher) {}

  private generateSeed(seed: bigint): Uint8Array {
    this.seedView.setBigUint64(0, seed)
    return this.seedBytes
  }

  hash(key: string, buckets: number) {
    if (buckets <= 0) { return 0n }

    const $h = (k: string, s: bigint, len: number, iteration: number) => {
      return this.hasher.reseed(
        this.generateSeed(s ^ BigInt(len + iteration << 32))
      ).update(k).digest('bigint') as bigint
    }

    const $p = (k: string, s: bigint, hash: bigint, mask: bigint) => {
      const mh = hash & mask
      if (mh === 0n) { return 0n }
      const flip = $h(k, s, Math.log2(mask), 0)
      return mh ^ flip
    }

    let mask = 0n
    let hash = $h(key, this.seed, 0, 0)

    let ph = $p(key, this.seed, hash, mask)
    if (ph <= buckets) { return ph }

    let iteration = 1

    let draw
    while (true) {
      if iteration > 64 { draw = null; break }
      draw = $h(key, this.seed, Math.log2(buckets), iteration) & mask
      if (draw <= mask >> 1n) { draw = null; break }
      else if (draw <= buckets) { break }
      iteration++
    }
    if (draw !== null) { return draw }
    return $p(key, this.seed, hash, mask)
  }
}
