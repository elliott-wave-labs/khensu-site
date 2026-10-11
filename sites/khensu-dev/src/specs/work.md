---
title: 'Network work'
source: 'WORK.md'
---

# Network work

Version 1.0, 11 Oct 2026.

Nodes earn work receipts for more than relaying. This document specifies six jobs the network pays for, how each is proved, and how contracts commission them (`WEBE.md` 14.6). Every job touches only ciphertext or data its owner chose to publish; user data is never processed on a server.

Primitives, epochs, leases, receipts and the epoch header are as in `PROTOCOL.md` (sections 1, 2, 12). Payments use the shielded pool (`PROTOCOL.md` 13).

## 1. Jobs

| Job | Role | Works on | Proved by | Paid per |
| --- | --- | --- | --- | --- |
| Proof aggregation | `aggregator(9)` | Public proofs | The aggregate proof itself | Proof folded |
| Encrypted storage | `storage(10)` | Ciphertext shards | Storage challenges | Byte-day |
| Public media renditions | `render(11)` | Media published openly | Spot re-encodes and quality checks | Rendition-second |
| Private lookups | `pir(5)` | Encrypted queries | Answers checked against inclusion proofs | Query |
| Randomness and timestamps | `beacon(12)` | Hashes and shares | Threshold signatures | Round, stamp |
| Mesh and satellite bridging | `mesh(13)` | Sealed mix packets | Forwarding receipts from both sides | Packet |

Roles extend the `Role` enum in `PROTOCOL.md` 12.1. A node advertises them in its lease; each role has its own stake floor and hardware class (section 9).

## 2. Receipts and payout

Every job produces a receipt that lands in the epoch's `receipts_root`.

```
struct {
  uint64 network_epoch;
  uint16 receipt_type;           // section numbers below: 3 aggregation, 4 storage, 5 render, 6 lookup, 7 beacon, 8 mesh
  opaque node_id[32];
  uint64 quantity;               // in the job's unit
  opaque evidence_ref[32];       // content address of the evidence object
  opaque countersigs<V>;         // auditors, peers or the aggregate proof, per job
  opaque signature<V>;           // Sign(node key, "work receipt", fields above)
} WorkReceipt;
```

- **Network pay:** each epoch, the protocol pays every role from the reward pool in proportion to verified quantity, weighted by the role's rate in the rule set. Rates change only through governance (`PROTOCOL.md` 12).
- **Contract pay:** a work order (`WEBE.md` 14.6) can pay extra for a specific job, checked against `receipts_root`. Contract pay goes to the node's operator address as shielded notes.
- **Penalties:** a failed challenge or a forged receipt is `Evidence`; the node loses the epoch's pay for that role and part of its stake.
- Receipts carry only aggregate counts per epoch, never per-user or per-object data, except where the owner of public content asked for it in a work order.

## 3. Proof aggregation

Every spend (`PROTOCOL.md` 13) and contract update (`WEBE.md` 14.4) carries a STARK. Aggregators fold an epoch's proofs into one recursive STARK, so a phone verifies one small proof per epoch instead of thousands.

```
struct {
  uint64 network_epoch;
  opaque inputs_root[64];        // Merkle root over the proofs folded, in ingress order
  uint32 count;
  opaque aggregate<V>;           // recursive STARK: every proof under inputs_root verifies
} AggregateProof;
```

- Folding is a tree: leaf aggregators fold batches of up to 256 proofs, and parents fold the results. Any node with the role can take a batch; the first valid aggregate for a batch is paid.
- The committee checks the root aggregate before signing the epoch header and records its hash there. Light clients verify the root aggregate and the header signatures, nothing else.
- Inputs are public proofs, so aggregation learns nothing about payments or contracts.
- Hardware: Apple silicon Mac, a recent x86 desktop or better; at least 16 GB of memory.

## 4. Encrypted storage

Sites, media, backups and the network archive (`PROTOCOL.md` 12.6) are stored as erasure-coded ciphertext shards.

- **Coding:** objects are split into 4 MiB chunks (`WEBE.md` 4.1) and Reed–Solomon coded 10-of-16, so any 10 shards rebuild a chunk. Placement spreads shards across operators, networks and countries by the lease's declared region.
- **Classes:** standard (16 shards), durable (24 shards, two coding groups) and archive (32 shards, three regions minimum). The network archive is always archive class.
- **Challenges:** each epoch, auditors drawn by lottery send random challenges `{ shard_id, offset, nonce }`; the node answers with the bytes' hash and a Merkle path to the shard root. Answers must arrive within 10 seconds.
- **Repair:** when a shard's holder fails two challenges or leaves, the network re-codes the shard from any 10 others onto a new node and pays the repair as storage.
- **Receipt:** `quantity` is byte-days held and proved, countersigned by the auditors.
- Nodes hold only ciphertext; keys stay with the owners and readers. Deletion requests from owners are honoured at the next epoch; content-addressed objects can't be altered.

## 5. Public media renditions

Creators who publish openly can have their media encoded into every ñü-media rendition by the network, so a post plays at the right size on every device.

