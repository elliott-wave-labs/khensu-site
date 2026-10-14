---
title: 'Licensing'
source: 'LICENSING.md'
---

# Licensing

This is the authoritative licence map for every khensu.ñü repository. Copyright holder: Elliott Wave LLC (until the network entity exists; see PLAN.md, Entities).

| Repository | Licence | Why |
| --- | --- | --- |
| `khensu-specs` | CC BY 4.0 | Specifications should be implementable by anyone, with credit. |
| `khensu-core` | Apache-2.0 | Primitives, MLS profile and wire formats. Other clients and operators link this; the patent grant in Apache-2.0 covers them. |
| `khensu-memory` | AGPL-3.0-only | On-device memory engine. Commercial licences available (see PATENTS.md). |
| `khensu-apple` | AGPL-3.0-only, plus the App Store permission below | The app. Anyone can audit and rebuild it. |
| `khensu-tatenan` | AGPL-3.0-only | Node software. Operators who modify it and run it for others must publish their changes. |
| `khensu-chain` | AGPL-3.0-only | Consensus, token and shielded pool. |
| `khensu-devnet` | AGPL-3.0-only | Local testnet tooling. |
| `khensu-site` | AGPL-3.0-only (code); content CC BY 4.0 | Website. |
| `khensu-services` | AGPL-3.0-only | Push gateway, PIR mirror, credential issuer. |

Rules:

1. Every source file starts with an SPDX line: `SPDX-License-Identifier: Apache-2.0` in khensu-core, `AGPL-3.0-only` elsewhere.
2. Every Rust crate sets `license` in its `Cargo.toml`. A crate without one is a bug.
3. Outside contributions need the CLA (`CLA.md`), checked by the CLA workflow on every pull request.
4. Dependencies must be compatible: Apache-2.0, MIT, BSD, ISC, Zlib, Unicode, MPL-2.0 (file-level) or AGPL/GPL-3.0 in AGPL repos only. `cargo deny` enforces this in CI.

## MOQOM code

khensu-tatenan and khensu-core may depend on these MOQOM crates, all Apache-2.0:

| Crate | Source |
| --- | --- |
| `moqom-proto` | moqom-engine-pq |
| `moqom-transport` | moqom-engine-pq |
| `moqom-client` | moqom-engine-pq (its dev-dependency on `moqom-relay` must be dropped in the extracted copy) |
| `moqom-mls`, `moqom-sframe`, `moqom-token`, `moqom-proof` | moqom-security |

`moqom-relay` and `moqom-recorder` are proprietary (`LicenseRef-MOQOM-Proprietary`). No khensu repository may copy, vendor, depend on, or port code from them. The tatenan relay role is written from the MOQT draft and `moqom-proto`'s public API. CI in khensu-tatenan fails if `moqom-relay`, `moqom-recorder` or `LicenseRef-MOQOM-Proprietary` appears in `Cargo.lock` or any source file.

## App Store permission

The AGPL and Apple's App Store terms conflict for third-party copyright holders. Elliott Wave LLC owns or is licensed (through the CLA) all code in khensu-apple, so it can ship the App Store build. In addition, `khensu-apple/APPSTORE-EXCEPTION.md` grants an additional permission under AGPL-3.0 section 7 so that anyone may distribute a build through Apple's stores, provided the corresponding source is published.

## Patents

Apache-2.0 includes a patent licence for khensu-core. As of the founder handover on 14 October 2026 (`FOUNDER-HANDOVER.md`), Elliott Wave LLC grants the royalty-free patent licence in that notice for every patent and application needed to implement khėnsu.ñü. Assessments and drafts live in `PATENTS.md` and `patents/`; they are public with the specs repo.
