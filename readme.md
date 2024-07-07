# fliphash

A Typescript implementation of [FlipHash](https://arxiv.org/pdf/2402.17549), a consistent range-hashing algorithm. It is similar to JumpHash, but with constant time complexity and low memory requirements.

## Examples

```typescript
import Fliphash from "fliphash/mod.ts"

const hasher = await Fliphash.instance()

hasher.hash_string("abc",   8) // => 0
hasher.hash_string("abc",  16) // => 15
hasher.hash_string("abc",  32) // => 26
hasher.hash_string("abc", 271) // => 117

hasher.hash_bigint(1234n,   8) // => 2
hasher.hash_bigint(1234n,  16) // => 2
hasher.hash_bigint(1234n,  32) // => 2
hasher.hash_bigint(1234n, 271) // => 147

const alt = await Fliphash.instance(987654321n)
alt.hash_string("abc",   8) // => 6
alt.hash_string("abc", 271) // => 269
alt.hash_bigint(1234n,   8) // => 6
alt.hash_bigint(1234n, 271) // => 114
```

## References

Derived from the Rust [fliphash crate](https://docs.rs/fliphash/latest/fliphash/) based on the [FlipHash: A Constant-Time Consistent Range-Hashing Algorithm](https://arxiv.org/pdf/2402.17549) paper. Uses [XXH3](https://xxhash.com/) and [Moremur](https://mostlymangling.blogspot.com/2019/12/stronger-better-morer-moremur-better.html) hash implementations for string and integer keys, respectively.

## See also

* [xxHash64](https://github.com/jabr/xxhash64) - A fast, simple xxHash64 (and XXH3) implementation in TypeScript/WASM

## License

This project is licensed under the terms of the [MIT license](LICENSE.txt).
