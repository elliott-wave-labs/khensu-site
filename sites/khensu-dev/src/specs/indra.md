---
title: 'Indra link previews'
source: 'design/indra.md'
---

# Indra: the network card that moves in iMessage

**Status: shipped on khensu.ñü, 12–13 October 2026.** The white lattice over Earth in the link-preview cards is Indra's Net (`design/lore.md` 2): every jewel reflects every other. The same net pulses behind every hero on the site (`Net.astro`). This doc is the product we want people to feel when they share a link — and a patent assessment of what is actually new.

## 1. The thing we want

**A short, direct MP4 shipped beside every `og:image`, composed as Indra over Earth** — Earth time-lapsing, the lattice alive, suñůlink.shield turning once, the words of the page on top — so that when someone pastes `khensu.nu` into Messages the bubble itself is the network, looping muted, without opening the site.

That is the product. Not a private Messages API. Not a sticker pack. The gift made visible in the warmest referral moment there is: one person texting the link to another.

Everything else in this doc (how Messages loads it, how we build the files, what to claim) exists to protect and repeat that composition.

## 2. How you get it in iMessage

No special app, no stickers, no `LPLinkMetadata` code on our side. Messages already does this when the page is honest about video.

1. Paste a khėnsu.ñü URL that emits video previews — today home, buy, shield, **create** (`create.khensu.nu` / `/creators`), **waves** (`waves.khensu.nu` / `/waves`).
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

