import * as XXH64 from "https://deno.land/x/xxhash64@2.0.0/mod.ts"

type Key = bigint|string
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

  hash(key: Key, buckets: number) {
    if (buckets <= 1) { return 0n }
    const end = buckets - 1

    // xxh3
    const $h = (k: Key, s: bigint, len: number, iteration: number) => {
      const mm = BigInt(len) + BigInt(iteration) << 32n
      return this.hasher.reseed(
        this.generateSeed(s ^ mm)
      ).update(k).digest('bigint') as bigint
    }

    // moremur
    // const $h = (k: Key, s: bigint, len: number, iteration: number) => {
    //   // console.log("0", k, s, len, iteration);
    //   k = k ^ s
    //   // console.log("1", k)
    //   k = (k * (BigInt(len) * 2n + 1n)) & 0xffff_ffff_ffff_ffffn;
    //   // console.log("2", k)
    //   k = ((k ^ (k >> 27n)) * 0x3C79AC492BA7B653n) & 0xffff_ffff_ffff_ffffn;
    //   // console.log("3", k)
    //   k = (k * (BigInt(iteration) * 2n + 1n)) & 0xffff_ffff_ffff_ffffn;
    //   // console.log("4", k)
    //   k = ((k ^ (k >> 33n)) * 0x1C69B3F74AC4AE35n) & 0xffff_ffff_ffff_ffffn;
    //   // console.log("5", k)
    //   return k ^ (k >> 27n)
    // }

    const $p = (k: Key, s: bigint, hash: bigint, mask: bigint) => {
      // console.log('iph', hash.toString(2), mask.toString(2))
      const mh = hash & mask
      if (mh === 0n) { return 0n }
      const log2 = mh.toString(2).length - 1
      // console.log("p", k, s, hash, mask);
      // console.log("p2", mh, log2);
      const m2 = BigInt(Math.pow(2, mh.toString(2).length ) - 1) >> 1n
      // console.log(log2.toString(2), m2.toString(2))
      const flip = $h(k, s, log2, 0) & m2
      // console.log("pf", flip);
      return mh ^ flip
    }

    const mask = BigInt(Math.pow(2, end.toString(2).length) - 1)
    const hash = $h(key, this.seed, 0, 0)
    // console.log('a:', hash, mask)
    const ph = $p(key, this.seed, hash, mask)
    // console.log('p (?)', ph, end)
    if (ph <= end) { return ph }

    const endl2 = end.toString(2).length - 1
    let iteration = 1

    while (true) {
      if (iteration > 64) { break }
      const draw = $h(key, this.seed, endl2, iteration) & mask
      // console.log('l', draw)
      if (draw <= mask >> 1n) { break }
      else if (draw <= end) { return draw }
      iteration++
    }
    return $p(key, this.seed, hash, mask >> 1n)
  }
}

const fh = await Fliphash.instance(0n)

for (let i = 1; i < 2000; i++) {
  let b = fh.hash("abc", i)
  // let b = fh.hash(987650123450n, i)
  console.log(b, i)
}
