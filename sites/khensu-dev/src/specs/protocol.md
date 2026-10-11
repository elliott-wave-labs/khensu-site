---
title: 'Protocol specification'
source: 'PROTOCOL.md'
---

# khensu.ñü protocol

Status: draft 0.1, 9 October 2026. Frozen together with `THREAT-MODEL.md` before product code starts. Structures use the TLS presentation language (RFC 8446 §3) as MLS does: integers are big-endian, `opaque x<V>` is a variable-length vector with a QUIC-style varint length prefix (RFC 9000 §16), `opaque x[N]` is fixed length.

Every structure here gets test vectors in `khensu-core/vectors/` and a fuzz target before the freeze. Values marked **TBD-spike** are fixed by measurement in the feasibility spike, then frozen.

## 1. Primitives

| Name | Algorithm | Sizes (bytes) |
| --- | --- | --- |
| `KEM` | ML-KEM-1024 (FIPS 203) | ek 1,568; ct 1,568; ss 32 |
| `SIG` | ML-DSA-87 (FIPS 204), pure mode, empty context unless stated | pk 2,592; sig 4,627 |
| `AEAD` | AES-256-GCM | key 32; nonce 12; tag 16 |
| `H` | SHA-512 | 64 |
| `H256` | SHA-512/256 | 32 |
| `KDF` | HKDF-SHA-512 | |
| `XOF` | SHAKE256 | |
| `WBC` | Wide-block cipher for mix payloads: Lioness instantiated with AES-256-CTR and HMAC-SHA-512 (**TBD-spike**: AEZ or a vetted alternative if faster on Cortex-A76) | |
| `STARK` | Hash-based STARK (Poseidon2 over a 64-bit prime field for in-circuit hashing, SHA-512 for transcripts; **TBD-spike** for the exact system) | |
| `PIR` | Lattice single-server PIR (SimplePIR or YPIR family, **TBD-spike**) | |

`Label(x)` means the ASCII string `"khensu v1 " || x`. Every KDF, hash and signature uses a distinct label (domain separation).

```
struct { opaque label<V>; opaque content<V>; } SignContent;
Sign(sk, label, content)   = SIG.Sign(sk, SignContent{ Label(label), content })
Verify(pk, label, content, sig)
```

## 2. Time

- `network_epoch`: `floor((unix_time - GENESIS_TIME) / 3600)`, a `uint64`. One hour.
- Clocks may be off by up to 120 s; nodes accept packets for the current and previous epoch.
- `era`: a shielded-pool era, 720 network epochs (30 days).

## 3. Identity

### 3.1 Address

```
address = SHA3-256( Label("address") || inception_event_bytes )   // 32 bytes
```

Shown as bech32m with HRP `khensu` (`khensu1...`). The inception event (3.3) contains the first identity key set and the commitment to the next (recovery) key, so the address is unique by construction.

### 3.2 Keys

| Key | Where | Algorithm | Rotates |
| --- | --- | --- | --- |
| Identity device key | Secure Enclave, one per identity device, non-exportable | SIG | When the device is removed |
| Recovery key | Derived from the 24-word recovery phrase, never stored on a phone | SIG | On use (pre-rotation) |
| MLS signature key | Keychain, one per device per group (`ThisDeviceOnly`) | SIG | Every update commit; erased on rotation |
| Device HPKE key (MLS leaf) | Keychain | KEM | Every update commit |
| KeyPackage init keys | Keychain, one-time | KEM | Single use, plus one last-resort |
| Local store key | Wrapped by Secure Enclave | AES-256 | Panic wipe only |

Recovery phrase derivation:

```
seed = PBKDF2-HMAC-SHA-512(phrase, "khensu v1 recovery" || address_hint, 2^20)   // 64 bytes
recovery_sk      = SIG.KeyGen(KDF.Expand(seed, Label("recovery key"), 32))
backup_key       = KDF.Expand(seed, Label("backup key"), 32)
wallet_seed      = KDF.Expand(seed, Label("wallet seed"), 64)
```

