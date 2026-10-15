---
title: 'ñü.wallet specification'
source: 'PAYMENTS.md'
---

# ñü.wallet: shielded payments specification

Version 0.1 (11 October 2026). Status: public draft for review, verification and penetration testing. This is the document `PROTOCOL.md` section 13 calls `PAYMENTS.md`; where the two differ, this one wins and `PROTOCOL.md` is updated to match.

ñü.wallet is the wallet in the khensu.ñü app and node app: a non-custodial, post-quantum shielded pool for tips, gifts, plays, subscriptions, tickets, sales, node pay and person-to-person payments. Amounts, senders and recipients are hidden; spends travel through the mixnet; nobody, including Elliott Wave LLC and the committee, holds funds or can freeze a note.

## 1. Scope

This document specifies, completely enough for an independent implementation that interoperates byte for byte:

- the recovery phrase and every key derived from it (section 4);
- the note, its commitment, its nullifier and the era tree (sections 5 and 6);
- the spend transaction, its fixed shape and the statement its STARK proves (sections 7 and 8);
- note encryption and delivery (section 9);
- deposits, withdrawals, era refresh and fees (sections 10 to 12);
- tap to pay through a licensed card partner (section 13);
- errors, versioning and registries (sections 14, 15 and 19);
- the threat model, security and privacy considerations (sections 16 and 17);
- how anyone verifies and attacks it: test vectors, reference code, formal models, fuzzing targets and the penetration-testing programme (section 18).

Out of scope: consensus itself (`PROTOCOL.md` sections 9 to 11), the token's issuance, and the card partner's own systems.

## 2. Conventions

The key words MUST, MUST NOT, SHOULD and MAY are used as in RFC 2119 and RFC 8174. Structures use the TLS presentation language (RFC 8446 section 3). Integers are big-endian unless a field element is meant. `||` is concatenation. `H(label, x)` is SHA-512 over `"khensu wallet v1 " || label || 0x00 || x`, truncated where a length is given. Field elements are in the Goldilocks field `p = 2^64 − 2^32 + 1`, encoded as 8-byte little-endian canonical integers.

## 3. Design rules

1. **Post-quantum everywhere.** No elliptic curves, pairings or RSA. Commitments, nullifiers and Merkle trees are hash-based (Poseidon2); proofs are STARKs (hash-based); note encryption is ML-KEM-1024 (FIPS 203) with AES-256-GCM; signatures, where any are needed, are ML-DSA-87 (FIPS 204).
2. **Fixed shapes.** Every spend has the same size, the same number of inputs and outputs, and travels in the same fixed-size mixnet packets, so a payment of 1¢ and one of $10,000 look identical.
3. **Non-custodial.** Value moves only with a proof made on the owner's device. The committee checks proofs and nullifiers; it can't move, freeze or see notes. A nu.media ban (`design/nu-media-bans.md`) must not freeze spendable notes: it only routes new media inbound into a held envelope the owner can release after the ban lifts.
4. **Forgetful.** Eras close and their trees and nullifier lists are deleted (section 6.3). History is kept only on the owner's devices, and only as long as the owner keeps it.
5. **Boundaries are the only public points.** Deposits into and withdrawals out of the pool are visible as amounts on public accounts; nothing inside the pool is.

## 4. Keys

### 4.1 Recovery phrase and seed

The recovery kit's 24-word phrase uses the BIP-39 English word list and checksum (256 bits of entropy from the device's CSPRNG). The wallet seed is

```
seed = Argon2id(password = NFKD(phrase), salt = "khensu wallet seed v1",
                t = 3, m = 256 MiB, p = 1, len = 64)
```

A device with less than 256 MiB free MUST refuse to derive rather than lower `m`. The phrase is shown once at sign-up and on request with Face ID; it is never stored in plain text.

### 4.2 Derived keys

