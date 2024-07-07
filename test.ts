import { describe, it, beforeEach } from "https://deno.land/std@0.224.0/testing/bdd.ts"
import { assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"

import Fliphash from "./mod.ts"

describe('Fliphash', () => {
  let hasher: Fliphash

  beforeEach(async () => {
    hasher = await Fliphash.instance()
  })

  describe('hash_bigint', () => {
    let key: bigint

    const assertBucket = (max: number, bucket: number) => {
      assertStrictEquals<number>(hasher.hash_bigint(key, max), bucket)
    }

    beforeEach(() => {
      key = 987650123450n
    })

    it('returns the expected bucket for a key and total number of buckets', () => {
      assertBucket(1, 0)
      assertBucket(2, 1)
      assertBucket(3, 2)
      assertBucket(4, 2)
      assertBucket(21, 2)
      assertBucket(22, 21)
      assertBucket(24, 21)
      assertBucket(25, 24)
      assertBucket(29, 24)
      assertBucket(30, 29)
      assertBucket(331, 29)
      assertBucket(332, 331)
      assertBucket(406, 331)
      assertBucket(407, 406)
      assertBucket(408, 407)
      assertBucket(497, 407)
      assertBucket(498, 497)
      assertBucket(1999, 497)
    })

    describe('with a different key', () => {
      beforeEach(() => {
        key = 1234n
      })

      it('returns a different set of buckets', () => {
        assertBucket(2, 0)
        assertBucket(22, 2)
        assertBucket(25, 2)
        assertBucket(100, 98)
        assertBucket(331, 323)
      })
    })

    describe('with a differnt seed', () => {
      beforeEach(async () => {
        hasher = await Fliphash.instance(123456789n)
      })

      it('returns a different set of buckets', () => {
        assertBucket(2, 0)
        assertBucket(4, 0)
        assertBucket(22, 16)
        assertBucket(332, 261)
        assertBucket(408, 261)
        assertBucket(1999, 1935)
      })
    })
  })

  describe('hash_string', () => {
    let key: string

    const assertBucket = (max: number, bucket: number) => {
      assertStrictEquals<number>(hasher.hash_string(key, max), bucket)
    }

    beforeEach(() => {
      key = "abc"
    })

    it('returns the expected bucket for a key and total number of buckets', () => {
      assertBucket(15, 0)
      assertBucket(16, 15)
      assertBucket(27, 26)
      assertBucket(75, 50)
      assertBucket(200, 117)
      assertBucket(600, 496)
      assertBucket(1000, 778)
    })

    describe('with a different key', () => {
      beforeEach(() => {
        key = "events:98d4df4f-05b2-465a-9cec-89ddfb2553a8:type=start"
      })

      it('returns a different set of buckets', () => {
        assertBucket(1, 0)
        assertBucket(16, 10)
        assertBucket(75, 72)
        assertBucket(200, 87)
      })
    })

    describe('with a differnt seed', () => {
      beforeEach(async () => {
        hasher = await Fliphash.instance(123456789n)
      })

      it('returns a different set of buckets', () => {
        assertBucket(15, 11)
        assertBucket(75, 45)
        assertBucket(200, 45)
        assertBucket(600, 570)
        assertBucket(1000, 570)
      })
    })
  })
})
