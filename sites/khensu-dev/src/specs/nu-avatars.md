---
title: 'ñü.ævätåřş'
source: 'design/nu-avatars.md'
---

# ñü.ævätåřş (nu.avatars): on-device style filters for calls, streams and AR

**Product name:** ñü.ævätåřş (code / host / nav: `nu.avatars`, `avatars`, `avatars.khensu.nu`, page `/avatars`).  
**Status: shipped 15 October 2026** — host `avatars.khensu.nu` (own certificate).

Public spec: [dev.khensu.nu/specs/nu-avatars](https://dev.khensu.nu/specs/nu-avatars/) · product: [avatars.khensu.nu](https://avatars.khensu.nu).

Shown as **ñü.ævätåřş** in headings, titles, labels and the footer; header nav and running text keep `nu.avatars`. Addresses: `nu:avatars.khensu.nu`.

## 1. The thing we want

**Live style filters and streaming avatars that never leave the device**, packed by nu.media so the wire stays tiny, carried on nu.network so calls and rooms stay private, and thin enough that AR glasses and visionOS can wear the same face.

Cloud stylers (Devut.ai, Live Styler and kin) send your camera to a GPU farm, then stream the cartoon back. That works. It also means a server sees every frame. We do the same styles — ink, toon, pixel, glass — on your Neural Engine and GPU, then send only the stylized base layer (or a landmark + style pack). Fewer bits. More control. No face on anyone else’s disk.

## 2. How it is better than the cloud path

| | Cloud style filter (Devut / Live Styler class) | nu.avatars |
| --- | --- | --- |
| Where the style runs | SaaS GPU | On device (browser demo today; Neural Engine / Metal in the app) |
| What crosses the network | Full stylized video to a CDN, or raw camera to the farm | Encrypted nu.media base layer over the mixnet / call relays |
| Bit budget | Ordinary H.264 / HEVC of a busy cartoon | Stylized frames are flat colour + edges → pack smaller; style id is bytes |
| Identity | Login to the styler | No account on a style server; face never uploaded |
| AR wearables | Separate SDK / cloud session | Same packed stream or mesh+style to the glasses |

The win is not “more filters.” It is **ownership of the face path** plus **bits we already budget for** in `design/nu-media.md` and the call tiers in `PROTOCOL.md`.

## 3. Wire shapes

Three modes, smallest first:

1. **Style pack only.** A style id, optional LUT / palette (≤ 2 KiB), plus face landmarks each tick. The receiver paints the avatar. Best for AR and low tiers.
2. **Stylized base layer.** Camera → on-device style → nu.media half-res base (hardware HEVC) → mixnet / call. Receiver rebuilds as usual. Flat toon/ink packs tighter than photographic HEVC at the same VMAF-to-style.
3. **Full fidelity + local style.** Unstyled nu.media on the wire; each peer (or wearable) applies the style locally. Same bits as a normal call; style is a preference, not a stream.

Call tiers stay L / M / H from `design/nu-media.md` §2. Style pack mode aims under the L video budget (500 kbit/s) with headroom for Opus. The product page meter shows a live estimate from the canvas demo; those figures are **examples** until §8 benches them on device.

## 4. Styles (v1)

| Id | Look | Notes |
| --- | --- | --- |
| `ink` | Line art over flat fills | Sobel / difference-of-gaussians edges; anime-adjacent |
| `toon` | Posterized colour, soft cells | Quantize + bilateral-ish blur |
| `pixel` | Block avatar | Integer downsample, nearest up |
| `glass` | Soft Liquid Glass wash | Blur + light chroma; stock chrome language |
| `mesh` | Landmark wire | `FaceDetector` when the browser has it; falls back to ink |

Custom brand packs (Live Styler’s pitch) are a later contract: a signed style object in nu.void, applied on device, never re-uploaded.

## 5. AR wearables

The same packed stream unlocks glasses and visionOS:

- **Mesh + style pack** → local render on the wearable (lowest bits, lowest heat).
- **Stylized base** → decode with the nu.media path already on phone / Mac, composite in the headset.
- Depth from `design/nu-media.md` §7.4 (when present) seats the avatar in the room without a cloud depth service.

Nothing in the AR path requires a style SaaS.

## 6. Privacy and safety

- Camera frames stay on device unless the user is already in a call or room that sends media.
- Style models and LUTs are local assets (or sealed objects the user chose).
- No Siri, Private Cloud Compute, or Writing Tools in the styler path (`AGENTS.md`).
- Generated / stylized output can carry the same “generated detail” flag as nu.moments when the look invents structure the camera did not have.

## 7. What ships today

| Surface | What it does |
| --- | --- |
| [avatars.khensu.nu](https://avatars.khensu.nu) | Product page + live browser studio (`AvatarStudio`): getUserMedia, five styles, bit estimate |
| Header nav | `nu.avatars` (page chrome: ñü.ævätåřş) |
| Spec | This file on [dev.khensu.nu/specs/nu-avatars](https://dev.khensu.nu/specs/nu-avatars/) |
| App / Neural Engine packs | Next: Core ML style nets + call integration in `khensu-apple` |

Present tense for the page and studio. App integration language stays honest: the site demo is the shipped v1; phone packs follow the same wire shapes.

## 8. Patent assessment

| Art | Gap vs nu.avatars |
| --- | --- |
| Devut.ai, Live Styler, Snap / TikTok / Instagram live filters | Cloud or closed on-device beauty stacks; not mixnet + nu.media constant-rate packing |
| Apple ARKit / Persona, Meta Codec Avatars | Full face models; different product; not our style-pack + half-res base over stealth ticks |
| Face pixelation / cartoon shaders in OBS, Snap Camera | Local yes; no private network budget, no wearable pack contract |

**Likely novelty (narrow):** style-pack and stylized-base modes sized to stealth ticks and call tiers, with the same object usable on phone and AR wearable, face never sent to a style vendor. Most shaders are anticipated. Do **not** say patent pending on the page. Full assessment before any claim language; row in `PATENTS.md`.

## 9. Related

- `design/nu-media.md` — base layer, call tiers, depth
- `design/nu-moments.md` — generated-detail flag
- `PROTOCOL.md` — mixnet slots, call relays
- Live Styler / Devut class: cloud real-time style filters we replace with on-device + smaller bits