```
sk_spend   = H("spend", seed)[0..32]             // never leaves the Secure Enclave-wrapped store
nk         = Poseidon2_hash("nk", sk_spend)      // nullifier key, 4 field elements
ak         = Poseidon2_hash("ak", sk_spend)      // spend authority, 4 field elements
owner      = Poseidon2_hash("owner", ak, nk)     // owner_pk_hash committed in every note
(ek, dk)   = ML-KEM-1024.KeyGen_internal(d = H("kem-d", seed)[0..32],
                                         z = H("kem-z", seed)[0..32])   // FIPS 203 section 6.1
ivk        = H("view", seed)[0..32]              // incoming viewing secret for history export
```

- `sk_spend` and `dk` are stored only wrapped by a Secure Enclave key with `.biometryCurrentSet`; every spend asks for Face ID or Touch ID.
- `ek` and `owner` form the **payment address**: `ñü1` + bech32m(`owner || SHA3-256(ek)`) for display, with the full `ek` (1,568 bytes) fetched from the sender's MLS group or the key transparency log entry for a handle.
- A **viewing grant** (for an accountant or an auditor the owner chooses) is `(dk, owner)` exported under a passphrase; it reveals incoming notes and nothing that allows spending.

### 4.3 Multiple devices

Every primary device derives the same keys from the same seed and keeps its own wrapped copy. Devices learn each other's spends through the owner's private MLS device group, so a note is never spent twice by two devices of the same owner; the nullifier check (section 8.3) is the backstop.

## 5. Notes

### 5.1 Assets and units

| `asset_id` | Asset | Base unit |
| --- | --- | --- |
| 1 | USDC (bridged 1:1, section 10.3) | 0.0001 USDC (one hundredth of a cent) |
| 2 | khensu token | 10^-8 token |

Amounts are `uint64` base units.

### 5.2 Denominations

Values MUST be in the 1-2-5 series: `{1, 2, 5} × 10^k` for `k = 0…11`, so 36 values from 0.0001 to 50,000,000 USDC. Paying an arbitrary amount uses up to four input notes and up to four output notes (section 7). The wallet keeps a working set of notes chosen so that common amounts (1¢ plays, 42¢ minimum payouts, $4.99, $20) need one transaction.

### 5.3 Note

```
struct {
  uint32 asset_id;
  uint64 value;           // a denomination (5.2)
  Felt   owner[4];        // owner_pk_hash of the recipient (4.2)
  Felt   rho[4];          // fresh randomness, H("rho", tx_hash || output_index) in a spend
  uint32 era;             // the era the note belongs to
  opaque memo[64];        // optional, encrypted only, zero-padded
} Note;
```

### 5.4 Commitment

```
cm = Poseidon2_hash("note", asset_id, value, owner, rho, era)    // 4 field elements, 32 bytes
```

`Poseidon2_hash(label, ...)` is the Poseidon2 sponge over Goldilocks with width 12, rate 8, the round constants and MDS matrix of the Plonky3 `poseidon2-goldilocks` parameter set, the label absorbed first as field elements of its ASCII bytes in 7-byte chunks, and the output the first 4 elements of the state.

### 5.5 Nullifier

```
nf = Poseidon2_hash("nf", nk, rho, era)    // 4 field elements
```

A nullifier can be computed only with `nk`, is unique per note, and reveals nothing about the note, its value or its owner.

## 6. Eras

### 6.1 Era tree

Each era has an append-only Merkle tree of depth 32 over note commitments, nodes `Poseidon2_hash("node", left, right)`, empty leaves `Poseidon2_hash("empty")`. The committee signs an interim root with every agreement round inside an epoch (every few seconds) and commits the last one in the epoch header (`PROTOCOL.md` section 12.2), signed by at least 2/3 of the committee with ML-DSA-87.

### 6.2 Era length and grace

| Parameter | Value |
| --- | --- |
| Era length | 30 days (720 network epochs of one hour, `PROTOCOL.md` section 2) |
| Grace period | 14 days after the era ends |
| Spendable eras | the current era, and the previous one during its grace period |

### 6.3 Closing an era