`address_hint` is empty at inception (the address doesn't exist yet) and the phrase is generated with 256 bits of entropy, so the salt isn't needed for uniqueness.

### 3.3 Key transparency log entries

The log is a C2SP `tlog-checkpoint` Merkle log. Each leaf is one `LogEntry`. Checkpoints are cosigned (`tlog-cosignature`) by the transparency-dev and Sigsum witness networks; clients require a quorum (**3 of the 5** witnesses pinned in the app).

```
enum {
  inception(1), add_identity_device(2), remove_identity_device(3),
  recover(4), bind_device_key(5), revoke_device_key(6),
  claim_handle(7), link_wallet(8), unlink_wallet(9), tombstone(10),
  cancel_removal(11), release_hash(12), (255)
} EntryType;

struct {
  opaque identity_keys<V>;        // SIG public keys, concatenated, 1..8 of them
  opaque next_key_commitment[64]; // H(Label("next key") || recovery_pk)
} Inception;

struct {
  EntryType type;
  opaque    address[32];          // zero for inception (computed from it)
  uint64    sequence;             // per account, starts at 0
  opaque    prev_entry_hash[64];  // H of this account's previous entry, zero at 0
  uint64    network_epoch;
  select (type) {
    case inception:              Inception;
    case add_identity_device:    opaque new_identity_key<V>;
    case remove_identity_device: opaque removed_identity_key<V>;
                                 uint64 effective_epoch;     // +72 unless signed by recovery
    case recover:                opaque revealed_recovery_pk<V>;
                                 opaque new_identity_keys<V>;
                                 opaque new_next_key_commitment[64];
    case bind_device_key:        uint16 device_index;
                                 opaque mls_signature_pk<V>;
                                 uint64 not_after_epoch;
    case revoke_device_key:      uint16 device_index;
    case claim_handle:           opaque handle_commitment[64];  // see 3.5
    case link_wallet:            opaque siwe_message<V>; opaque wallet_signature<V>;
    case unlink_wallet:          opaque wallet_address<V>;
    case tombstone:              struct {};
    case cancel_removal:         opaque removal_entry_hash[64];
    case release_hash:           opaque artifact<V>; opaque sha512[64];  // app/node releases
  };
  uint16 signer_index;            // index into current identity key set, or 0xFFFF = recovery key
  opaque signature<V>;            // Sign(signer, "log entry", all fields above)
} LogEntry;
```

Rules enforced by the log and re-checked by every client:
- `sequence` and `prev_entry_hash` form a hash chain per account; forks are rejected.
- `remove_identity_device` signed by an identity key takes effect at `effective_epoch = network_epoch + 72`; any other identity device may post `cancel_removal` before then. Signed by the recovery key it takes effect immediately.
- `recover` must reveal a key whose hash matches the current `next_key_commitment`, replaces the identity key set, revokes every device key, and sets a new commitment.
- `bind_device_key` lifetime is at most 90 days; devices re-bind before expiry.
- After `tombstone`, nothing else is accepted for that address, and its handle is retired.

### 3.4 khensu MLS credential

MLS credential type `0xF0B0` (private use):

```
struct {
  opaque address[32];
  uint16 device_index;
  uint64 log_index;          // leaf index of the bind_device_key entry
} KhensuCredential;
```

The credential carries no keys. Members fetch the referenced entry (via PIR, section 9) and check: the entry's `mls_signature_pk` equals the leaf's signature key; its signer is in the account's identity key set at that log position; inclusion proof against a checkpoint with a witness quorum; not revoked; `not_after_epoch` not passed. Basic credentials are rejected.

### 3.5 Handles

```
handle_norm       = NFKC-casefold(handle), [a-z0-9_]{3,32}
handle_commitment = H(Label("handle") || handle_norm || address)
handle_index      = H256(Label("handle index") || handle_norm)
```

The log stores the commitment; the PIR database is keyed by `handle_index` and returns `(address, log_index, commitment opening)`. A handle can stop being served (disputes) without rewriting the log; it is never reassigned.

### 3.6 Safety number

```
safety_number(account) = first 30 decimal digits of
    H(Label("safety number") || sorted(identity_keys) || address)
```

Shown as six groups of five digits plus a QR code; the four-word check phrase is the first 44 bits of the same hash mapped through a 2,048-word list.

## 4. MLS profile

- Cipher suite: `MLS_256_MLKEM1024_AES256GCM_SHA512_MLDSA87` (codepoint per draft-ietf-mls-pq-ciphersuites; private-use `0xF0C0` if the draft changes).
- Credentials: `KhensuCredential` only.
- Groups: at most 1,000 leaves. Wire format `mls_private_message` only for application data; handshake messages as `PrivateMessage` too, except external commits.
- Extensions: `required_capabilities` lists `0xF0B0` and the khensu extensions below. `ratchet_tree` is never sent in Welcome; the tree is fetched by content address (6.5).
- Update policy: every member commits with a full path at least every 5 minutes or 1,000 sent messages, and immediately after any add or remove it didn't make.
- Skipped keys: at most 1,000 generations per sender, kept at most 7 days. Messages from up to 3 earlier epochs accepted within 7 days.
- Padding: `PrivateMessage` content padded so that the full fragment set fills a bucket (5.3).
- Commit size: a full-path commit is about 20 KB in a filled tree but up to about N × 1.6 KB right after bulk adds (813 KB measured at 1,000 devices, `spikes/mls-suite.md`). Commits larger than bucket 8 go on the bulk lane as chunks (6.4) with a small notification message. Groups above 100 devices add at most 50 members per commit, and the committer sends a full-path update after each batch.

### 4.1 Signature key rotation and delayed reveal

Each update commit carries a new leaf signature key. The previous private key is moved to a "retired" slot and:
1. Used for nothing further; signing with it is a bug that aborts.
2. After `retired_at + 7 days`, its private key is sent to the group in a `KeyReveal` application message (5.2) and erased locally.
3. Receivers store revealed keys only to mark old transcripts as non-attributable; they reject any message signed by a key whose reveal window has started.

This behaviour is gated behind a group extension `khensu_delayed_reveal` (`0xF0B1`) so it can be switched off if the formal analysis fails.

### 4.2 Exporter labels

| Label | Length | Use |
| --- | --- | --- |
| `"khensu mailbox"` | 32 | Mailbox seed (6.1) |
| `"khensu typing"` | 32 | Typing and receipt key |
| `"khensu sframe"` | 32 | Call SFrame base key |
| `"khensu attachment index"` | 32 | Attachment chunk addressing salt |
| `"khensu channel"` | 32 | Channel key wrap |

## 5. Application content

### 5.1 Content

```
enum {
  text(1), attachment(2), reaction(3), edit(4), delete(5), reply(6),
  poll(7), poll_vote(8), read_receipt(9), key_reveal(10), payment(11),
  call_invite(12), deadman_setup(13), channel_post(14), profile(15),
  group_meta(16), disappearing_timer(17), (65535)
} ContentType;

struct {
  ContentType type;
  opaque      message_id[16];      // random
  uint64      sent_at_ms;          // sender clock
  uint32      expires_after_s;     // 0 = never
  opaque      body<V>;             // type-specific, defined in the content registry
} KhensuContent;
```

The `KhensuContent` is the MLS `application_data`. MLS framing adds the sender's leaf index, generation, and the ML-DSA-87 signature, all inside the AEAD.

### 5.2 Key reveal

```
struct { uint32 leaf_index; uint64 retired_epoch; opaque retired_sk<V>; } KeyReveal;
```

### 5.3 Fragmentation into small packets

A serialized `PrivateMessage` is split into fragments that each fit one small payload (8.3):

```
struct {
  opaque msg_ref[16];     // random per message, not the message_id
  uint8  index;           // 0-based
  uint8  count;           // bucket size: 3, 4, 6 or 8
  opaque data<V>;         // zero-padded to the fixed fragment size
} Fragment;
```

- Fragment data size: `SMALL_PAYLOAD - 24 = 2,024` bytes.
- Bucket capacity: 3 → 6,072 B, 4 → 8,096 B, 6 → 12,144 B, 8 → 16,192 B. A `PrivateMessage` with ML-DSA-87 signature, MLS framing (~300 B) and up to ~1,100 B of content fits bucket 3.
- Larger content goes as an attachment (bulk lane) referenced from a small message.
- Fragments are sent in place of cover packets; the recipient reassembles by `msg_ref` and discards incomplete sets after 7 days.

### 5.4 Typing and receipts

Typing events and delivery receipts are not MLS messages:

```
struct { uint8 state; /* 0 stop, 1 typing */ uint16 sender_leaf; uint64 sent_at_s; } TypingEvent;
key   = MLS-Exporter("khensu typing", group_context, 32)
nonce = random 12
ct    = AEAD(key, nonce, TypingEvent || zero padding to 64 bytes, aad = group_id_hash)
```

Unsigned by design (one packet, ephemeral). Read receipts are MLS messages (`read_receipt`) and therefore signed.

## 6. Delivery

### 6.1 Mailbox IDs

For each group a device belongs to:

```
seed(group_epoch)        = MLS-Exporter("khensu mailbox", group_context, 32)
mailbox_id(leaf, n_epoch) = H256(Label("mailbox") || seed || uint32(leaf) || uint64(n_epoch))
```

A device watches the mailbox for the current and previous group epoch, for the current and previous network epoch (four IDs per group). Senders address the recipient's leaf. First contact uses an intro mailbox:

```
intro_mailbox(kp_ref, n_epoch) = H256(Label("intro") || kp_ref || uint64(n_epoch))
```

where `kp_ref` is the MLS `KeyPackageRef` of the claimed KeyPackage.

### 6.2 Mailbox operations

Carried as the final-hop payload of a mix packet (8.4) or a SURB reply:

```
enum { store(1), fetch(2), ack(3), register_wake(4), tree_put(5), tree_get(6), (255) } MailboxOp;

struct {
  MailboxOp op;
  opaque    mailbox_id[32];
  select (op) {
    case store:         opaque sealed<V>; opaque surb<V>;       // Fragment or bulk chunk; StoreReceipt via SURB (6.7)
    case fetch:         uint32 max_items; opaque surbs<V>;      // replies go via SURBs
    case ack:           opaque item_ids<V>;                     // H256 of items to delete
    case register_wake: opaque wake_capability<V>;              // 10.1
    case tree_put:      opaque chunk<V>;                        // 6.5
    case tree_get:      opaque chunk_hash[32]; opaque surb<V>;
  };
  opaque    access_token<V>;   // anonymous credential spend (11.1), not linked to the account
} MailboxRequest;
```

Each item is replicated to three replicas chosen by rendezvous hashing of `mailbox_id` over the epoch's mailbox nodes, constrained to distinct operators and networks. Retention: 30 days (Free) or 90 days (Plus), determined by the token tier, not by identity (under review: OPEN-QUESTIONS 9 proposes keeping items until acknowledged).

`item_id = H256(Label("item") || sealed)`. A `store` whose `item_id` is already held is a no-op that returns the same `StoreReceipt`, so retries never create duplicates.

### 6.3 Sequencer

The sequencer for a group is chosen by rendezvous hashing of `group_id_hash = H256(Label("group") || group_id)` over the epoch's sequencer-eligible nodes; the second-ranked node is the standby.

```
struct {
  opaque group_id_hash[32];
  uint64 group_epoch;          // the epoch the commit moves FROM
  opaque commit_hash[64];      // H of the PrivateMessage carrying the commit
  uint64 network_epoch;
  opaque sequencer_node_id[32];
  opaque signature<V>;         // Sign(node_key, "sequencer receipt", fields above)
} SequencerReceipt;
```

First valid commit for `(group_id_hash, group_epoch)` wins. Two receipts with the same `(group_id_hash, group_epoch)` and different `commit_hash` are `Equivocation` evidence (12.3). At each network epoch boundary the outgoing sequencer hands the standby the latest receipt per group it served.

### 6.4 Attachments

```
file_key   = random 32
chunk_i    = AEAD(KDF(file_key, Label("chunk") || uint32(i)), zero_nonce, plaintext_i padded to 64 KiB)
chunk_addr = H256(Label("chunk addr") || salt || chunk_i)   // salt from exporter label
```

The small message carries `(file_key, chunk_count, chunk_addrs, size, mime, blurhash)`.

### 6.5 Ratchet tree delivery

The serialized `ratchet_tree` is split into 64 KiB chunks, each stored by `tree_put` under `H256(chunk)`, replicated as in 6.2. The Welcome carries a `TreeManifest { opaque tree_hash[64]; opaque chunk_hashes<V>; }` extension (`0xF0B2`). The joiner fetches with `tree_get` and checks the MLS tree hash.

### 6.6 Offline use

The phone is the durable home of every conversation. History, drafts, the outbox and the memory index live in the encrypted local store, so reading, searching and composing work with no network. Nothing needs a node to display.

### 6.7 Reliable delivery

Delivery is at-least-once on the wire and exactly-once in the app, through durable queues on both ends and idempotent operations everywhere.

**Outbox (sender).**
- Pressing send writes the `KhensuContent` (with its random `message_id`) to the outbox in the same local transaction that shows it in the chat as **Queued**. It survives app kill, reboot and days offline.
- When the network is available, the message is encrypted for the group's current epoch, fragmented, and its fragments enter the cover-traffic stream. The encrypted `PrivateMessage` and its fragments are saved with the outbox entry before the first send, so every retry resends identical bytes (same `item_id`, deduplicated by mailboxes).
- Each fragment's `store` carries a SURB; a replica answers with:

```
struct {
  opaque item_id[32];
  uint64 network_epoch;
  opaque replica_node_id[32];
  opaque signature<V>;          // Sign(node_key, "store receipt", fields above)
} StoreReceipt;
```

**States shown to the user.**

| State | Meaning |
| --- | --- |
| Queued | In the outbox, not yet sent (offline, or waiting for a cover slot) |
| Sending | Fragments in flight |
| Sent | Every fragment confirmed by at least 2 of its 3 replicas (`StoreReceipt`) |
| Delivered | A delivery receipt from at least one of each recipient's devices |
| Read | A read receipt, if both sides have read receipts on |
| Failed | Not sent after the retry deadline, or impossible (removed from the group, account tombstoned); tap to retry or delete |

Delivery receipts are MLS messages like read receipts. They can't be turned off, because they drive retries, but they are batched (one per conversation per fetch) and carry no timing beyond the batch.

**Retries.**
- A fragment without 2 receipts is resent after an exponential backoff with jitter (2 s, 4 s, 8 s ... capped at 10 minutes), always inside cover slots, so retries don't change the traffic pattern.
- When the network epoch changes, unsent fragments are re-addressed to the new `mailbox_id` with the same bytes.
- If the group epoch moves past the 3-epoch acceptance window (4) before the message is sent, the content is re-encrypted in the new epoch with the same `message_id`.
- Messages that are Sent but not Delivered after 24 hours are resent once from the outbox (receivers drop the duplicate).
- The retry deadline is 7 days, matching the receivers' skipped-key window; then the message is Failed and stays in the chat for a manual retry.

**Inbox (receiver).**
- Fetch (6.2) returns items until they are acknowledged. The device processes an item and, in one local transaction, stores the plaintext, advances the MLS state (OpenMLS storage lives in the same SQLite database) and records the `item_id`. Only after that transaction commits does it send `ack`. A crash at any point replays the item on the next fetch; nothing is lost, because a message key is never deleted before its plaintext is durable.
- Duplicates are dropped by `(group_id, sender_leaf, message_id)`, kept for 30 days, and by `item_id`.
- Messages are shown in sender-timestamp order; MLS generation numbers per sender reveal gaps, and a gap older than 7 days is marked "message not received".

**Durable stream replay.**
- Mailboxes keep each item until every addressed device acknowledges it (no fixed cut-off, OPEN-QUESTIONS 9); a device that was offline for months replays everything waiting for it, in order, on reconnect.
- Your own sent messages reach your other devices the same way, because they are members of the same groups.
- A new device gets older history from the phone-to-phone transfer or the encrypted backup, then continues from the live mailbox stream.
- Commits are idempotent at the sequencer: resubmitting the same commit returns the same `SequencerReceipt`. A commit that loses to another for the same epoch is rebased: the client processes the winner, then re-proposes its change.
- Every other write is idempotent by construction: `tree_put` and attachment chunks by content address, payments by nullifier, log entries by `(address, sequence)`, rate-limit proofs by nullifier.

**Offline transport.** With no internet, the Wi-Fi Aware nearby mode carries sealed fragments between phones; receipts and acks follow the same rules when they reach a mailbox.

## 7. Calls

- SFrame (RFC 9605) with AES-256-GCM-SHA-512; per-sender base keys from `MLS-Exporter("khensu sframe", group_context || uint32(leaf), 32)`.
- Two relays: caller's entry and callee's entry, from different operators (7.1).
- Group calls (more than 2 participants) send `FrameManifest` on a data track:

```
struct {
  uint32 sender_leaf;
  uint64 first_frame_counter;
  uint32 frame_count;
  opaque tags_hash[64];        // H over the SFrame authentication tags, in order
  opaque signature<V>;         // Sign(leaf sig key, "frame manifest", fields above)
} FrameManifest;
```

Interval: 1 s with video, 5 s audio-only. A failed or missing manifest after 2 intervals mutes that sender and shows a warning.

### 7.1 Stealth call profile

Every call uses this profile; there is no other.

**Setup.** Offer, ringing, accept, decline, hangup, SFrame epoch changes and relay choice are `KhensuContent` messages that ride the normal ticks through the mixnet. No call signalling touches a relay. Relays are paid with anonymous access tokens (11).

**Relay choice.** Each side picks its own entry relay from the epoch's node list: low round-trip time from itself, lease covering the epoch, and a different operator, autonomous system and jurisdiction from the other side's relay (announced in the accept). The two relays connect over a trunk. A relay never learns both endpoints' IPs.

**Transport.** WebTransport over HTTP/3, UDP port 443, ALPN `h3` only. No MOQ-specific ALPN is offered on the wire; the MOQT version is negotiated inside the WebTransport session. Every connection to a node (relays, mix entries, caches, trunks) uses khensu camouflage (`design/camouflage.md`): the outer QUIC and TLS 1.3 handshake matches the current Safari (Apple devices) or Chrome (everything else) profile from the epoch header, with the browsers' X25519MLKEM768 key exchange, the node's ordinary hostname as SNI and an ordinary WebPKI certificate. Inside it, an `InnerHello` with ML-KEM-1024 to the node's directory key, channel-bound to the outer TLS exporter, and an `InnerAccept` signed with the node's ML-DSA-87 key authenticate the node; all khensu traffic is sealed again under the inner keys. A wrong knock gets the node's ordinary website.

**Constant-rate media.** Each media track sends fixed-size objects at a fixed rate for the whole call, whatever is happening:

| Track | Object size on the wire | Rate | Encoder |
| --- | --- | --- | --- |
| Audio | 160 B | 50 per second (20 ms frames) | Opus CBR, 32 kbit/s, DTX off |
| Video, tier L | 1,200 B | 60 per second | constant rate, about 500 kbit/s |
| Video, tier M | 1,200 B | 160 per second | constant rate, about 1.5 Mbit/s |
| Video, tier H | 1,200 B | 400 per second | constant rate, about 3.8 Mbit/s |

- The encoder targets slightly below the tier rate. Its output is split into fixed objects; a frame that doesn't fill its share is padded, and empty slots carry padding objects. Padding sits inside the SFrame ciphertext, so relays can't tell padding from media.
- Video uses periodic intra refresh instead of keyframes, so there are no size bursts. Keyframe requests are answered by a faster intra-refresh sweep at the same rate.
- Audio-only calls still send the audio track and no video track; camera off in a video call keeps the video track at its tier with padding.
- Tier changes for bandwidth happen at most once every 30 s with hysteresis and only between adjacent tiers. A tier change is visible to the local network; it reveals network conditions, not content.

**Edge blurring.** Each phone opens its relay stream and starts constant-rate padding a uniformly random 2–8 s before it expects media (after sending accept, or on ringing), and keeps padding a uniformly random 2–8 s after hangup.

**Relay rotation.** During every call, room and live stream, each participant (host, co-host, member or viewer) switches its edge relay at its own random times: intervals drawn independently on the device from an exponential distribution with mean 4 minutes, at least 60 s apart, never coordinated with other participants. The switch is make-before-break: the new edge session opens and carries constant-rate padded media about 2 s before the old one stops, and the old one then continues as padding for a uniformly random 2–8 s. The new edge relay announces itself to the far side over the trunks, never over the participant's link. Each new relay follows the relay-choice rules above and is not reused within the session. Rotation parameters are consensus parameters.

**Trunks.** Relays exchange constant-rate padded traffic between themselves on long-lived WebTransport sessions, sized to their capacity class and independent of load, carrying all calls between them multiplexed. Trunk traffic is fixed-size objects at a fixed rate; when calls end, padding replaces them.

**No direct internet paths.** Clients never connect to each other over the internet. Direct media is allowed only over Wi-Fi Aware or when both devices are on the same Wi-Fi network (discovered over the mixnet-delivered call setup, never by broadcast), still using this profile.

**Group calls.** Relays act as MOQ forwarders: each participant publishes to its own entry relay, relays forward between themselves over trunks, and each participant subscribes through its own entry relay. Every participant's tracks follow the constant-rate rules above.

**Latency target.** Under 150 ms glass to glass within a region, including the two relays.

## 8. Mix packets (Outfox, extended)

### 8.1 Route

Five hops: entry node, mix layer 1, mix layer 2, mix layer 3, destination (mailbox, sequencer, PIR mirror, channel cache or committee ingress). Hops are chosen per packet from the current epoch's node list, one per layer, distinct operators and networks, weighted by reputation, capped per operator.

### 8.2 Header

Per hop:

```
struct {
  opaque kem_ct[1568];      // KEM.Encaps(node_mix_ek[epoch])
  opaque routing[72];       // AEAD-encrypted RoutingInfo (56 B) + tag (16 B)
} HopHeader;                // 1,640 bytes

struct {
  opaque next_node_id[32];
  uint32 delay_ms;          // Poisson-sampled by the sender, mean 250 ms per mix
  uint8  flags;             // bit0: final hop; bit1: loop/measurement (never set on the wire, see 8.6)
  uint8  lane;              // 0 small, 1 bulk
  opaque reserved[18];
} RoutingInfo;              // 56 bytes
```

Header = 5 × 1,640 = 8,200 bytes. Each node decapsulates its own `HopHeader`, derives `(routing_key, payload_key, replay_tag)` from the shared secret with KDF and labels `"hop routing"`, `"hop payload"`, `"hop replay"`, decrypts its routing info, strips its header, appends 1,640 bytes of pseudo-random padding derived from the shared secret (so the header length is constant), and applies `WBC` decryption to the payload.

Mix keys `node_mix_ek[epoch]` are published in the node list for each epoch and deleted by the node after the epoch ends plus 1 epoch of grace.

### 8.3 Sizes

| Lane | Header | Payload | Total |
| --- | --- | --- | --- |
| Small | 8,200 | 2,048 (`SMALL_PAYLOAD`) | 10,248 |
| Bulk | 8,200 | 65,536 | 73,736 |

### 8.4 Final payload

```
struct {
  uint8  kind;              // 1 mailbox, 2 sequencer, 3 pir, 4 channel, 5 committee, 6 cover
  opaque body<V>;           // MailboxRequest, commit submission, PIR query, ...
} FinalPayload;             // zero-padded to the lane payload size
```

Cover packets use `kind = 6` and are dropped at the destination.

### 8.5 Replay protection

`replay_tag = KDF(ss, Label("hop replay"), 16)`. Each node keeps a Bloom filter of tags for the current and previous epoch only (keys rotate per epoch, so older packets can't decapsulate). Sizing for a Pi 5 at 2,000 packets/s: 7.2 M tags/epoch, false-positive rate 10⁻⁶ → about 25 MB per epoch filter.

### 8.6 Loop and measurement packets

Loop packets route back to their sender. On the wire they are byte-identical to user packets: flags bit1 is only set inside the final payload, which only the sender can read. Measurers record round-trip success per path and sign `MeasurementReport { epoch, measurer_id, node_id, sent, returned, signature }`.

### 8.7 SURBs

```
struct {
  opaque first_hop_node_id[32];
  opaque header[8200];      // built by the recipient for the return path
  opaque payload_key_ref[16];
} SURB;
```

The recipient keeps the per-hop payload keys indexed by `payload_key_ref`, valid for the current and next network epoch. Mailbox fetch replies, PIR responses and channel fetches use SURBs.

### 8.8 Ticks and cover

- **Phones (app in foreground):** one burst every 2 s on every network and in every power state, with no exceptions. A burst is 4 small packets: one mailbox `fetch` plus 3 slots for outgoing fragments, receipts, typing events, PIR queries and ñü.media, filled with cover packets when empty. Tick times have a small uniform jitter (±100 ms) so bursts don't align across phones. The downstream carries 4 reply packets per tick, padded with cover replies. No cover in the background.
- **Nodes:** constant node-to-node cover and loop packets around the clock, at a rate set per capacity class in the epoch header, independent of real load.
- **Bulk packets** travel only inside constant streams: a user's own node, the Wi-Fi-and-charging window on phones, and call trunks. Phones send no bulk packets outside those.
- Tick length, burst size and node cover rates are consensus parameters in the epoch header.
- **On khensu hardware** a guard chip enforces these rules below the operating system: fixed frame sizes, frames per tick, guard-generated jitter, entry-node destinations from the epoch header, and parameter changes only with a committee signature threshold, within firmware bounds (tick 1–2 s, no battery or temperature dependence). See `design/guard.md`.

## 9. Directory lookups (PIR)

Several operators run PIR mirrors of the log state. Databases:

| Database | Key | Record |
| --- | --- | --- |
| Handles | `handle_index` | `address`, `log_index` of `claim_handle`, opening |
| Accounts | `address` | Current identity key set, device key entries, latest checkpoint index |
| KeyPackages | `address || device_index` | Up to 8 one-time KeyPackages plus one last resort, rotated by the owner |

Records are padded to a fixed size per database (**TBD-spike**, target 16 KiB for accounts). The client fetches the PIR hint per database once per day (bulk lane), sends queries through the mixnet (kind 3), gets answers via SURB, and verifies inclusion proofs against a witnessed checkpoint. KeyPackage claims are made by a separate anonymous `claim` request to the mirror that deletes the one-time package; the last resort is never deleted.

## 10. Push

### 10.1 Wake capability

```
struct {
  opaque apns_token<V>;
  uint64 not_after_epoch;   // capability rotates every epoch
  opaque nonce[16];
} WakeCapabilityPlain;

wake_capability = KEM.Encaps(gateway_ek) -> (ct, ss);
                  AEAD(KDF(ss, Label("wake")), zero_nonce, WakeCapabilityPlain)
```

The gateway delays each wake by a uniform 0–20 s, merges wakes for the same token within that window, and sends a fixed alert: `{"aps":{"alert":{"title":"khensu.nu","body":"New message"},"mutable-content":1}}`.

## 11. Anonymous credentials and rate limits

### 11.1 Access tokens

Nodes charge anonymous tokens for storage and mixing at the destination. Tokens are blind-signed by the issuer after a subscription purchase or a burn, using a post-quantum blind signature (**TBD-spike**: lattice blind signature or a STARK-based anonymous credential; the STARK route is preferred because it shares the payments stack). A spent token reveals only its tier and epoch.

### 11.2 First-contact rate limits (RLN-style)

Enrolment: after an App Attest check, the issuer adds `id_commitment = Poseidon2(id_secret)` to the member tree (depth 32). The issuer never learns `id_secret`.

Each first-contact message carries:

```
struct {
  opaque member_root[32];      // a recent root, accepted for 24 epochs
  uint64 network_epoch;
  uint16 slot;                 // 1..N, N = 20 per epoch
  opaque nullifier[32];        // Poseidon2(id_secret, epoch, slot)
  opaque share_x[32];          // H256(message)
  opaque share_y[32];          // a0 + a1 * share_x, a0 = id_secret, a1 = Poseidon2(id_secret, epoch, slot, 1)
  opaque proof<V>;             // STARK: membership, correct nullifier and share
} RateLimitProof;
```

The intro mailbox nodes keep nullifiers per epoch. Two different `share_x` with the same nullifier reveal `id_secret`, whose commitment is then removed from the member tree by the issuer (evidence posted on chain).

## 12. Nodes and consensus

### 12.1 Node identity and lease

```
enum { mix(0), mailbox(1), sequencer(2), relay(3), committee(4), pir(5), bridge(6), channel_cache(7), deadman(8) } Role;
enum { always_on(1), scheduled(2), n_hours(3), idle_time(4) } LeaseMode;

struct {
  opaque node_id[32];            // H256(Label("node") || node_sig_pk)
  opaque node_sig_pk<V>;
  opaque mix_eks<V>;             // KEM keys for the lease's epochs (or a commitment for long leases)
  uint16 roles;                  // bitmask of Role
  LeaseMode mode;
  uint64 start_epoch;
  uint64 end_epoch;
  opaque schedule<V>;            // for scheduled: weekly bitmap of 168 hours
  opaque operator_address[32];   // khensu account receiving rewards
  opaque stake_ref[32];          // staking position on chain
  opaque endpoints<V>;           // QUIC addresses; empty for bridges (distributed separately)
  opaque signature<V>;           // Sign(node_sig_pk, "lease", fields above)
} Lease;
```

Role eligibility: committee, relay, sequencer and mix require the lease to cover the whole epoch; mailbox and cover accept any mode. Overlapping conflicting leases from one `node_id` are evidence.

### 12.2 Epoch header

```
struct {
  uint32 chain_id;
  uint64 network_epoch;
  opaque prev_header_hash[64];
  opaque node_list_root[64];     // Merkle root over Lease entries active this epoch
  opaque state_root[64];         // balances, stakes, current shielded eras
  opaque receipts_root[64];      // work receipts for this epoch
  opaque evidence_root[64];      // misbehaviour evidence
  opaque rules_hash[64];         // current rule set
  opaque committee_root[64];     // the 21 members and their sortition proofs
  opaque founder_cosig<V>;       // during launch stages, else empty
  struct { uint8 member_index; opaque signature<V>; } signatures<V>;  // at least 14 of 21
} EpochHeader;
```

Signatures are over all fields before `signatures`, label `"epoch header"`. Light clients keep the latest header and the committee root, and check the next header's signatures (14 ML-DSA-87 verifications, ~65 KB of signatures).

### 12.3 Evidence

```
enum { equivocation(1), conflicting_lease(2), failed_measurement(3), double_vote(4), (255) } EvidenceType;
struct { EvidenceType type; opaque proof<V>; } Evidence;
```

### 12.4 Work receipts

Per epoch, for each ordered pair of nodes that exchanged traffic:

```
struct {
  uint64 network_epoch;
  opaque from_node[32];
  opaque to_node[32];
  uint64 small_packets;
  uint64 bulk_packets;
  opaque signature<V>;          // Sign(to_node key, "forwarding receipt", fields above)
} ForwardingReceipt;
```

Storage receipts (`StorageReceipt { epoch, node, byte_hours, replicas_checked, signature }`) are countersigned by randomly assigned auditors who challenge stored items. Receipts carry only aggregate counts per epoch, never per-packet data. The unlinkable-receipt extension in the Outfox paper may replace pairwise counts later.

### 12.5 Founder succession

The founder holds some powers the committee doesn't: a co-signature on rule changes, a veto on new operators, and the key that signs releases. A dead-man's switch makes sure those powers can never be lost with the founder.

In short:

1. Every change is archived automatically. Every code push, private or public, every release and every network upgrade goes into the archive on the network within one epoch (12.6).
2. Every week the founder checks in. The founder signs a `FounderCheckIn` on chain, confirming that the archive and the sealed private code escrow cover everything up to now.
3. After 42 days without a check-in, the switch fires. Six missed weeks, or a signed handover, and it fires by itself.
4. The trusted committee nodes get access. The 21 nodes of that epoch's committee jointly hold the keys to the sealed escrow and to release signing. Any 14 of them open it.
5. Then everyone gets it. The full archive, private and patented code included, is sent to the press, to the founder's list of friends, to every node on the network, and posted publicly on Wikimedia and the Internet Archive (12.7).

```
struct {
  uint64 network_epoch;
  opaque archive_root[64];       // the archive root the founder attests to
  opaque escrow_root[64];        // Merkle root of the sealed private code escrow (12.7)
  opaque signature<V>;           // founder threshold key, label "founder check-in"
} FounderCheckIn;

struct {
  uint64 network_epoch;
  opaque signature<V>;           // founder threshold key, label "founder handover"
} FounderHandover;
```

- **Weekly check-in.** The founder posts a `FounderCheckIn` at least every 168 network epochs (7 days). A check-in is valid only if `archive_root` and `escrow_root` cover every repository head and release archived up to the previous epoch.
- **Firing.** The switch fires at the first epoch where 1,008 network epochs (42 days) have passed since the last valid check-in, or at the epoch after a valid `FounderHandover`. Committee members record the firing in the epoch header's `rules_hash` transition; no signature is needed to fire it.
- **Founder powers end.** From that epoch `founder_cosig` is always empty; rule changes need only 2/3 of the committee with the 30-day timelock and veto; the admission veto ends; and the founder key is removed from the pinned key set in the next app and node releases.
- **Committee takes over releases.** Release signing passes to a 14-of-21 threshold ML-DSA-87 key held by the epoch's committee and re-shared every epoch. A release is valid only if its reproducible build hash matches an entry under the archive root.
- **Escrow opens.** At the same epoch the committee opens the private code escrow and releases everything to the recipients in 12.7.
- **One way.** No rule change, including one signed by the founder key, can restore a founder role; such a change is invalid by definition and its signers produce `Evidence`.

### 12.6 Archive

Everything needed to rebuild and run the network lives on the network itself:

| Archived | Contents |
| --- | --- |
| Code | Every repository, public and private (private ones sealed, 12.7): all branches, tags and history, as git packfiles |
| Specs | Every version of the specifications and design documents |
| Releases | Every signed node, app and firmware release, with its reproducible build recipe and toolchain hashes |
| Upgrades | Every rule set and network upgrade, with the votes that adopted it |
| Chain | Every epoch header, rule set, lease, receipt root and evidence item since genesis |
| Nodes | The node list and lease history for every epoch |

**Archived automatically, on every change.** Nobody has to remember to archive. CI archives every push to every repository, every tag, every release build and every adopted upgrade within one epoch of it happening; private objects are sealed first (12.7). A release or upgrade whose objects aren't in the archive is invalid, so nodes and apps refuse to install it. The weekly check-in then attests to the archive as it stands.

Archive objects are content-addressed and erasure-coded like webË objects (`WEBE.md` 4) and stored by storage nodes (`WORK.md` 4) at the highest replication class. The archive root is a Merkle root over the archive manifest, published under `archive.khensu.nu` and committed in every epoch header as part of `rules_hash`. Anyone can fetch the archive over the mixnet, rebuild every past release, check it against the logged hashes and replay the chain from genesis.

### 12.7 Private code escrow and release

Nothing stays private past the switch, patented code included. Every private repository, unreleased branch, patented algorithm and its reference implementation, model weights, build recipe and the patent filings themselves are archived now, sealed, and released to everyone when the switch fires.

- **Sealed.** Each private object is encrypted with AES-256-GCM under a fresh key, and that key is encrypted with ML-KEM-1024 to the committee's escrow key: a 14-of-21 threshold key held by the trusted committee nodes and re-shared every epoch, like the release key. Sealed objects are stored and erasure-coded like any archive object.
- **Kept current.** Every push to a private repository is sealed and archived within one epoch (12.6). Every `FounderCheckIn` carries `escrow_root`, a Merkle root over the sealed objects and the private repository heads they contain; a check-in whose `escrow_root` doesn't cover the current heads is invalid, so the founder can't keep checking in while holding code back.
- **Opened by the committee.** At the epoch the switch fires, each committee node publishes its decryption share. Any 14 shares open every sealed object, and the plaintext joins the public archive under `archive.khensu.nu`.
- **Released to everyone.** Within the same epoch the committee nodes send the opened archive, with a signed notice that the switch fired, to every recipient below. Each delivery is a `gateway` job (`WORK.md` 9a) whose TLS transcript proof goes on chain, so anyone can check it happened.

| Recipient | How it arrives |
| --- | --- |
| Every node on the network | Already holds the archive; the opened objects replicate like any archive object |
| The founder's list of friends | Each person on the list, sealed in the escrow with their khensu.ñü handle, gets the archive and the notice by message over the mixnet |
| The press | The notice, the archive root and a download link go to The Wall Street Journal and Forbes, plus any outlet added to the list, through their published tip lines |
| Wikimedia | The archive and notice are uploaded to Wikimedia Commons under the open licences below |
| Internet Archive | The archive is uploaded to archive.org as a public item, with the notice and every release |

  The recipient list is part of the escrow, so the founder can update it at any check-in but can't remove the release itself. Uploads that fail are retried every epoch until each recipient's proof is on chain.
- **Licensed.** On opening, code that was private is licensed AGPL-3.0, or Apache-2.0 where it belongs to `khensu-core`, and Elliott Wave LLC grants everyone an irrevocable, worldwide, royalty-free licence under every patent and patent application it holds to make, use, sell and modify any implementation. The grant is signed now, sealed in the escrow, and takes effect at the switch.
- **Never early.** Publishing a decryption share before the switch fires is `Evidence`, and a share alone opens nothing.

## 13. Shielded payments (specified in full in `PAYMENTS.md`, ñü.wallet)

- Notes in fixed denominations (1-2-5 series); note commitment `Poseidon2(asset_id, value, owner_pk_hash, rho, era)`.
- Spend: nullifier `Poseidon2(nk, rho, era)`, new commitments, STARK proof of membership in the era tree and value conservation.
- Note secrets travel to the recipient as an MLS `payment` content message; spends go to committee ingress through the mixnet (kind 5).
- Era refresh within the grace period moves notes to the next era; after the era closes its tree and nullifiers are deleted.

## 14. New features (outlines, each frozen in its own spec before code)

### 14.1 Dead-man's switch

```
struct {
  opaque switch_id[16];
  uint32 period_epochs;
  opaque check_in_pk<V>;         // fresh SIG key for check-ins, not linked to the account
  opaque share<V>;               // one Shamir share (3-of-5) of the message key, encrypted to this holder
  opaque recipient_mailboxes<V>; // sealed delivery targets
  opaque ciphertext_ref[32];     // content address of the encrypted message
} DeadmanShare;

struct { opaque switch_id[16]; uint64 network_epoch; opaque signature<V>; } CheckIn;
```

Holders (nodes with role `deadman`) release their share to the recipient mailboxes when no `CheckIn` has arrived for `period_epochs`. A `Cancel` signed by `check_in_pk` deletes the shares.

### 14.2 Bridges

A bridge is a node with role `bridge` whose `endpoints` are empty in the public list. Bridge descriptors (`BridgeLine { node_id, endpoint, fingerprint }`) are handed out a few at a time through invite links (inside the URL fragment) and through a rate-limited request using an `RateLimitProof`.

### 14.3 Channels

Posts are `KhensuContent` of type `channel_post`, encrypted under the channel key, stored by content address on `channel_cache` nodes, and fetched with SURBs or PIR over the channel's post index. Public channels publish the channel key in their profile; private channels distribute it through an MLS group of subscribers that only the owner's devices commit to. Subscriber counts are anonymous tallies (one rate-limited proof per subscriber per day).

### 14.4 Hidden profiles

Local only, no wire format: the store is a fixed-size container (default 2 GiB, grows in 2 GiB steps for all profiles at once) filled with random data at creation; each profile's pages sit at positions derived from its own key. Each profile has its own credentials, wake capabilities and cover traffic.

### 14.5 Node earnings for subscriptions

The node app burns tokens to the issuer's credential-minting address with a blinded request; the issuer returns blind-signed access credentials of the matching tier. The burn is public; the credentials can't be linked to it.

## 15. Registries

| Registry | Range | Allocated |
| --- | --- | --- |
| MLS credential types | 0xF0B0 | KhensuCredential |
| MLS extensions | 0xF0B1–0xF0BF | delayed reveal, tree manifest |
| Content types | 1–17 | Section 5.1 |
| Mix final kinds | 1–6 | Section 8.4 |
| Log entry types | 1–12 | Section 3.3 |

## Changelog

- 0.1 (9 Oct 2026): first draft.