`og:image` is the still fallback for every client that ignores video. `og:video` must be a **direct, downloadable** MP4, HTTPS — not HLS, not a YouTube/Vimeo page. We ship **H.264 (`avc1`)** for the landscape `og:video` so Apple Messages, Android, and most unfurlers can decode it; the square `nu:preview` stays **HEVC (`hvc1`)** for webË and Apple quality. Apple documents the Messages behaviour in [TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages) and the [“Ensuring Beautiful Rich Links”](https://developer.apple.com/videos/play/tech-talks/205/) tech talk: Link Presentation downloads the file and plays it inline.

| Client | What you get today | Why |
| --- | --- | --- |
| Apple Messages | Mute-looping landscape MP4 (`og:video`, H.264), or a “Video” chrome + tap depending on Low Data / Reduce Motion | Documented in [TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages): **direct downloadable MP4** autoplays. Not a private API. |
| Google Messages / most Android SMS·RCS | Still (`og:image`) for ordinary sites | Consumer Android does **not** implement Apple’s direct-`og:video` path for arbitrary HTTPS pages. YouTube is special-cased; our H.264 file is ready when they (or another app) adopt the contract. |
| Slack | Still thumbnail only | Slack unfurls `og:image`. Inline video is allowlisted (YouTube, Vimeo, …). Arbitrary `og:video` is ignored. GIFs in `og:image` are frozen to the first frame. **Hack now:** paste `https://khensu.nu/og/waves.mp4` (Slack plays direct media). Custom unfurl + `/og/embed/?src=waves` needs an LB frame-ancestors exception (sites send `X-Frame-Options: DENY` today). |
| Discord / some Telegram clients | Often plays direct `og:video` | Closest “it just works” peers to Messages. |
| Instagram DMs | Still | Not required; square assets exist if useful later |

**You cannot meta-tag Slack or Google Messages into Apple’s behaviour.** Tags are already correct on waves/create/home. The gap is client policy. The fix for everyone else is the IETF draft `proposals/draft-staffer-link-preview-media-00.md` (mute-loop + hash + no allowlist) plus, until they ship it, a Slack unfurl app using `/og/embed.html`.

## 3. Why it feels impossible (and why that helps)

| What people try | What Messages does |
| --- | --- |
| Animated GIF / APNG / animated WebP in `og:image` | **First frame** only |
| `og:video` → YouTube / Vimeo / an HTML player | Tap-to-play or nothing |
| `og:video` → HLS (`.m3u8`) | Needs a tap |
| `og:video` → direct MP4 | **Downloads and loops muted** — Indra |

### 3.1 Is the iMessage motion preview “new”?

**The capability is not secret or brand-new.** Apple documented direct-MP4 rich previews in TN3156 and Tech Talk 205. Agencies have noted Amazon product pages doing it for years.

**What almost nobody has seen** — and why ~30 people react like it’s new — is a **brand treating a composed mute-loop card as the default sibling of every shareable URL**, not an ad-hoc product clip. Most sites never set `og:video` at all; SEO plugins push stills only. So when khėnsu.ñü pastes into Messages and the bubble *is* Indra over Earth, it reads as magic even though the pipe is public. That scarcity is adoption, not a missing Apple API.

If someone sees a still or a big “Video” tap target instead of autoplay: new thread, cache-bust (`?v=2`), check Low Data Mode / Reduce Motion, and confirm the phone fetched the H.264 `og:video` (not only the JPEG).

## 4. What we ship

| Asset | Size | Role |
| --- | --- | --- |
| `/og/<slug>.jpg` | 1200 × 630 | `og:image` still (same composition, frozen) |
| `/og/<slug>.mp4` | 1200 × 630 H.264, ~4 s | `og:video` for Messages / Android (landscape so the phone isn't cropped) |
| `/og/<slug>-hevc.mp4` | 1200 × 630 HEVC, ~4 s | Optional HEVC twin of the landscape card |
| `/og/<slug>-square.mp4` | 1080 × 1080 HEVC, ~4 s | `nu:preview` for webË / square clients (`WEBE.md` 7.1) |

Composition (the Indra card):

1. Hero Earth time-lapse as the bed.
2. Indra's lattice over it (same language as `Net.astro` on the site).
3. The product (suñůlink.shield) turning once, fully in frame.
4. Page words as a transparent overlay (Inter).
5. Two aspect ratios from one story: landscape for Messages' crop, square for Instagram-style and `nu:preview`.

Build:

```bash
cd ~/Documents/GitHub/khensu/khensu-site
sh tools/og.sh            # stills + transparent word overlays
sh tools/og-anim.sh       # default: 4 s, 30 fps, landscape + square
```

`Base.astro` reads `PREVIEWS` from `src/data/og.ts` (bytes, hash, duration) and emits both `og:video` (wide) and `nu:preview` (square).

## 5. Rules that keep it working

- **Direct file.** `og:video` returns `video/mp4` with a real body — no HTML shell, no auth cookie.
- **Short and small.** A few seconds; icon + image + video under Apple's ~10 MiB guidance. Mute-first: motion carries the story.
- **Phone fully in frame.** Landscape for Messages; don't trust a square to survive the bubble crop.
- **HTTPS only.** ATS drops `http://` media.
- **Cache.** After changing the MP4, bust the URL or the thread.
- **Reduced motion.** Honour it in our app when `nu:preview:effect` ships; Messages follows system autoplay settings where applicable.

## 6. Patent assessment

**Disclosure.** The animated cards and `og:video` / `nu:preview` tags have been live on khensu.ñü since 12 October 2026. The US one-year grace period (35 U.S.C. 102(b)(1)(A)) runs from that disclosure for the inventor's own publication; most other countries require absolute novelty, so foreign rights in what was shown are probably lost. The page must not say patent pending. Site work is never held for a filing (`AGENTS.md`).

### 6.1 What is not ours to patent

- **Apple's playback path.** TN3156 and the rich-links tech talk teach: put a downloadable MP4 in `og:video`, Messages autoplays it. Claiming “a messenger that plays `og:video`” is claiming Apple's product.
- **Open Graph itself.** `og:video` has been in the [OGP](https://ogp.me/) since the Facebook era; Mux, agencies and Amazon product pages already use direct MP4s for social/Messages unfurls.
- **“Put a video next to an image tag.”** Alone, that is a documented config, not an invention.

### 6.2 What we actually want protected — claim themes

The unusual part is the **Indra card as a system**: every shareable page carries a still *and* a short direct motion twin, both the same composition — Indra's Net over Earth, product in motion, mute-looping in the chat — generated and hashed so clients can trust what they show.

Draft themes for counsel (not claims):

1. **Paired still + direct motion preview per page.** For each canonical URL, emit `og:image` and a short downloadable `og:video` (and optionally `nu:preview`) that share one authored composition (background plate, network lattice, product turn, word overlay), sized for the clients that crop (landscape) and the clients that show square, with byte count and content hash recorded for the motion file.
2. **Indra composition pipeline.** Automatically lay a site hero time-lapse, a network lattice matching the in-app/site net, a one-turn product render, and a transparent typographic overlay into the paired assets above, so the chat bubble and the landing hero are the same living picture.
3. **webË media previews (broader, already in `PATENTS.md`).** `nu:preview` meta tags for video, audio, documents, contracts and installers — type, size, hash, named Metal effect — fetched through the mixnet, with client-worded warnings for installers/archives and `og:image` as fallback (`WEBE.md` 7.1). Indra on the ordinary web is the friendly face of that row.

Theme 1 is narrow and close to prior art (US 10,992,615 B2 “Dynamic open graph module…” generates platform-specific OG renditions including video/GIF; Apple and Amazon already ship direct MP4 previews). Its best chance is as a **dependent** story: the paired assets are not arbitrary clips but the Indra composition (theme 2), or they carry the hash/effect contract of theme 3.

Theme 2 is mostly **copyright, trade dress and brand** (the motion design, the lattice, the shield turn). Patenting “Earth + network mesh + phone spin in an OG card” is thin against decades of product hero video; counsel should treat the look as IP to enforce by copyright and passing-off, and put patent effort on theme 3.

Theme 3 is the real patent candidate: hash-checked media previews over a stealth fetch, with mandatory client warnings and named GPU effects — something OG/`og:video` do not do.

### 6.3 Prior art to put in front of counsel

| Art | What it shows | Gap vs Indra |
| --- | --- | --- |
| Apple TN3156 + Tech Talk 205 | Direct MP4 in `og:video` → autoplay in Messages | No composition system; no hash; no mixnet |
| Open Graph protocol (`ogp.me`) | `og:video` as a URL beside `og:image` | Silent on mute-loop marketing cards and dual aspect |
| Amazon / agency write-ups (e.g. Emerge on Messages video previews) | Product pages with direct MP4 unfurls | Ad-hoc product clips, not a lattice/network identity card on every page |
| US 10,992,615 B2 (Rolling, Starnes) | DOG engine: intercept crawler UA, emit platform-specific OG renditions (incl. video/GIF) | Middleware that rewrites per platform; not a per-page authored Indra twin with content hash |
| Twitter player cards / oEmbed | Embeddable players | Not downloadable mute-loop files in Messages |
| Slack / iMessage LPMetadataProvider | Client rich-link frameworks | Consumption, not our emission pipeline |

### 6.4 Recommendation

| Piece | Recommendation |
| --- | --- |
| Using Messages' `og:video` path | **Neither** — Apple's docs. Keep shipping it. |
| Indra look (Earth, lattice, shield turn, words) | **Copyright / trade dress**; publish the motion; do not call it patent pending |
| Paired still+MP4 on every page as Indra | **Publish defensively** in this doc and the site; optional narrow provisional only if counsel sees a filing angle when tied to hashes/dual-aspect generation — unlikely alone |
| `nu:preview` + mixnet + effects + installer warnings | **Assess for filing** — the existing `PATENTS.md` row; Indra on khensu.ñü is the public demo of the video half |

**Working rule for the team:** when we say “the Indra patent,” we mean protecting the *card people feel* (composition + always-paired motion) and filing, if at all, on the *webË preview contract* that goes beyond Open Graph — not on Apple's autoplay.

## 7. Indra in the product

- **Lore.** Indra's Net is how memory and the people-run network are shown (`design/lore.md` 2).
- **Site.** `Net.astro` draws the lattice behind the first hero of every page.
- **Cards.** The OG animation is that same net moving in the chat bubble.
- **webË.** Ordinary clients get `og:video`; the khėnsu.ñü app will prefer `nu:preview` (hash-checked, optional Metal effect) when that path is built (`WEBE.md` 7.1).