At the end of the grace period the committee deletes the era's tree and nullifier set and keeps only a 32-byte digest of the final root for disputes. Notes not refreshed by then are lost; the wallet refreshes in the background while unlocked (section 11), warns at 7, 3 and 1 days, and the node app refreshes for its operator wallet without interaction.

## 7. Spend transaction

Every spend, refresh and withdrawal has the same shape: exactly 4 inputs and 4 outputs. Unused inputs are dummy notes (value 0, random `owner`, flagged in the witness only); unused outputs are value-0 notes to a random owner. Dummies are indistinguishable on the wire.

```
struct {
  uint16 version = 1;
  uint32 era_in[4];            // per input: current or previous era
  Felt   root_in[4][4];        // era root each input is proved against
  Felt   nf[4][4];             // nullifiers
  Felt   cm_out[4][4];         // output commitments, all in the current era
  opaque enc_out[4][1680];     // note ciphertexts (9.1)
  uint64 fee;                  // base units of asset 1, public
  uint64 public_out;           // withdrawal amount, 0 for a private spend
  opaque public_dest[32];      // withdrawal account, zero for a private spend
  uint32 expiry_epoch;         // rejected after this epoch
  opaque proof<1..2^20-1>;     // STARK (8)
} Spend;
```

`tx_hash = H("tx", Spend without proof)[0..32]`. A `Spend` is padded to 128 KiB and sent as 2 bulk-lane mix packets of 64 KiB payload with final kind 5, committee ingress (`PROTOCOL.md` sections 8.3 and 8.4).

## 8. The proof

### 8.1 Statement

Public inputs: every field of `Spend` except `proof`, and `tx_hash`. Private witness: the four input notes, their Merkle paths, `sk_spend`, the four output notes and their encryption randomness.

The proof shows, for each input `i`:

1. `cm_i = Poseidon2_hash("note", ...)` of the witnessed note, and its Merkle path leads to `root_in[i]`;
2. `owner_i = Poseidon2_hash("owner", ak, nk)` with `ak`, `nk` derived from the witnessed `sk_spend`;
3. `nf[i] = Poseidon2_hash("nf", nk, rho_i, era_in[i])`;
4. `era_in[i]` equals the note's era;
5. or input `i` is a dummy with value 0;

and for the transaction:

6. every output commitment `cm_out[j]` is a well-formed note with a value from the 1-2-5 series or zero, and era equal to the current era;
7. for each asset, the sum of inputs equals the sum of outputs plus `fee` (asset 1) plus `public_out`;
8. `rho` of each output equals `H("rho", tx_hash || j)` reduced to field elements, so outputs can't be replayed into another transaction;
9. `enc_out[j]` hashes to the value bound inside the witness (encryption correctness is not proved; a sender who encrypts garbage only harms its own recipient, see 16).

The proof binds `tx_hash`, so it is also the spend authorisation; no separate signature is used.

### 8.2 Proof system

- AIR over Goldilocks, proved with a FRI-based STARK (Plonky3 `uni-stark`), blowup 8, 100 queries, 16 bits of proof-of-work grinding, Poseidon2 Merkle commitments: at least 128 bits of conjectured security against classical attackers and about 64 bits against Grover-accelerated attackers on the hash, with SHA-512-based Fiat–Shamir.
- Proving on iPhone 15 Pro or later in under 2 seconds (design target), on Mac in under 1 second; the Neural Engine is not used.
- Proof size about 70–90 KiB (design target).

The full constraint list, column layout and transition constraints are published as `payments/air.md` with the reference verifier (18.2); a change to any constraint is a new `version`.

### 8.3 Acceptance

A committee member accepts a `Spend` if and only if: `version` is supported; `expiry_epoch` has not passed; every `root_in` is a published root of the stated era and that era is spendable; no `nf` is already in that era's nullifier set or repeated within the transaction (dummies included, since their nullifiers are random); `fee` is at least the epoch's minimum fee; the proof verifies. Accepted spends are ordered in the committee's next agreement round; the nullifiers join the set and the output commitments are appended to the current era tree. The round's signed **spend receipt** (`tx_hash`, round, interim root, at least 2/3 committee ML-DSA-87 signatures) comes back through the sender's SURB within seconds and is final: the epoch header can only commit rounds already signed. Outputs are spendable from the next round.

