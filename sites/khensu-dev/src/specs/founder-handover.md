---
title: 'Founder handover'
source: 'FOUNDER-HANDOVER.md'
---

# Founder handover — 14 October 2026

**Status: fired by signed intent.**  
**UTC:** 2026-10-14T14:27:57Z  
**Local (PDT):** 2026-10-14 07:27  

Elliott Wave LLC, by Elliott, triggers the founder succession path in `PROTOCOL.md` §12.5–12.7 as a **FounderHandover**: every founder power ends; every khėnsu.ñü repository that was private is public; patented material in those repos is released with the code.

The on-chain committee escrow and epoch header transition are not yet running. This document is the human-readable handover that those mechanisms will later record. Until the network can countersign, **GitHub public visibility and this notice are the release.**

---

## 1. What fired

| Path in `PROTOCOL.md` | What it means today |
| --- | --- |
| §12.5 FounderHandover | Founder role ends. No co-signature, admission veto or founder-only release key. |
| §12.6 Archive | Every repository head below is the archive snapshot of this handover. |
| §12.7 Escrow opens | Private code, design docs and patent drafts in the khėnsu.ñü repos are public under the licences in §3. |

This is one-way (`PROTOCOL.md` §12.5): nothing restores a founder role.

---

## 2. Repositories made open source

All under [github.com/elliott-wave-labs](https://github.com/elliott-wave-labs). Visibility: **public**.

| Repository | Licence | Contents |
| --- | --- | --- |
| [khensu-specs](https://github.com/elliott-wave-labs/khensu-specs) | CC BY 4.0 | Plan, threat model, protocol, design, patents folder, this notice |
| [khensu-core](https://github.com/elliott-wave-labs/khensu-core) | Apache-2.0 | MLS suite, credentials, Outfox, formats, UniFFI |
| [khensu-apple](https://github.com/elliott-wave-labs/khensu-apple) | AGPL-3.0-only (+ App Store exception) | SwiftUI apps `nu.khensu.ptah`, `nu.khensu.waves` |
| [khensu-tatenan](https://github.com/elliott-wave-labs/khensu-tatenan) | AGPL-3.0-only | Node: mixnet, mailbox, call relay, work receipts |
| [khensu-chain](https://github.com/elliott-wave-labs/khensu-chain) | AGPL-3.0-only | Post-quantum chain, token, shielded pool |
| [khensu-services](https://github.com/elliott-wave-labs/khensu-services) | AGPL-3.0-only | Key transparency, credentials, push, MOTOM |
| [khensu-devnet](https://github.com/elliott-wave-labs/khensu-devnet) | AGPL-3.0-only | One-machine node + mixnet + chain + push |
| [khensu-site](https://github.com/elliott-wave-labs/khensu-site) | AGPL-3.0-only (code); content CC BY 4.0 | khensu.ñü and product hosts |

Already public: [khensu-nu](https://github.com/elliott-wave-labs/khensu-nu) (legacy / mirror naming).

Authoritative licence map: [`LICENSING.md`](/specs/licensing). Outside contributors: [`CLA.md`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/CLA.md).

---

## 3. Patent grant (takes effect with this handover)

Elliott Wave LLC grants everyone an irrevocable, worldwide, royalty-free licence under every patent and patent application it holds that is necessary to make, use, sell, offer for sale, import and modify any implementation of the khėnsu.ñü network, apps, nodes, chain, media formats and sites, to the full extent described in `PROTOCOL.md` §12.7.

Draft claim language and assessments remain in [`PATENTS.md`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/PATENTS.md) and under [`patents/`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/patents). They are no longer held private for filing advantage; site work was already published without waiting for filings.

---

## 4. Live surfaces

| Host | What |
| --- | --- |
| [https://khensu.nu/](https://khensu.nu/) | Marketing site |
| [https://waves.khensu.nu/](https://waves.khensu.nu/) | nu.waves player (incl. ñü.scene, ñü.orbit, ñü.tide, ñü.ink, ñü.dim) |
| [https://khensu.nu/waves](https://khensu.nu/waves) | Same player on the apex host |
| Product hosts under `khensu.nu` | webe, void, media, memory, create, fi, bi, shield, network (see `AGENTS.md`) |

Specs on the public site track this repo (dev.khensu.nu/specs when synced).

---

## 5. Recipients of the notice (`PROTOCOL.md` §12.7)

When the network committee can deliver with on-chain proofs, the same archive goes to every node, the founder’s friends list, the press (WSJ, Forbes), Wikimedia Commons and the Internet Archive.

**Today:** the archive is the public GitHub repositories above. Anyone may clone, mirror, fork and deposit them with the Internet Archive or Wikimedia. A short press note is in §7.

---

## 6. What is not claimed here

- Unrelated Elliott Wave LLC repositories (non-`khensu-*` apps and sites) are unchanged by this handover.
- MOQOM proprietary crates (`moqom-relay`, `moqom-recorder`) stay out of khėnsu.ñü trees (`LICENSING.md`).
- App Store distribution still needs Apple’s process; AGPL + App Store exception applies as written.
- Network genesis, committee escrow keys and `FounderHandover` wire messages will cite this document’s UTC time when those features ship.

---

## 7. Press note (plain text)

```
FOR IMMEDIATE RELEASE — 14 October 2026

Elliott Wave LLC has triggered the khėnsu.ñü founder handover: every founder
power ends, and every khėnsu.ñü code repository is public open source
(Apache-2.0 for khensu-core; AGPL-3.0 for apps, nodes, chain and services;
CC BY 4.0 for specifications). Patent rights needed to implement the network
are licensed royalty-free as of this notice.

Repositories: https://github.com/elliott-wave-labs
Site: https://khensu.nu/
Music player: https://waves.khensu.nu/
Handover record: https://github.com/elliott-wave-labs/khensu-specs/blob/main/FOUNDER-HANDOVER.md

Contact: hello@elliottwave.studio
```

---

## 8. Signature block

| Field | Value |
| --- | --- |
| Entity | Elliott Wave LLC |
| Actor | Elliott (founder) |
| Action | FounderHandover (intent) + open-source release of all `khensu-*` repositories |
| Time | 2026-10-14T14:27:57Z |
| Spec | `PROTOCOL.md` §12.5–12.7 |

Cryptographic founder-threshold signature on a `FounderHandover` struct will be attached when the chain accepts that message. Until then, public git history and this file are the record.
