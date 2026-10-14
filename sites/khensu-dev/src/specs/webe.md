# webË

Version 1.0, 11 Oct 2026. The basis for a family of Internet-Drafts.

webË is an internet run by the people on the khensu.nu node network: names without DNS, content without CDNs, websites, public feeds, forums and live media, all delivered over a post-quantum stealth network with no metered bandwidth. Nodes only relay, cache and count; encoding, encryption, ranking, moderation and rendering happen on devices. The khensu.nu app is the first webË application: primarily a messenger, with a Feed tab, public forums, site hosting and contracts.

Wire primitives, encodings and the mixnet are as in `PROTOCOL.md` (sections 1, 3, 8, 9); this document adds the webË layers. Stealth rules are in `PLAN.md` (Stealth) and `design/stealth-relay.md`.

## 1. Goals

1. **No central naming.** Names resolve from the key transparency log, never from DNS, registrars or certificate authorities.
2. **No central hosting.** Content is content-addressed, signed by its publisher, erasure-coded across operators and served by any node.
3. **Stealth access.** Nobody learns who published or who read what, even for public content.
4. **Speech stays up.** Nothing is removed from the network for being unpopular; the only network-level exception is the illegal-content hash list (`OPEN-QUESTIONS.md` 40).
5. **Runs itself.** Operators are paid by the protocol from work receipts; users never pay per byte.
6. **Post-quantum throughout.** ML-KEM-1024 and ML-DSA-87 only.

## 2. Layers

| Layer | What it does | Spec |
| --- | --- | --- |
| Transport | Outfox mixnet (stealth ticks), two-relay MOQ paths over padded trunks | `PROTOCOL.md` 7.1, 8 |
| Naming | `name.khensu.nu` resolved from the transparency log through PIR | 3 |
| Objects | Content-addressed chunks, manifests, signed roots | 4 |
| Fetch and publish | Two-relay stealth fetch, publish through ticks or the owner's node | 5, 6 |
| Applications | Sites, feeds, forums, live tracks | 7–10 |
| Clients | khensu.nu app viewer, Chromium extension and patch | 11 |
| Contracts | Private, self-enforcing agreements, proved with STARKs and settled in the shielded pool | 14 |
| Network work | Jobs nodes do for the network and for contracts, paid from work receipts | `WORK.md` |

## 3. Names

### 3.1 Form

A webË name is a khensu handle: `name.khensu.nu`, with optional subnames (`blog.name.khensu.nu`) controlled by the same identity. The label is any NFC string (3.6), so `Ægir.khensu.nu` and `ægir.khensu.nu` are different names. Names are permanent, non-tradeable and resolved only from the log. Content can also be addressed directly by hash (3.4).

### 3.2 Name record

The log (`PROTOCOL.md` 3, entry types) gains a webË record, signed by the identity key:

```
struct {
  opaque handle<V>;              // "name" or "blog.name"
  uint64 sequence;               // strictly increasing per handle
  opaque site_root[32];          // H256 of the current SiteManifest, or zero
  opaque feed_head[32];          // H256 of the newest FeedEntry, or zero
  opaque forum_roots<V>;         // H256 of ForumManifest records
  opaque track_namespace<V>;     // MOQ namespace for live tracks, or empty
  opaque publish_key[2592];      // ML-DSA-87 key that signs this name's content
  opaque signature<V>;           // Sign(identity key, "webe name", fields above)
} NameRecord;
```

`publish_key` lets the owner's devices sign content without using the identity key; rotating it is a new record.

### 3.3 Resolution

1. The client hashes the handle to its PIR shard (`OPEN-QUESTIONS.md` 3) and queries a mirror inside the stealth ticks.
2. The mirror returns the latest `NameRecord` with an inclusion proof against a witnessed checkpoint no older than 24 hours.
3. The client verifies the proof, the checkpoint cosignatures and the record signature, then caches the record for its validity (default 10 minutes for sites, 1 minute for feeds).