## 9. Note encryption and delivery

### 9.1 Ciphertext

```
(ct_kem, ss) = ML-KEM-1024.Encaps(ek_recipient)                 // 1,568 bytes
key          = H("note-key", ss || cm_out[j])[0..32]
enc_out[j]   = ct_kem || AES-256-GCM(key, nonce = 0^12, Note || pad)   // 1,568 + 96 + 16 = 1,680 bytes
```

A fresh encapsulation per output makes the zero nonce safe. Dummy outputs carry random bytes of the same length.

### 9.2 Delivery

- **In a chat:** the sender also sends the note in an MLS `payment` content message (`PROTOCOL.md` section 5.1), so the recipient sees it at once, inside the group's encryption, with the sender's signature hidden in the ciphertext.
- **On chain:** `enc_out` is stored with the commitment for the life of the era, so a recipient restoring from the phrase finds its notes by trial decryption of the current and previous eras' ciphertexts (section 17 covers the cost).

## 10. Deposits and withdrawals

### 10.1 Deposit

A public account (token or bridged USDC) calls `deposit(asset_id, notes[1..4])` with output commitments and ciphertexts built by the depositor's wallet, and a STARK showing the commitments sum to the public amount. The amount and the public account are visible; the owner of the new notes is not.

### 10.2 Withdrawal

A `Spend` with `public_out > 0` pays `public_out` to `public_dest`. The amount and destination are public; which notes paid it is not.

### 10.3 USDC

USDC enters through a bridge contract that locks USDC on Ethereum, Base or Solana and mints asset 1 one to one, and burns asset 1 to release USDC. Bridge custody is a committee-threshold ML-DSA-87 account mirrored by the source chain's own multisig while those chains lack post-quantum signatures; this is the one place classical cryptography touches the system and it guards only bridged balances at the boundary, never the pool's privacy.

### 10.4 Screening

Sanctions screening applies only at the boundary, by the bridge and the card partner, on public addresses and amounts, as their licences require. Nothing inside the pool can be screened, frozen or reversed.

## 11. Era refresh

A refresh is an ordinary `Spend` from previous-era notes to current-era notes, owner unchanged, `fee` paid as usual. The wallet spreads refreshes over random times within the grace period and batches up to four notes per spend, so refreshes don't reveal how many notes one person holds.

## 12. Fees

| Action | Network fee |
| --- | --- |
| Send (tip, gift, play, subscription, ticket, sale, person to person) | under 1¢, paid by the sender |
| Receive | none |
| Withdraw to a public account or card | under 1¢ |
| Era refresh | under 1¢ per spend of up to 4 notes |

The minimum fee is set each epoch by consensus from committee load, with a protocol ceiling of 1¢ (100 base units of asset 1); fees go to that epoch's node pay pool. khensu.ñü takes no commission on any of these. Third-party fees outside the network (a bank's foreign-exchange fee, a source chain's gas when bridging) are shown before confirming.

## 13. Tap to pay

A licensed issuing partner provisions a debit card into Apple Wallet. At authorisation, the partner sends an authorisation request to the user's wallet through the push gateway (a wake only; the request itself is fetched over the mixnet); the wallet asks for Face ID, makes a withdrawal `Spend` of the amount plus the partner's quoted fee to the partner's settlement account, and the partner approves on the committee's spend receipt (8.3), within the card network's authorisation window. The partner sees the merchant, the amount and its own card account, as any card issuer does; it never sees the user's other notes, contacts or history. Offline or slow authorisations are covered by a small prefunded card balance the user chooses.

## 14. Errors

