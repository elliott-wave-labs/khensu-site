---
title: 'Threat model'
source: 'THREAT-MODEL.md'
---

# khensu.ñü threat model

Status: draft 0.1, 9 October 2026. Frozen together with `PROTOCOL.md` before product code starts. Every change after the freeze is a dated entry in the changelog at the end.

This document says who we defend against, what we promise, what we don't, and why. `PROTOCOL.md` says exactly how. Where the two disagree, this document wins and the protocol is fixed.

## 1. What we protect

| Asset | Examples | Protected against |
| --- | --- | --- |
| Content | Message text, attachments, voice notes, call audio and video, polls, reactions, edits | Everyone except the intended group members' devices |
| Social graph | Who talks to whom, who is in which group, who subscribes to which channel | Every single node, us, Apple, network observers (see 4.2 for limits) |
| Timing and volume | When you send, how often, how much | Every single node, us, Apple; a global passive observer to the extent cover traffic allows |
| Identity binding | Which keys belong to which address and handle | Impersonation, including by us and by a malicious log operator |
| Location and network identity | Your IP address | Every node except your entry node; your entry node doesn't learn who you talk to |
| Money | Balances, payment amounts, sender, recipient | Everyone except sender and recipient; the chain only sees nullifiers and commitments |
| Local data | History, keys, memory index | Someone holding your locked phone; someone holding your unlocked phone without Face ID or the app passcode |
| Availability | Being able to send and receive | Single-node failure, a committee minority, blocking of `khensu.nu` |

## 2. Adversaries

Each adversary is described by what it can do. "Covered" means the guarantees in section 3 hold against it. "Out of scope" means they don't, and section 5 explains what we do instead.