No resolver is trusted: a wrong answer fails the proof.

### 3.4 URLs

- `webe://name.khensu.nu/path?query`: a site path, resolved through the name record.
- `webe://h/<base32 hash>`: an immutable object or manifest.
- `https://name.khensu.nu/path`: the same resource for links shared outside webË. webË clients treat it as `webe://`; ordinary browsers reach an optional gateway (3.5).

### 3.5 Gateways (optional)

Operators may run gateways that serve public webË content to ordinary browsers over the public web, under `*.khensu.nu` DNS. Gateways are not stealthy (they see the reader's IP and request) and show a banner saying so. They are a bridge for reach, not part of webË. Whether to run any is `OPEN-QUESTIONS.md` 56.

The public host is a DNS name, so it follows the IDNA mapping. `Ægir` and `ægir` both encode as `xn--gir-xla`, and `Æ` and `æ` both encode as `xn--6ca`. The gateway has one host for each pair. The webË name keeps both.

### 3.6 Characters

Names, paths, queries and the text inside encrypted messages are Unicode scalar values, stored as UTF-8 and compared after NFC only. Case stays. There is no casefold and no compatibility fold.

Æ (U+00C6) and æ (U+00E6) are different values. The two-letter sequences AE and ae are two more values. Unicode 15 gives none of the four a decomposition. Each is 2 bytes in UTF-8 (`c3 86`, `c3 a6`, `41 45`, `61 65`). A folded letter plus a separate bit that recorded the difference would be at least 17 bits, so the distinct character is the smaller encoding. A combining mark that NFC composes becomes that one character (`é`). A mark that does not compose stays on the letter.

The space of strings grows with the alphabet. There are 1,112,064 scalar values (17 planes of 65,536, excluding the 2,048 surrogates), which is 20.08 bits a character and 11,706 times the 95 printable ASCII characters. A string of 13 such characters has 34 times as many values as the P-256 field prime

```
p = 2^256 - 2^224 + 2^192 + 2^96 - 1
```

the prime of secp256r1 in FIPS 186-4. Length 12 is 241 bits and is smaller than `p`. Printable ASCII passes `p` at length 39. Adding only Æ and æ to those 95 characters (97 symbols, 6.60 bits each) still passes `p` at length 39. The same 13-character string also exceeds the Curve25519 prime `2^255 - 19` (RFC 7748). This is the size of the name and of a passphrase someone types. The sealed packet stays ML-KEM-1024 and MLS.

Ciphertext and media samples stay raw bytes. A digit alphabet stored as UTF-8 holds less than 8 bits per stored byte. Ninety-five printable characters carry 6.57 bits in one byte. An alphabet of those 95 plus Æ and æ averages 1.02 bytes a symbol and 6.60 bits of value, about 81% of a raw byte, against 82% for the ASCII digits alone. A character is included as a packed digit only when that packing is smaller than the bytes. Æ and æ fail that test, so they are letters, and the samples stay bits. Emoji are scalar values, so a name, a link, a title and a password may use them. A typical emoji is 4 bytes and one of about 3,790 choices, about 11.9 bits in 32 bits stored. They fail the same test, so they stay letters too.

## 4. Objects

### 4.1 Chunks

Content is split into chunks of at most 64 KiB. A chunk's address is `H256(Label("webe chunk") || chunk)`. Files larger than one chunk are a tree of chunk lists:

```
struct {
  uint64 total_length;
  opaque chunk_addresses<V>;     // 32 bytes each, in order; or addresses of further lists
  uint8  depth;                  // 0 = leaves
} ChunkList;
```

### 4.2 Site manifest

```
struct {
  opaque handle<V>;
  uint64 version;
  opaque previous[32];           // previous manifest address, or zero
  struct {
    opaque path<V>;              // "/index.html"
    opaque content_type<V>;
    opaque root[32];             // ChunkList or chunk address
    uint64 length;
  } entries<V>;
  opaque policy<V>;              // headers: CSP, allowed APIs (11.3)
  uint64 published_at;
  opaque signature<V>;           // Sign(publish_key, "webe site", fields above)
} SiteManifest;
```

### 4.3 Storage

- Objects are erasure-coded (Reed–Solomon, 10 data plus 6 parity shards by default) across `channel_cache` nodes from at least 6 operators.
- The publisher's own node (if any) pins everything it published; caches keep popular objects by anonymous demand counts.
- Storage is bounded by anonymous publish quotas per persona per epoch (rate-limit proofs), raised by stake and reputation. Quota sizes are `OPEN-QUESTIONS.md` 57.
- Objects on the illegal-content hash list are refused by caches and by clients.

## 5. Fetch

### 5.1 Two-relay stealth fetch

1. The client picks an entry relay near itself and an exit relay (or cache) holding the object, from different operators, networks and jurisdictions.
2. It opens a WebTransport session to the entry relay (`PROTOCOL.md` 7.1 transport rules) and sends a `FetchRequest` encrypted to the exit relay's ML-KEM-1024 key:

```
struct {
  opaque kem_ciphertext[1568];   // to the exit relay
  opaque sealed_request<V>;      // AEAD: { address[32], range_start, range_end, response_key[32] }
} FetchRequest;
```

3. The entry relay forwards it over the padded trunk to the exit relay. The entry relay knows who, not what; the exit relay knows what, not who.
4. The exit relay returns the object encrypted under `response_key`, padded to the next size bucket (powers of two from 4 KiB), over the trunk and back through the entry relay.

### 5.2 Fetch through the ticks

Name resolution, feed heads and objects up to 8 KiB may instead ride the stealth ticks through the mixnet, which also hides timing from a global observer.

### 5.3 Caching and integrity

Every object is verified against its address before use; manifests are verified against the name record's `publish_key`. Clients cache verified objects locally, encrypted at rest.

## 6. Publish

- Small objects (posts, manifests, name records) ride the stealth ticks to caches and the log.
- Larger objects go through the owner's node stream or the charging window, never as a visible burst (`PLAN.md`, Stealth).
- A publish is complete when shards are confirmed by caches from at least 6 operators (signed store receipts as in `PROTOCOL.md` 6.7) and, for sites and feeds, the new `NameRecord` is in a witnessed checkpoint.

## 7. Sites

- A site is a `SiteManifest` plus its objects: static files and optional WebAssembly. There is no server-side code at launch (`OPEN-QUESTIONS.md` 50).
- The origin for browser security is the name (`webe://name.khensu.nu`). Sites can't fetch from the ordinary web or from other names unless their policy lists them; this blocks third-party tracking by construction.
- Sites can embed feeds, forums and live tracks by reference.

### 7.1 Link previews

A link shared into a chat, a feed or another site carries a preview. On the ordinary web a preview is one still image (`og:image`). On webË, and on the khensu.nu sites today, a preview is **media**: anything the receiving client can show, play or open, declared by the page in `nu:preview` meta tags next to the Open Graph ones, which stay as the fallback for every client that doesn't read `nu:preview`.

```html
<meta property="og:image" content="https://khensu.nu/og/buy.jpg" />
<meta property="og:image:alt" content="…" />
<meta property="nu:preview" content="https://khensu.nu/og/buy-square.mp4" />
<meta property="nu:preview:type" content="video/mp4; codecs=hvc1" />
<meta property="nu:preview:duration" content="4" />
<meta property="nu:preview:size" content="1080x1080" />
<meta property="nu:preview:bytes" content="3279733" />
<meta property="nu:preview:hash" content="sha-256=…" />
<meta property="nu:preview:effect" content="ripple" />
```

- **Kinds.** `nu:preview:type` is a media type. Clients show: still images (`image/*`, including animated GIF and animated AVIF/WebP), video (`video/mp4` with HEVC or H.264, `video/nu-media` once the decoder ships; muted, looping, autoplay, 10 s at most), audio (`audio/*`, with a play control and the still as artwork), documents (`application/pdf`, with the first page as the still), webË contracts (`application/nu-contract+cbor`, 14.3, shown as the contract's interface summary) and archives and installers (`application/zip`, `application/vnd.android.package-archive`, `application/x-apple-diskimage`). Several `nu:preview` tags may be given; a client takes the first one it can show.
- **Executable and archive warnings.** An `apk`, `dmg`, `pkg`, `exe`, `zip` or any type a client can't inspect is never auto-opened. The preview shows the type, the byte count, the hash and a warning in the client's own words ("This link installs software. Only continue if you trust the sender."), and the file is fetched only after a deliberate tap. A preview can't change the warning or its wording.
- **Fetch.** Preview media is fetched like any other object: on webË through the two-relay stealth fetch (5.1); on the ordinary web through the app's mixnet exit. Previews are capped at 8 MiB and 10 s unless the person taps to load more. `nu:preview:hash` must match or the preview is dropped and the `og:image` still is shown instead.
- **Rendering on Apple platforms.** The app renders previews in SwiftUI. Video previews are decoded by VideoToolbox (HEVC with alpha where present) or by the nu.media decoder on the Neural Engine, then drawn through a Metal layer so a page can ask for one of a small set of named effects in `nu:preview:effect`: `ripple` (a touch sends a ring across the video), `tilt` (parallax with the device), `glass` (the Liquid Glass material over the frame) and `none`. The effect is a hint; a client may ignore it, and reduced-motion settings always do.
- **Privacy.** Fetching a preview must not tell the page who looked: no cookies, no referrer, no per-person URL. Clients fetch previews through the mixnet, prefetch at most the first `nu:preview`, and strip `nu:preview:*` from pages they publish on a person's behalf unless the author set them.
- **The khensu.nu sites.** Every page on khensu.nu and dev.khensu.nu emits `og:image` (1200 × 630), `og:video` pointing at a direct landscape MP4 so Apple Messages autoplays the preview (TN3156; `design/indra.md`), the square still for Instagram-style link pages, and, where one exists, `nu:preview` with the HEVC square (`tools/og-anim.sh`, 4 s): Earth time-lapsed under the phone turning once, Indra's lattice over it, the card's words on top.

## 8. Feeds

The Feed tab in the khensu.nu app and the public square in `PLAN.md`.

```
struct {
  opaque author_publish_key[2592];
  uint64 sequence;
  opaque previous[32];           // previous FeedEntry address, or zero
  uint8  kind;                   // 1 post, 2 repost, 3 reply, 4 delete-request, 5 profile update
  opaque body<V>;                // text, nu-media references, links, quoted address
  opaque in_reply_to[32];        // or zero
  opaque topics<V>;              // hub tags
  uint64 created_at;
  opaque signature<V>;           // Sign(publish_key, "webe feed", fields above)
} FeedEntry;
```

- Each persona's feed is a hash chain; its head is in the persona's `NameRecord`, so following means watching one record.
- Live updates: a feed head change is also published as an object on the MOQ track `name.khensu.nu/feed`, delivered through two-relay paths, so timelines update in seconds.
- Timelines, replies and threads are assembled on the device. Ranking is the user's own (chronological by default, plus on-device models they choose).
- Likes, reposts and views are anonymous tallies (one rate-limit proof per person per entry), counted by nodes and published per entry per epoch.
- A delete-request entry asks caches to drop an earlier entry; copies already on other devices remain, and the app says so.

## 9. Forums

```
struct {
  opaque name<V>;                // forum name under the owner's handle
  opaque owner_publish_key[2592];
  opaque moderator_keys<V>;      // ML-DSA-87 keys
  opaque rules<V>;
  opaque label_list[32];         // the forum's own LabelList address
  opaque signature<V>;
} ForumManifest;
```

- Threads and posts are `FeedEntry` records with the forum's address in `topics`.
- Forum moderators publish a label list; readers' devices apply it by default when viewing the forum, and any reader can switch to the unfiltered view. Moderation shapes the forum's view; it never removes content from the network.
- Private forums are encrypted groups (up to 1,000 devices) or private channels.

## 10. Labels

```
struct {
  opaque target[32];             // entry or object address
  uint8  label;                  // 1 factual-with-sources, 2 opinion, 3 misleading, 4 fraud-or-scam, 5 spam,
                                 // 6 adult, 7 graphic-violence, 8 satire, 9 ai-generated
  opaque note<V>;                // reason and sources
  opaque proposer_publish_key[2592];
  opaque signature<V>;
} LabelProposal;
```

- Label lists are signed manifests of proposals, published by anyone; users subscribe to any number.
- Consensus labels: anonymous raters (one rating credential per person, `OPEN-QUESTIONS.md` 41) submit ratings as rate-limited proofs; a bridging algorithm shows a label only when raters who usually disagree agree. Ratings and the algorithm are public and deterministic, so every device computes the same result.

## 11. Clients

### 11.1 khensu.nu app

Feed tab, forums inside Feed, and a site viewer: a `WKWebView` with a `WKURLSchemeHandler` for `webe://`, which serves verified objects from the local daemon in `khensu-core`. iOS doesn't let apps intercept `https` in web views, so shared `https://name.khensu.nu` links are rewritten to `webe://` when opened in the app.

### 11.2 Chromium

- **Extension (first):** one WebExtensions codebase for Chrome, Edge, Firefox and Safari. It runs the webË client itself (`khensu-core` in WebAssembly over WebTransport; in Safari, the khensu.nu app through native messaging), so no local daemon or proxy is needed. It catches `https://*.khensu.nu` and `webe://` before they reach the network and shows sites in its own viewer until browsers let extensions serve `webe://` origins. Design and the upstream proposal in `design/browser.md`.
- **Patch (second):** a native webË network service, `webe://` as a standard secure scheme, and stealth defences: fixed window sizes, WebRTC off, restricted high-entropy APIs, no third-party requests.

### 11.3 Site policy

The manifest `policy` lists allowed APIs and other names a site may reference. Clients enforce a strict default: no network access outside webË, no WebRTC, no persistent cross-site storage.

## 12. Standards

Internet-Drafts:

1. Outfox with ML-KEM-1024: a post-quantum mix packet format (with the Outfox paper).
2. A stealth profile for MOQ: constant-rate media, padded trunks, two-relay paths.
3. Naming from a transparency log: `NameRecord`, resolution and proofs.
4. Signed content-addressed sites and feeds over MOQ.
5. Two-relay stealth fetch.

## 13. Security considerations

- **Global observer:** stealth ticks hide timing for small objects; two-relay fetches hide who fetched what from single relays, and padded trunks plus size buckets hide flows from link observers, but long-term volume correlation at the edges remains (THREAT-MODEL 5.2).
- **Scripts:** a site's code runs in the reader's browser; policy defaults and the Chromium patch limit fingerprinting, as in Tor Browser.
- **Names:** squatting is limited by registration rules in the log; impersonation by look-alike names is countered by safety numbers, verified badges from label lists and on-device warnings.
- **Storage abuse:** quotas, stake and the illegal-content list.
- **Cache poisoning:** impossible for content-addressed objects; manifests and name records are signed and logged.
- **Contracts:** see 14.10.

## 14. Contracts

A webË contract is an agreement between parties that enforces itself. Its code is public and signed; its inputs and state are private to the parties; each step is proved with a STARK and the chain stores only the proof and commitments. There is no global contract state, no public order book and nothing for a quantum computer to break later.

### 14.1 Code

Contract code is a WebAssembly module in the deterministic subset `webe-det-1`:

- No floating point, threads, SIMD with non-deterministic results, host clocks or host randomness.
- Imports only from the `khensu:contract/1` interface (14.3).
- At most 4 MiB, with fuel metering; a step that runs out of fuel fails and changes nothing.

```
struct {
  opaque wasm<V>;
  opaque abi<V>;                 // CBOR description of terms, actions and effects
  opaque author_sig_pk<V>;       // ML-DSA-87
  opaque signature<V>;           // Sign(author_sig_pk, "contract code", wasm || abi)
} ContractCode;

code_id = H256(Label("contract code") || wasm || abi)
```

Code is published like a site (section 6): content-addressed, erasure-coded and fetched with two-relay stealth fetch. Anyone can read it, run it and audit it before agreeing to it. A name record can point at a code_id, so `escrow.example.khensu.nu` always resolves to the same audited program.

### 14.2 Instances

An instance is one agreement between specific parties under one code_id.

```
struct {
  opaque code_id[32];
  opaque terms_commitment[32];   // Poseidon2 over the CBOR terms and a blinding factor
  opaque party_keys<V>;          // one fresh ML-DSA-87 key per party, per contract
  uint8  approval_policy;        // all(0), majority(1), arbiter(2), threshold(3), any(4)
  uint8  threshold;              // for threshold(3)
  uint64 deadline_epoch;         // after this, only timeout actions are valid
  opaque nonce[16];
} ContractOpen;

contract_id = H256(Label("contract") || ContractOpen)
```

Party keys are fresh for each contract and are never linked to an account, a handle or a device key. Parties agree on the terms inside an MLS group created for the contract (`PROTOCOL.md` 4), so every message between them travels over the mixnet.

### 14.3 Interface

```
init(terms, inputs) -> state
step(state, action, public: { epoch, contract_id }) -> (state', effects)
check(state, submission) -> bool            // optional, for work orders (14.6)
```

`action` is signed by the party keys the approval policy requires. `epoch` is the only external input the chain provides, so deadlines and time locks are deterministic. Effects are:

| Effect | Result |
| --- | --- |
| `pay(outputs)` | Shielded notes created from notes locked in the contract (`PROTOCOL.md` 13) |
| `refund` | Locked notes returned to their owners |
| `release(share)` | A key share or secret sent to a recipient mailbox |
| `publish(ref)` | A signed post to a feed or forum named in the terms (sections 8, 9) |
| `issue(credential)` | A blind-issued anonymous credential (`PROTOCOL.md` 11) |
| `admit(group)` | An MLS Add to a group the contract holds a commit key for |
| `count(tally)` | A tally added to an anonymous counter |
| `invoke(app, intent)` | A signed, encrypted intent delivered to another webË app or contract's mailbox, which acts on it under its own rules; the reply comes back as an action |
| `fetch(request)` | A request to the legacy internet, carried by a `gateway(14)` node (`WORK.md` 9a); the response returns with a signed transcript proof |
| `order(task)` | A compute task posted to `compute(15)` nodes (`WORK.md` 9b), such as a volunteer science work unit; the result returns with its validation receipt |
| `close` | The instance ends and its state is deleted at the next era close |

### 14.4 Proved steps

A step runs on the device of the party who submits it. The khensu zkVM executes the WebAssembly and produces a STARK (hash-based, so post-quantum) that `step` ran correctly from the committed state.

```
struct {
  opaque contract_id[32];
  uint32 era;
  opaque state_nullifier[32];    // Poseidon2(state_secret, contract_id, step_index)
  opaque new_state_commitment[32];
  opaque note_commitments<V>;    // outputs of pay or refund
  opaque note_nullifiers<V>;     // notes locked into the contract by this step
  opaque effects_commitment[32];
  opaque proof<V>;               // STARK over code_id, approvals and the transition
} ContractUpdate;
```

Updates go to committee ingress through the mixnet as kind 5, like spends. The committee checks the proof and that `state_nullifier` is new; a second update from the same state is rejected, so a contract can't fork. Aggregator nodes fold every update and spend in an epoch into one recursive proof (`WORK.md` 3), so a phone checks one small proof per epoch.

### 14.5 Settlement

Value moves only through the shielded pool. Locking a note into a contract spends it into a note owned by the contract's state; `pay` and `refund` create ordinary notes for the recipients. The chain sees nullifiers and commitments, never amounts, parties or terms.

### 14.6 Work orders

Any contract can commission work. A work order is a contract whose terms name what is wanted, how it is accepted and what it pays.

```
enum { requester(0), reviewer(1), test(2), receipt(3) } AcceptKind;
enum { notes(0), credential(1), reputation(2), admit(3), none(4) } RewardKind;

struct {
  opaque spec_ref[32];           // content address of the brief, encrypted to the parties
  AcceptKind accept;
  opaque reviewer_key<V>;        // for reviewer(1): a key both sides chose
  opaque test_entry<V>;          // for test(2): the exported check function
  uint16 receipt_type;           // for receipt(3): a WORK.md receipt type
  uint64 receipt_quantity;
  RewardKind reward;
  opaque reward_terms<V>;
  uint8  max_workers;            // 1 for a single job, more for bounties
} WorkOrder;
```

- **Work by people:** a translation, design, review or report is submitted as an encrypted object; the requester, the reviewer or the `check` function accepts it.
- **Work by nodes:** a node submits signed work receipts from `WORK.md`; the contract checks them against the epoch header's `receipts_root`. This is how a site owner pays for extra storage replicas or a creator pays for public media renditions.
- **Any task:** a contract can trigger another app on the network (`invoke`), call the legacy internet (`fetch`), or order background computing (`order`): for example donating spare node time to Einstein@Home's search for gravitational waves and pulsars, paid in reputation or notes when the project validates the result.
- **Any reward:** shielded notes, an anonymous credential, an anonymous reputation point, admission to a group, or nothing at all.

### 14.7 Ballots

A ballot contract counts votes without revealing who voted or how.

1. **Roll:** the organiser publishes a member tree root; each member holds one credential, issued blind, so the organiser can't link credentials to people.
2. **Seal:** a key is split 3-of-5 among nodes with role `deadman` (`PROTOCOL.md` 14.1). Each ballot is encrypted to it with ML-KEM-1024.
3. **Cast:** a member submits `{ nullifier = Poseidon2(member_secret, contract_id), sealed_ballot, STARK of membership }` over the mixnet. One nullifier, one ballot.
4. **Close:** at `deadline_epoch` the holders release their shares to the contract; a `step` decrypts every ballot inside the proof and outputs only the tally.

Nobody, including the organiser and the share holders, learns who voted or how any member voted. Ranked, weighted and quorum rules are ordinary contract code.

### 14.8 Standard contracts

Audited code published under `contracts.khensu.nu`:

| Contract | What it does |
| --- | --- |
| `ballot` | Anonymous votes and polls (14.7) |
| `work-order` | Commission work from people or nodes (14.6) |
| `escrow` | Milestones released by both sides or a chosen arbiter |
| `pledge` | Pays only if a threshold of hidden pledges is met by a deadline; refunds otherwise |
| `split` | Pays collaborators their shares from every payment a post, song or film earns |
| `ticket` | Anonymous, unlinkable tickets and memberships |
| `bounty` | Pays the first submission that passes the check |
| `timelock` | Opens a file, key or message on a date, or when the owner stops checking in |

### 14.9 Expiry

Contract state lives in the shielded pool's eras. An open contract refreshes into the next era during the grace period; a closed one is deleted with its era's tree. Nothing sits on the chain forever.

### 14.10 Security considerations

- **Inputs stay private:** proofs reveal only commitments and nullifiers. A contract that needs public state uses a feed or forum as its record, and says so in its ABI.
- **Bad code:** a contract does only what its code says, and the code is public. Wallets show the code_id, its author and any audit labels (section 10) before a party signs.
- **Liveness:** if a party disappears, the deadline lets any other party submit a timeout action.
- **Metadata:** party keys are fresh per contract, every message goes over the mixnet, and updates are mixed with spends at committee ingress.
- **Proof soundness:** STARKs rest on hash functions only; parameters target 128-bit post-quantum security.