| Code | Name | Meaning |
| --- | --- | --- |
| 0x0001 | `bad_version` | unsupported `version` |
| 0x0002 | `expired` | `expiry_epoch` passed |
| 0x0003 | `unknown_root` | a `root_in` isn't a published root of a spendable era |
| 0x0004 | `era_closed` | an input era is past its grace period |
| 0x0005 | `double_spend` | a nullifier is already in the set |
| 0x0006 | `fee_too_low` | `fee` under the epoch minimum |
| 0x0007 | `bad_proof` | the STARK doesn't verify |
| 0x0008 | `bad_shape` | wrong field sizes or padding |
| 0x0009 | `bridge_limit` | deposit or withdrawal over the bridge's per-epoch limit |

Errors are returned to the sender through its SURB and never published.

## 15. Versioning

`Spend.version` covers the transaction layout, the AIR and every hash domain label. A new version is introduced at an era boundary; the committee accepts the previous version until the end of that era's grace period. Keys and addresses are versioned by the `ñü1` prefix.

## 16. Threat model

| Adversary | Can | Gets |
| --- | --- | --- |
| A node operator, or up to 20% of the network | Sees, delays and drops packets | Nothing about who pays whom, or how much |
| The committee, or a coalition below its threshold | Orders and accepts spends | Nullifiers, commitments and boundary amounts; can't spend, freeze or link notes |
| A global passive observer | Watches every link | Fixed-size packets in cover traffic; boundary amounts only |
| A future quantum computer | Breaks discrete logs and factoring | Nothing: no classical cryptography protects notes or proofs |
| A thief with an unlocked phone | Holds the device | Can't spend without Face ID or Touch ID; panic wipe erases the wrapped keys first |
| A coerced user | Is forced to unlock | Duress passcode opens a hidden profile with its own wallet |
| A malicious sender | Sends a garbage ciphertext | Its own payment is lost to the recipient; nobody else is affected |
| The card partner | Sees card authorisations | Merchant and amount of card payments only |

Stated limits: boundary deposits and withdrawals are public; timing correlation between a deposit and a later withdrawal of a similar amount by the same person is possible if the pool is small; anonymity grows with the number of people paying in the same eras.

## 17. Security and privacy considerations

- **Soundness** rests on the AIR being complete; a missing constraint could allow inflation. The AIR is published, independently reviewed and mutation-tested (18.4), and the committee's total supply check (inputs minus outputs equals fees plus withdrawals, per block, on public values) bounds what any bug could create within one block.
- **Trial decryption cost:** a full restore decapsulates every ciphertext of two eras (design load 50 million outputs, about 30 minutes on an iPhone 15 Pro in the background). Ordinary use never scans: notes arrive in chats.
- **Key separation:** nothing derived for the wallet is reused for MLS, identity or the KT log.
- **Memory hygiene:** `sk_spend`, `dk` and witnesses are zeroised after each proof; proving runs in a separate process with no network access.
- **No history on servers:** the wallet's history lives only on the owner's devices and follows chat timers where set.

## 18. Verification and penetration testing

Everything needed to check, reimplement and attack ñü.wallet is public, the same way ñü.media's codec is.

### 18.1 Test vectors

Published as JSON in `khensu-core/vectors/wallet/`, each with inputs, every intermediate value and the expected output:

| File | Covers |
| --- | --- |
| `phrase-seed.json` | phrase to seed (Argon2id), 20 cases including NFKD edge cases |
| `keys.json` | seed to `sk_spend`, `nk`, `ak`, `owner`, ML-KEM `ek`/`dk` (checked against FIPS 203 KATs), payment address |
| `poseidon2.json` | the Poseidon2 permutation and labelled hash, 100 cases |
| `notes.json` | note encoding, commitment, nullifier, every denomination |
| `tree.json` | era tree roots and paths at sizes 0, 1, 2, 3, 1,000 and 2^20 |
| `encryption.json` | note ciphertexts with fixed KEM randomness, and tampered ciphertexts that must fail |
| `spends-valid.json` | 50 full `Spend`s with proofs that MUST verify: payments, refreshes, withdrawals, all-dummy padding |
| `spends-invalid.json` | 200 `Spend`s that MUST be rejected, one per error code and per constraint in the AIR |

