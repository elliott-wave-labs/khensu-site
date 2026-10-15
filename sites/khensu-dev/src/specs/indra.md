---
title: 'îňðřæ.ōġ'
source: 'design/indra.md'
---

# îňðřæ.ōġ (nu.indra.og): the network card that moves in Messages

**Product name:** îňðřæ.ōġ (code / host / nav: `nu.indra.og`, `indra`, `indra.og.khensu.nu`, page `/indra`). Shown as **îňðřæ.ōġ** in headings, titles, labels and the footer; header nav stays `nu.indra.og`.  
**Status: shipped on khensu.ñü, 12–13 October 2026; product page and header live 15 October 2026; host `indra.og.khensu.nu` live 15 October 2026.**

The white lattice over Earth in the link-preview cards is Indra's Net (`design/lore.md` 2): every jewel reflects every other. The same net pulses behind every hero on the site (`Net.astro`). The living card also climbs the seven chakras — Root through Crown — with each symbol's line paths drawing in, then morphing into the next, while the matching tone sounds on the product page. This doc is the product we want people to feel when they share a link — and a patent assessment of what is actually new.

Public spec: [dev.khensu.nu/specs/indra](https://dev.khensu.nu/specs/indra/) · product: [indra.og.khensu.nu](https://indra.og.khensu.nu) (`/indra` on the apex redirects via product host).

## 1. The thing we want

**A short, direct MP4 shipped beside every `og:image`, composed as nu.indra.og** — Earth time-lapsing, Indra's lattice alive, chakra symbols morphing Root → Crown with their tones on the product page, suñůlink.shield turning once, the words of the page on top — so that when someone pastes a khėnsu.ñü URL into Messages the bubble itself is the network, looping muted, without opening the site.

That is the product. Not a private Messages API. Not a sticker pack. The gift made visible in the warmest referral moment there is: one person texting the link to another.

## 2. How you get it in Messages (Apple platforms)

No special app, no stickers, no `LPLinkMetadata` code on our side. Messages already does this when the page is honest about video — on **iOS, iPadOS, macOS and visionOS**.

1. Paste a khėnsu.ñü URL that emits video previews — today home, buy, shield, **create** (`create.khensu.nu`), **waves** (`waves.khensu.nu`), and **nu.indra.og** (`indra.og.khensu.nu`).
2. Wait a second. The card should **autoplay muted and loop**.
3. If you still see a still: Messages caches hard. New thread, or `https://khensu.nu/?v=2`, or remove the old bubble and paste again. The receiver downloads the MP4 on their own connection.

What every such page emits (live today):

```html
<meta property="og:image" content="https://khensu.nu/og/home.jpg" />
<meta property="og:video" content="https://khensu.nu/og/home.mp4" />
<meta property="og:video:type" content="video/mp4" />
<meta property="og:video:width" content="1200" />
<meta property="og:video:height" content="630" />
```

`og:image` is the still fallback for every client that ignores video. `og:video` must be a **direct, downloadable** MP4, HTTPS — not HLS, not a YouTube/Vimeo page. We ship **H.264 (`avc1`)** for the landscape `og:video` so Apple Messages, Android, and most unfurlers can decode it; the square `nu:preview` stays **HEVC (`hvc1`)** for webË and Apple quality.

Apple documents the behaviour in:

| Spec | Date | Link |
| --- | --- | --- |
| [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages) | 2023 (Apple Technote) | Link Presentation downloads a direct media file and can play it inline |
| [Tech Talk 205 — Ensuring Beautiful Rich Links](https://developer.apple.com/videos/play/tech-talks/205/) | **21 December 2017** | Tim Horton (Safari / WebKit): `og:title`, icon, `og:image`, then **`og:video` → small downloadable file** autoplays muted in Messages |

| Client | What you get today | Why |
| --- | --- | --- |
| Apple Messages (iOS, iPadOS, macOS, visionOS) | Mute-looping landscape MP4 (`og:video`, H.264), or a “Video” chrome + tap depending on Low Data / Reduce Motion | TN3156 + Tech Talk 205 (21 Dec 2017): **direct downloadable MP4** autoplays. Not a private API. |
| Google Messages / most Android SMS·RCS | Still (`og:image`) for ordinary sites | Does **not** implement Apple’s direct-`og:video` path for arbitrary HTTPS pages. Our H.264 file is ready when they adopt the contract in `proposals/draft-staffer-link-preview-media-00.md`. |
| Slack (DMs and channels) | Still thumbnail only | Allowlisted providers for inline video; arbitrary `og:video` ignored. |
| Instagram DMs / TikTok DMs | Still | No public direct-`og:video` mute-loop for arbitrary HTTPS sites today. |
| Discord / some Telegram clients | Often plays direct `og:video` | Closest peers to Messages. |

**You cannot meta-tag Slack, Instagram, TikTok or Google Messages into Apple’s behaviour.** Tags are already correct on waves/create/home/indra. The gap is client policy. The fix is the IETF draft `proposals/draft-staffer-link-preview-media-00.md` (mute-loop + hash + no allowlist) — **read it before submitting**; do not post to the Datatracker until Elliott says go.

## 3. Why it feels impossible (and why that helps)

| What people try | What Messages does |
| --- | --- |
| Animated GIF / APNG / animated WebP in `og:image` | **First frame** only |
| `og:video` → YouTube / Vimeo / an HTML player | Tap-to-play or nothing |
| `og:video` → HLS (`.m3u8`) | Needs a tap |
| `og:video` → direct MP4 | **Downloads and loops muted** — nu.indra.og |

### 3.1 Is the Messages motion preview “new”?

**The capability is not secret or brand-new.** Apple documented direct-MP4 rich previews in [TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages) and [Tech Talk 205 (21 December 2017)](https://developer.apple.com/videos/play/tech-talks/205/). Agencies have noted Amazon product pages doing it for years.

**What almost nobody has seen** is a **brand treating a composed mute-loop card as the default sibling of every shareable URL**, not an ad-hoc product clip — Indra's Net, Earth, and (on nu.indra) the chakra climb. That scarcity is adoption, not a missing Apple API.

## 4. What we ship

| Asset | Size | Role |
| --- | --- | --- |
| `/og/<slug>.jpg` | 1200 × 630 | `og:image` still (same composition, frozen) |
| `/og/<slug>.mp4` | 1200 × 630 H.264, ~4 s | `og:video` for Messages / Android (landscape) |
| `/og/<slug>-hevc.mp4` | 1200 × 630 HEVC, ~4 s | Optional HEVC twin |
| `/og/<slug>-square.mp4` | 1080 × 1080 HEVC, ~4 s | `nu:preview` for webË (`WEBE.md` 7.1) |

Composition (the nu.indra.og card):

1. Hero Earth time-lapse as the bed.
2. Indra's lattice over it (same language as `Net.astro`).
3. Chakra line symbols Root → Crown: each glyph's strokes draw in, then morph into the next (product page plays the matching tone; OG motion carries the morph).
4. The product (suñůlink.shield) turning once, fully in frame.
5. Page words as a transparent overlay (Inter).
6. Two aspect ratios: landscape for Messages' crop, square for `nu:preview`.

Chakra tones on the product page (Root → Crown), Hertz:

| # | Name | Hz (approx.) |
| --- | --- | --- |
| 1 | Root (Muladhara) | 396 |
| 2 | Sacral (Svadhisthana) | 417 |
| 3 | Solar plexus (Manipura) | 528 |
| 4 | Heart (Anahata) | 639 |
| 5 | Throat (Vishuddha) | 741 |
| 6 | Third eye (Ajna) | 852 |
| 7 | Crown (Sahasrara) | 963 |

Build:

```bash
cd ~/Documents/GitHub/khensu/khensu-site
sh tools/og.sh
sh tools/og-anim.sh
```

## 5. Rules that keep it working

- **Direct file.** `og:video` returns `video/mp4` with a real body — no HTML shell, no auth cookie.
- **Short and small.** A few seconds; icon + image + video under Apple's ~10 MiB guidance (Tech Talk 205).
- **Phone fully in frame.** Landscape for Messages.
- **HTTPS only.**
- **Cache.** After changing the MP4, bust the URL or the thread.
- **Reduced motion.** Honour it on the product page; Messages follows system autoplay settings.

## 6. Patent assessment

**Disclosure.** The animated cards and `og:video` / `nu:preview` tags have been live on khensu.ñü since 12 October 2026. The page must not say patent pending. Site work is never held for a filing (`AGENTS.md`).

### 6.1 What is not ours to patent

- **Apple's playback path.** TN3156 and Tech Talk 205 (21 Dec 2017) teach: put a downloadable MP4 in `og:video`, Messages autoplays it.
- **Open Graph itself.** `og:video` has been in the [OGP](https://ogp.me/) since the Facebook era.
- **“Put a video next to an image tag.”** Alone, that is a documented config, not an invention.

### 6.2 Claim themes (for counsel)

1. **Paired still + direct motion preview per page** (Indra composition + hash).
2. **nu.indra.og composition pipeline** (Earth, lattice, chakra morph, product turn, words).
3. **webË media previews** (`nu:preview` + mixnet + effects) — `PATENTS.md` / `WEBE.md` 7.1.

### 6.3 Prior art

| Art | What it shows | Gap vs nu.indra.og |
| --- | --- | --- |
| Apple TN3156 + Tech Talk 205 (21 Dec 2017) | Direct MP4 in `og:video` → autoplay in Messages | No composition system; no hash; no mixnet; no chakra morph |
| Open Graph protocol (`ogp.me`) | `og:video` beside `og:image` | Silent on mute-loop marketing cards and dual aspect |
| Amazon / agency write-ups | Product pages with direct MP4 unfurls | Ad-hoc clips, not a lattice/network identity card on every page |
| US 10,992,615 B2 | Platform-specific OG renditions | Not a per-page authored Indra twin with content hash |

### 6.4 Recommendation

| Piece | Recommendation |
| --- | --- |
| Using Messages' `og:video` path | **Neither** — Apple’s docs (TN3156; Tech Talk 205, 21 Dec 2017). Keep shipping it. |
| nu.indra.og look | **Copyright / trade dress**; do not call it patent pending |
| `preview:*` / `nu:preview` contract for all unfurlers | **IETF informational draft** — `proposals/draft-staffer-link-preview-media-00.md`; Elliott reads before submit |

## 7. nu.indra in the product

- **Lore.** Indra's Net — `design/lore.md` 2.
- **Site.** `Net.astro` on every first hero; header nav **nu.indra.og** → `indra.og.khensu.nu`; page chrome shows **îňðřæ.ōġ**.
- **Cards.** The OG animation is that same net (and chakra climb) in the chat bubble.
- **webË.** Ordinary clients get `og:video`; the app prefers `nu:preview` when built (`WEBE.md` 7.1).
- **Interop.** Until Slack, Android Messages, Instagram DMs and TikTok DMs honour the draft, keep shipping H.264 `og:video` + `preview:*` tags so the day they adopt it, every page is already honest.