| # | Adversary | Capabilities | Status |
| --- | --- | --- | --- |
| A1 | **Malicious node** | Runs one or more nodes (mix, mailbox, sequencer, relay, bridge, PIR mirror). Reads, delays, drops, replays, reorders and injects anything passing through it. Up to 20% of nodes in any role, and no operator above 20% of a role. | Covered |
| A2 | **Colluding nodes** | A1 for several nodes at once, sharing everything they see, up to the same 20% bound. | Covered for content and identity. Metadata covered unless the coalition holds every hop of a path (probability bounded in 3.3). |
| A3 | **Global passive observer** | Sees every packet on every link (an ISP coalition or intelligence agency). Doesn't modify traffic. | Covered for messages, receipts and typing, to the anonymity set size given by cover traffic. Not covered for live call timing (5.2). |
| A4 | **Global active adversary** | A3 plus delaying, dropping and injecting on any link. | Out of scope for strong anonymity; content and identity guarantees still hold. |
| A5 | **Malicious committee minority** | Controls fewer than 1/3 of an epoch's 21-member committee. | Covered: can't forge an epoch header, can't mint, can't change the node list alone. |
| A6 | **Malicious log operator** | Runs the key transparency log. Tries to show different keys to different people (split view) or hide an entry. | Covered while a quorum of independent witnesses is honest. |
| A7 | **Us, the company** | Runs the push gateway, credential issuer, the log, genesis nodes, the founder key shares; publishes the apps. | Covered for content, social graph and identity (we can't read or redirect). Not covered against a malicious app release (A11). |
| A8 | **Stolen founder share** | Holds up to 2 of the 5 founder shares. | Covered: 3 of 5 are needed, and every founder action is time-locked and visible. |
| A9 | **Device seizure, locked** | Has your locked phone. | Covered: data protection class Complete, keys in the Secure Enclave. |
| A10 | **Device seizure, unlocked or coerced** | Has your unlocked phone, or can force your face. | Partly covered: app lock with passcode-only option, duress passcode, hidden profiles, panic wipe, identity key bound to enrolled biometrics. Not covered if you unlock the app for them. |
| A11 | **Compromised supply chain** | Pushes a malicious app or node build, or a compromised dependency. | Mitigated, not prevented: release hashes in the transparency log, reproducible node builds, hardware keys on accounts (5.4). |
| A12 | **Quantum adversary, harvest now** | Records everything today, decrypts with a large quantum computer later. | Covered: every key exchange is ML-KEM-1024, every signature ML-DSA-87. No classical primitive protects confidentiality or authenticity. |
| A13 | **Malicious group member** | A legitimate member of your group. | Covered for impersonating other members (signatures) and for reading messages from before they joined or after they left. Not covered for leaking what they legitimately saw. |
| A14 | **Spammer and Sybil** | Creates many accounts or nodes. | Covered: STARK rate-limit proofs bound to enrolment credentials for first contact; reputation times stake for nodes. |
| A15 | **Censor** | Blocks domains, IP ranges and protocols in a country. | Partly covered: embedded seed lists, home-node bridges handed out a few at a time, traffic that looks like ordinary QUIC. A censor willing to block all QUIC is out of scope. |
| A16 | **Apple** | Operates APNs, App Attest, Declared Age Range, the App Store. | Covered for content and social graph. Apple sees that a device uses khensu, a fixed "New message" alert, and purchases. |

## 3. Guarantees

### 3.1 Confidentiality

- **C1.** Only the devices that are members of an MLS group in a given epoch can decrypt that epoch's messages. Nodes, us, Apple and the log see ciphertext only.
- **C2.** Forward secrecy within an epoch: each message key is derived from a per-sender ratchet and deleted after use. Compromising a device reveals no message whose key has already been deleted.
- **C3.** Post-compromise security: every device commits a full update path at least every 5 minutes or 1,000 messages. A compromised device that is no longer under attacker control heals at its next update.
- **C4.** New members can't read history from before they joined; removed members can't read anything after the commit that removes them.
- **C5.** Attachments, profile names, avatars, group names, typing events, read receipts, backups and channel posts are encrypted under keys only members hold.
- **C6.** All of the above holds against A12.

### 3.2 Authenticity and integrity

- **I1.** Every application message is signed by the sender device's ML-DSA-87 key inside the ciphertext. A recipient knows which device and which account sent it, and that it wasn't changed.
- **I2.** No node can see or verify those signatures, because they are inside the encryption.
- **I3.** Signature keys rotate with every update commit (5 minutes or 1,000 messages) and are erased on rotation. A later device seizure can't produce signatures valid for earlier periods.
- **I4.** Retired signature keys are revealed to the group 7 days after rotation, once the late-message window has closed. After that, a saved transcript proves nothing to an outsider. Messages signed with a retired key after its window are rejected. (Subject to the formal model; see 6.)
- **I5.** Device credentials are bound to the account through the transparency log. Accepting a device requires a valid log entry, an inclusion proof and a quorum of witness cosignatures.
- **I6.** No one, including us and a malicious log operator, can attach a new device to your account without one of your identity devices (with a 72-hour cancel window when removing your other devices) or your recovery kit.
- **I7.** Commits in a group are totally ordered by the group's sequencer. A sequencer that signs two commits for the same epoch produces evidence that gets it slashed.
- **I8.** Group calls: each sender signs manifests of its frame authentication tags (every 1 s for video, 5 s for audio). A member can't inject frames as another member for longer than one manifest interval without detection.

### 3.3 Metadata privacy

- **M1.** The outer packet carries no sender. Each hop learns only its previous and next hop.
- **M2.** Mailbox IDs are derived from the MLS exporter per conversation and rotate every epoch. A mailbox node can't link a conversation across epochs, or link a mailbox to an account.
- **M3.** Messages, receipts and typing events are fixed-size small packets; attachments are fixed-size bulk packets. Message length is hidden by padding to packet-count buckets of 3, 4, 6 or 8.
- **M4.** While the app is open, phones send one burst of 4 small packets every 2 s on every network and power state, and real packets replace cover packets. An observer of a single phone sees the same pattern idle or busy.
- **M5.** Path selection spreads the five hops across operators, networks and countries. With at most 20% of each role malicious and independent choice per layer, the chance a single path is fully controlled is at most 0.2^5 ≈ 0.03% (entry, three mix layers, mailbox).
- **M6.** Directory lookups use PIR against several mirrors, through the mixnet. Mirrors learn nothing about which entry was fetched.
- **M7.** Channel subscribers fetch posts through the mixnet. Neither the channel owner nor any node learns the subscriber list.
- **M8.** The push gateway learns only that some device should wake, at a delayed and merged time. It never learns the sender, conversation, mailbox or account.
- **M9.** The group sequencer sees an opaque group ID and encrypted commits that arrive through the mixnet. It never learns who is in the group.
- **M10.** On khensu hardware (shell, home node, portal) a separate guard chip owns every radio and network path. Even with the main computer or a radio's firmware compromised, only fixed-size packets on the fixed tick, addressed to current entry nodes, leave the device, and radios can't read main memory (`design/guard.md`).
- **M11.** Every connection to a node passes as Safari or Chrome visiting an ordinary website, and answers probes as that website; the node is authenticated inside with ML-KEM-1024 and ML-DSA-87 bound to the outer session (`design/camouflage.md`). Camouflage hides what a connection is, not where it goes: published node addresses can still be blocked.
- **M12.** In calls, rooms and live streams every participant rotates edge relays at independent random times, so no relay or operator sees a whole session.

### 3.4 Money

- **P1.** A shielded payment reveals nothing to the chain except a nullifier and new note commitments, with a STARK proving validity. Amounts, sender and recipient are hidden.
- **P2.** Spends are submitted through the mixnet, so no node learns the submitter's IP.
- **P3.** Eras expire and their spent lists are deleted; only balances and stakes persist.
- **P4.** The wallet is non-custodial: we never hold user keys or funds.

### 3.5 Local data

- **L1.** With the phone locked, history, keys and the memory index are unreadable (Complete protection). Incoming packets wait in a `CompleteUnlessOpen` queue that can be written but not read.
- **L2.** With the phone unlocked but the app locked, the local store key isn't in memory.
- **L3.** Memory-derived data (facts, embeddings, observations) is deleted with the messages it came from and is never backed up.
- **L4.** A duress passcode wipes; a second passcode opens a hidden profile; nothing in storage reveals how many profiles exist.
- **L5.** Panic wipe crypto-erases by deleting the Secure Enclave wrapping key first.

### 3.6 Availability

- **V1.** Every packet is stored on three mailbox replicas run by different operators.
- **V2.** Sequencer duty fails over to a standby at the next epoch.
- **V3.** Apps pin the genesis keys and embed a seed list, so the network keeps working if `khensu.nu` or `tatenan.khensu.nu` is blocked or seized.
- **V4.** The committee tolerates fewer than 1/3 faulty members per epoch.

## 4. Known limits (stated, not hidden)

### 4.1 Recipients can prove authorship for up to 7 days

Until a retired key is revealed, a recipient holding a message and the sender's then-current public key can show a third party that the sender's device signed it. After the reveal they can't. Users who need full deniability should use disappearing messages with short timers. This is a weaker property than Signal's deniability and a stronger one than plain MLS.

### 4.2 Anonymity depends on how many people use the network

The anonymity set is the set of users sending at similar times. In the early network it is small; the app shows an "Early network" notice until the bootstrap thresholds in `PLAN.md` hold (30 mix nodes, 10 operators, 5 countries, 5 networks, no operator above 20%).

### 4.3 Phones only send cover traffic while the app is open

iOS suspends background apps. A global observer can see when the app is in the foreground. While it is, the phone sends one fixed burst every 2 s on every network and in every power state, so nothing inside an open session reveals activity; queued messages leave in the ticks when it next opens. Large originals and video never leave the constant pattern: they go through the user's own node, the charging window or a trickle (`PLAN.md`, Stealth).

### 4.3a Phones and computers have no hardware guard

iPhones, iPads and Macs can't carry the guard chip, so there the tick and cover rules are enforced by the app and tatenan in software. Malware with full control of the phone could break the pattern; it could also read the screen, so the guard wouldn't save that user anyway. Dedicated khensu hardware gets the stronger guarantee in M10.

### 4.4 Long-term intersection attacks

An adversary who watches a user for weeks and correlates online periods with a contact's activity can narrow down contacts. Cover traffic and mixing delays slow this; they don't stop it. Users at high risk are advised to keep the Mac node running, which sends cover traffic around the clock.

### 4.5 The push gateway is central

It sees that a device uses khensu and roughly when wakes happen. It can't see who or what. Users who don't want that pick "Off" mode and fetch when they open the app.

### 4.6 Group size is visible to members, and tree size to joiners

The ratchet tree reveals how many devices a group has, to its members. Nodes that serve tree chunks see the size of a fetch, padded to chunk multiples.

### 4.7 Founder powers during launch

Until step-down, the founder threshold key co-signs rule changes and approves validators. Every such action is visible in epoch headers and time-locked for 30 days, except tighten-only emergencies (48 hours). The founder can't read messages, mint outside the schedule, move user funds or reassign handles.

## 5. Out of scope, and what we do instead

| # | Threat | Why out of scope | What we do |
| --- | --- | --- | --- |
| 5.1 | Endpoint malware with root on the device | It sees the screen and keystrokes | Enhanced Security (memory tagging), third-party keyboards blocked, Lockdown Mode compatible, minimal attack surface |
| 5.2 | Timing correlation of live calls by a global observer | A mixnet's delays can't carry live media | Stealth call profile (`PROTOCOL.md` 7.1): two relays from different operators, networks and jurisdictions; setup over the mixnet; constant-rate fixed-size media (no speech-pattern leak); padded relay trunks; random 2–8 s padding before and after each call; camouflaged transport on UDP 443; independent random relay rotation during the call; no direct internet paths. A global observer can still match call start, end and duration across the two edges over time; the app says so |
| 5.3 | A global active adversary breaking anonymity | Active attacks on all links defeat any practical mixnet | Content and identity guarantees still hold; loop measurement detects nodes that drop traffic |
| 5.4 | A malicious app release | We sign the app | Release hashes in the transparency log, reproducible node builds, binary transparency checks in the app for updates, hardware keys on accounts, signing only from locked-down CI |
| 5.5 | A recipient leaking content | Recipients see plaintext | Disappearing messages, screenshot notice where iOS allows, message franking for reports |
| 5.6 | Rubber-hose coercion for passcodes | No software stops that | Duress passcode, hidden profiles, panic wipe, wipe after failed attempts |
| 5.7 | Forensic storage-size analysis across time for hidden profiles | Container size is fixed, but wear patterns may leak | Fixed-size container with random fill; stated limit |
| 5.8 | A censor blocking all QUIC or all unknown traffic | Requires a different transport | Bridges and pluggable transports are tracked as later work |
| 5.9 | Breaks of ML-KEM or ML-DSA themselves | No classical fallback, by decision | Verified implementations, KyberSlash-class tests, crypto agility through MLS suite change with one commit per group |

## 6. Assumptions

1. ML-KEM-1024 is IND-CCA2 and ciphertext-anonymous; ML-DSA-87 is EUF-CMA. AES-256-GCM and SHA-512 are secure. These hold against quantum adversaries at category 5.
2. libcrux implementations of ML-KEM and ML-DSA are correct and constant-time on Apple silicon and Cortex-A76 (Pi 5).
3. The Secure Enclave doesn't export keys and enforces access control policies.
4. At least a quorum of key transparency witnesses is honest and online.
5. Fewer than 1/3 of each epoch's committee is malicious; at most 20% of each node role and no operator above 20%.
6. The STARK system used for payments and rate limits is sound, with hash-based security only.
7. Users verify safety numbers or rely on transparency log monitoring for contacts that matter to them.
8. Delayed key reveal (I4) and the rate-limit nullifier scheme are proved safe in the Tamarin model before shipping. If a proof fails, the property is dropped, not weakened silently.

## 7. Formal and practical assurance

- Tamarin model: add, message, remove, update with signature rotation and delayed reveal, Outfox routing, epoch-header consensus, recovery-kit rotation, 72-hour removal window.
- Vectors: the MLS working group's public vectors plus our own for every new wire format in `PROTOCOL.md`.
- Fuzzing: every decoder in `khensu-core`, `khensu-tatenan` and `khensu-chain`.
- External audits before launch: MLS and credentials, mixnet and Outfox extensions, chain and shielded pool, app.

## 8. Competitor facts used in comparisons

Each comparison claim in public material must cite a dated source here and be re-checked before launch.

| Claim | Source | Checked |
| --- | --- | --- |
| Signal ships Automatic Key Verification (key transparency) to all users in 2026; phone-number contacts only; up to 7-day split-view window | Signal blog and support pages | 9 Oct 2026 |
| Signal SPQR enforced for new registrations from 6 March 2026 | signal-cli maintainers' reports | 9 Oct 2026 |
| Signal identity signatures are classical (XEdDSA) | Signal protocol specifications | 9 Oct 2026 |
| Telegram cloud chats are not end-to-end encrypted by default | Telegram FAQ | To check before launch |
| Which signature scheme Signal's key transparency log uses | Signal specifications | To verify in milestone 1 |

## Changelog

- 0.1 (9 Oct 2026): first draft.