### 18.2 Reference code

- `khensu-core/crates/khensu-wallet` (Apache-2.0, open source): key derivation, note format, encryption, the AIR, the prover and a standalone verifier, with a CLI (`khensu-wallet verify spend.bin`, `khensu-wallet vectors --check`).
- The committee's acceptance logic is specified in section 8.3 and exercised end to end on `khensu-devnet`; the node and chain code stay sealed until released (`PROTOCOL.md` 12.7), so verification never depends on reading them.

### 18.3 Formal models

- Tamarin: note delivery in MLS, spend authorisation and replay, era refresh and the duress profile.
- The AIR is mirrored in a second, independent implementation (Lean 4 over the same constraint list) and both are checked against `spends-valid.json` and `spends-invalid.json`.

### 18.4 Fuzzing and mutation

- cargo-fuzz targets: `Spend` parsing, note decryption, verifier on random and mutated proofs, Merkle path verification.
- Constraint mutation: every constraint in the AIR is removed in turn, and a witness generator searches for a proof that inflates value, forges a nullifier or spends someone else's note; each mutation must be caught by at least one vector.
- Differential: the Rust and Lean verifiers must agree on every fuzzed input.

### 18.5 Devnet and public builds

`khensu-devnet` runs the pool, committee, bridge mocks and card-partner mock on one machine. Public TestFlight and macOS builds point at a public test network with valueless test USDC, so anyone can make, intercept and replay real spends.

### 18.6 Penetration-testing programme

- **In scope:** the khensu.ñü app's wallet (iPhone, iPad, Mac), the node app's operator wallet, `khensu-wallet`, the public test network, the bridge contracts on testnets, and the card-partner integration in its sandbox.
- **Wanted:** inflation or theft, spending without the owner's key or biometric, linking a spend to its notes or its owner, learning an amount, double spends, denial of service against the committee with valid-looking spends, key extraction from a locked or unlocked device, and any deviation from this document.
- **Out of scope:** social engineering of staff, physical attacks on other people's devices, volumetric DDoS.
- **Safe harbour:** good-faith research under these rules is authorised; report to security@elliottwave.studio with steps to reproduce. We acknowledge within three working days, and pay bounties on the published scale, highest for soundness and privacy breaks.
- **Audits:** two independent audits before mainnet (cryptography and AIR; app and bridge), published in full with our responses.

## 19. Registries

| Registry | Values |
| --- | --- |
| `asset_id` (`uint32`) | 1 USDC, 2 khensu token; 3–65,535 reserved |
| Hash domain labels | `spend`, `nk`, `ak`, `owner`, `kem-d`, `kem-z`, `view`, `note`, `nf`, `node`, `empty`, `rho`, `tx`, `note-key` |
| Error codes (`uint16`) | section 14 |
| MLS content type | `payment` (`PROTOCOL.md` section 5.1) |
| Mix final kind | 5, committee ingress (`PROTOCOL.md` section 8.4) |
| Spend receipt label | `Label("spend receipt")` (`PROTOCOL.md` section 1) |

## 20. Open issues

- `PLAN.md` places the STARK prover and verifier in `khensu-chain`; the prover has to run on the phone, so it lives in `khensu-core` (`khensu-wallet`) and the chain links the same verifier.
- Proving time and proof size are design targets until the AIR is benchmarked on iPhone 15 Pro.
- Bridge custody on chains without post-quantum signatures (10.3) is the weakest link; it moves to native post-quantum accounts as source chains add them.
- The card partner and its licensing are chosen region by region after legal review.

## Changelog

- 0.1 (11 Oct 2026): first public draft. Denominations move from 1, 10, 100, 1,000 units to the 1-2-5 series, which needs fewer notes per payment; `PROTOCOL.md` section 13 updated to match.