- **Scope:** only media whose owner published it as public content in a feed, forum or site, and only on the owner's request in a work order. Private media is always encoded on the sender's device and never reaches a render node.
- **Job:** the node fetches the published source by content address, encodes the requested ñü-media ladder (`design/nu-media.md`), and publishes each rendition as a signed object linked from a rendition manifest that the owner countersigns.
- **Checks:** a random 2% of renditions are re-encoded by a second node and compared, and every rendition's VMAF against the source must meet the ladder's floor. A rendition that fails is `Evidence`.
- **Receipt:** `quantity` is rendition-seconds, countersigned by the owner's acceptance.
- Hardware: Apple silicon Mac (media engine) or a desktop with a hardware encoder.

## 6. Private lookups

Names, keys, KeyPackages and directories are answered with private information retrieval (`PROTOCOL.md` 9), so a node answers a query without learning what was asked.

- **Job:** a PIR node holds the current database for its assigned shards, refreshes it every epoch from the log, publishes the client hint, and answers queries that arrive over the mixnet.
- **Checks:** clients verify every answer against log inclusion proofs; auditors send known-answer queries indistinguishable from real ones. A wrong answer is `Evidence`.
- **Receipt:** `quantity` is queries answered, counted per epoch and countersigned by the auditors' known-answer results.
- Hardware: at least 8 GB of memory per database shard.

## 7. Randomness and timestamps

### 7.1 Beacon

A threshold randomness beacon for committee lotteries, raffles, ballots and fair ordering.

```
struct {
  uint64 round;                  // one round per network epoch
  opaque prev[64];
  opaque value[64];              // H512 over the combined shares
  opaque shares<V>;              // at least 14 of 21 beacon members' signatures over (round, prev)
} BeaconRound;
```

- Beacon members are drawn by lottery each era. Each round, members sign `(round, prev)` with ML-DSA-87 and publish a commitment one round ahead; the value is the hash of the revealed shares, combined in member order. Withholding a revealed commitment is `Evidence`.
- Contracts read the beacon value of a named future round as an input, so nobody can know or bias it in advance.

### 7.2 Timestamps

Post-quantum timestamps prove that a hash existed at a given time.

- A client submits a hash over the mixnet. Beacon members batch submissions into a Merkle tree per epoch and sign the root together with the epoch's beacon value.
- A stamp is `{ hash, merkle_path, epoch, root_signature }`. It verifies with ML-DSA-87 and hash functions only.
- Stamps are used for creator provenance (`design/nu-provenance.md`), contract evidence and anything a person wants to prove existed.

**Receipt:** `quantity` is rounds signed or stamps batched.

## 8. Mesh and satellite bridging

Nodes and suñůlink.shield units carry mixnet traffic between places with no internet and the rest of the network.

- **Mesh:** shields and nodes reach each other over Wi-Fi HaLow (802.11ah) and Bluetooth LE. Packets are the same fixed-size sealed mix packets as everywhere else, so a mesh hop learns nothing a mix hop wouldn't.
- **Gateways:** a mesh node with internet, or with a satellite link, forwards mesh traffic into the mixnet and back. Satellite links carry the same padded trunks as any other uplink.
- **Store and forward:** when a mesh island has no gateway, packets wait on shields and nodes until one appears, up to the packet's lifetime.
- **Receipt:** `quantity` is packets carried, with `ForwardingReceipt`s (`PROTOCOL.md` 12.4) countersigned by the peer on each side.

## 9. Running work

Operators turn jobs on per node. The node terminal:

```
~node work                       # roles, earnings and challenges for this epoch
~node work enable storage --gb 500 --class durable
~node work enable render
~node work enable aggregator
~node work disable render
~node work orders                # contract work orders this node can take
~node work take <order-id>
```

| Role | Stake floor | Minimum hardware |
| --- | --- | --- |
| aggregator | 1,000 | Apple silicon Mac or recent desktop, 16 GB memory |
| storage | 100 per TB | Disk with at least 99% monthly availability |
| render | 500 | Apple silicon Mac or hardware encoder |
| pir | 500 | 8 GB memory per shard |
| beacon | 2,000 | Always-on lease for the whole era |
| mesh | 50 | suñůlink.shield, Raspberry Pi 5 with a HaLow radio, or any node with a satellite link |

Stake floors are in network tokens and change only through governance.

## 10. Commissioning work from contracts

A work order names a receipt type and quantity (`WEBE.md` 14.6). Examples:

- A site owner pays for archive-class storage of their site for a year: `receipt_type = 4`, `quantity` in byte-days, reward in notes.
- A creator pays for public renditions of a film: `receipt_type = 5`, rendition-seconds.
- A raffle or ballot names a future beacon round: `receipt_type = 7`.
- A community pays gateways to keep its mesh connected: `receipt_type = 8`, packets carried for its mesh region.

The contract checks the receipts against `receipts_root` inside its proof, so payment and evidence settle together without the requester learning which node did the work.

## 11. Security considerations

- **No user data:** every job is defined over ciphertext, public proofs or content its owner published openly. A role that would need plaintext user data can't be added by governance (`PROTOCOL.md` 12).
- **Sybil:** stake floors, lease history and lottery-drawn auditors make it expensive to fake capacity or collude on checks.
- **Lazy storage:** challenges are random, frequent and time-bound, and outsourcing a shard costs more than holding it.
- **Biased randomness:** commitments one round ahead and threshold reveals stop any minority below 8 of 21 from biasing a beacon value.
- **Mesh metadata:** mesh hops see only sealed fixed-size packets on a constant schedule; radio presence is visible to anyone nearby, as with any radio.
