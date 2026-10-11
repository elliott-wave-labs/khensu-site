---
title: 'ñü.media design'
source: 'design/nu-media.md'
---

# ñü.media: images, video and HDR in minimal wire bits

How khensu.ñü sends photos and video at the fewest bits on the wire while keeping resolution, colour and HDR, using the A20 Pro's Neural Engine and media engines. Status: design. **No ñü.media measurements exist yet.** Every baseline figure below is an estimate from typical results for Apple's encoders and the published literature; every ñü.media figure is a target. Section 8 is the benchmark that replaces them. Open questions in `OPEN-QUESTIONS.md` section H (52 and 55). Summary in `PLAN.md`, nu-media.

## 1. Hardware it is built for

iPhone 18 Pro and Pro Max (Apple's specifications page):

| Part | What it gives ñü.media |
| --- | --- |
| A20 Pro: dual 16-core Neural Engine | Learned image encode and decode, receiver-side video enhancement (Core ML, FP16 and INT8) |
| 7-core GPU with Neural Accelerators | Second place to run networks; colour conversion and tone mapping in Metal |
| Media engine: hardware encode | HEVC (Main, Main 10, HDR), H.264, ProRes. **No AV1 encoder** |
| Media engine: hardware decode | HEVC, H.264, AV1, ProRes; HDR as Dolby Vision, HDR10+/HDR10 and HLG |
| Display | 2622 × 1206 (Pro, 3,162,132 px) or 2868 × 1320 (Pro Max, 3,785,760 px) at 460 ppi; P3; 1,000 nits typical, 1,600 nits HDR peak; ProMotion up to 120 Hz |
| Cameras | 48 MP Fusion cameras; 4K Dolby Vision up to 120 fps; spatial video 1080p30; ProRes RAW, Apple Log 2, ACES |

The A20 Pro has no "TPU"; Apple's term is the Neural Engine. The iPhone has no AV1 encoder. Measured on an iPhone Air (section 8.2), Apple's current hardware HEVC encoder matches real-time AV1 software at 720p and beats it at 4K, at a fraction of the power, so the video base layer is hardware HEVC Main 10 (H.264 only as a fallback for devices without HEVC Main 10). AV1 decodes in hardware on A17 Pro and later. ñü.media works on every iOS 26 device and is tuned for iPhone 18 Pro on iOS 27.

## 2. The wire budget

Everything is sized against the stealth tick (`PROTOCOL.md`): with the app open, a burst every 2 s with 3 payload slots of 2,048 bytes.

| Unit | Bits |
| --- | --- |
| One slot (2,048 B payload) | 16,384 |
| One tick (3 slots) | 49,152 |
| Per second, foreground | 24,576 bit/s |
| Bulk packet payload (own node, charging window) | 524,288 (64 KB) |
| Call tiers (constant rate) | L 500,000 bit/s, M 1,500,000 bit/s, H 3,800,000 bit/s, plus Opus 32,000 bit/s |

Bits are the primary unit below. KB means 1,024 bytes; MB means 1,000,000 bytes.

## 3. Images: ImageIO against ñü.media

One full-screen photo on iPhone 18 Pro (3,162,132 px). Bits = bits per pixel (bpp) × pixels. Time is how long it takes to arrive inside the ticks.

| Format | Setting | bpp | Bits | Size | Slots | Time in ticks |
| --- | --- | --- | --- | --- | --- | --- |
| JPEG (ImageIO) | quality 0.8 | 1.60 | 5,059,411 | 618 KB | 309 | 206 s |
| JPEG (ImageIO) | quality 0.5 | 0.90 | 2,845,919 | 347 KB | 174 | 116 s |
| HEIC (ImageIO, hardware HEVC) | quality 0.8 | 0.80 | 2,529,706 | 309 KB | 155 | 104 s |
| HEIC (ImageIO, hardware HEVC) | quality 0.4 | 0.25 | 790,533 | 96.5 KB | 49 | 34 s |
| **ñü.media**, target upper | fidelity mode | 0.104 | 327,680 | 40 KB | 20 | 14 s |
| **ñü.media**, target lower | fidelity mode | 0.039 | 122,880 | 15 KB | 8 | 6 s |
| **ñü.media** preview | first slot | 0.0052 | 16,384 | 2 KB | 1 | first tick |

What to expect honestly:

- **At equal quality, ñü.media targets about half the bits of ImageIO HEIC.** That figure is an estimate: the best learned image codecs measure roughly 10–20% fewer bits than VVC intra, VVC intra roughly 25% fewer than HEVC intra (HM reference), and a real-time hardware HEIC encoder needs more bits than HM. Combined, that is about 45–55% below ImageIO HEIC.
- **15–40 KB is a size cap, not "the same picture for free".** It is about what HEIC would need at 30–80 KB: softer than the camera's original, but clean. Learned codecs degrade by smoothing, not by blocks and ringing, which is why they look better than HEIC at these sizes.
- **Fidelity first:** no generated texture (no GAN or diffusion decoders), so nothing appears that wasn't in the photo.
- **Live Photos are fully supported (11 Oct 2026).** At screen size they travel inside the ticks like any photo: the still first (about 40 KB, shown in about 7 ticks), then up to 3 s of motion coded as a residual from the still, with Opus sound, for about 200 KB in total (design target; about 34 ticks, so it moves at about 70 s). Apple's HEIC + HEVC pair at the same size is about 1.4 MB. The receiver rebuilds a real Live Photo (`PHLivePhoto` from a still and a paired video with the same asset identifier), so it plays with a long press and saves to Photos as a Live Photo.
- **Originals** (full 48 MP, ProRAW, full-resolution Live Photos) don't go through the ticks. They go through your own node, the charging window or the trickle (`PLAN.md`, Stealth).

## 4. Video: hardware H.264 and H.265 against ñü.media

### 4.1 Stored video at equal quality

The baselines are VideoToolbox hardware encoders at typical good streaming quality, around VMAF 93, on natural content. ñü.media's target is the same VMAF with about 40% fewer bits than hardware HEVC; the realistic range from the literature is 30–50%. 60-second clip.

| Codec | Resolution and frame rate | Pixel rate (px/s) | Bitrate (bit/s) | bpp | Bits per minute | Size per minute |
| --- | --- | --- | --- | --- | --- | --- |
| H.264 hardware, 8-bit SDR | 1920 × 1080, 30 fps | 62,208,000 | 6,000,000 | 0.096 | 360,000,000 | 45.0 MB |
| HEVC hardware, 8-bit SDR | 1920 × 1080, 30 fps | 62,208,000 | 3,600,000 | 0.058 | 216,000,000 | 27.0 MB |
| HEVC hardware, Main 10 HDR | 1920 × 1080, 30 fps | 62,208,000 | 4,500,000 | 0.072 | 270,000,000 | 33.8 MB |
| HEVC hardware, Main 10 HDR | 3840 × 2160, 30 fps | 248,832,000 | 16,000,000 | 0.064 | 960,000,000 | 120.0 MB |
| AV1 (playback only on iPhone, for reference) | 1920 × 1080, 30 fps | 62,208,000 | 2,600,000 | 0.042 | 156,000,000 | 19.5 MB |
| **ñü.media**, SDR target | 1920 × 1080, 30 fps | 62,208,000 | 2,200,000 | 0.035 | 132,000,000 | 16.5 MB |
| **ñü.media**, HDR target | 1920 × 1080, 30 fps | 62,208,000 | 2,700,000 | 0.043 | 162,000,000 | 20.3 MB |
| **ñü.media**, HDR target | 3840 × 2160, 30 fps | 248,832,000 | 9,600,000 | 0.039 | 576,000,000 | 72.0 MB |

Video doesn't fit the foreground ticks: one ñü.media HDR minute at 1080p (162,000,000 bits) takes about 110 minutes at 24,576 bit/s. It goes through your own node or the charging window.

### 4.2 Calls at equal bits

Calls run at a fixed bitrate (stealth), so the comparison is what resolution and frame rate each codec delivers for the same bits. ñü.media sends a reduced-resolution base layer and the receiver's Neural Engine adds super-resolution, artefact removal and frame interpolation (section 5). The table below is the design target; sections 8.1 and 8.2 have the first measurements.

| Tier | Codec | Sent | Shown | bpp sent | bpp shown | Bits per minute |
| --- | --- | --- | --- | --- | --- | --- |
| L, 500,000 bit/s | H.264 hardware | 640 × 360, 30 fps | same | 0.072 | 0.072 | 30,000,000 |
| | HEVC hardware | 960 × 540, 30 fps | same | 0.032 | 0.032 | 30,000,000 |
| | **ñü.media** | 960 × 540, 30 fps HEVC base | 1920 × 1080, 30 fps | 0.032 | 0.008 | 30,000,000 |
| M, 1,500,000 bit/s | H.264 hardware | 960 × 540, 30 fps | same | 0.096 | 0.096 | 90,000,000 |
| | HEVC hardware | 1280 × 720, 30 fps | same | 0.054 | 0.054 | 90,000,000 |
| | **ñü.media** | 1280 × 720, 30 fps HEVC base | 1920 × 1080, 60 fps | 0.054 | 0.012 | 90,000,000 |
| H, 3,800,000 bit/s | H.264 hardware | 1280 × 720, 60 fps | same | 0.069 | 0.069 | 228,000,000 |
| | HEVC hardware | 1920 × 1080, 30 fps | same | 0.061 | 0.061 | 228,000,000 |
| | **ñü.media** | 1080 × 1920, 30 fps, 10-bit HDR base | full panel 1206 × 2622, 60 fps (120 on ProMotion) | 0.061 | 0.020 | 228,000,000 |

Audio adds 1,920,000 bits per minute (Opus at 32,000 bit/s, constant).

## 5. How ñü.media works

- **Images:** a learned transform codec. The analysis and synthesis networks run on the Neural Engine in FP16; the entropy model (hyperprior and context model) runs in integer arithmetic on the CPU, so every device decodes the exact same symbols. Learned codecs that run their entropy model in floating point break when encoder and decoder hardware differ; integer entropy models avoid that. Progressive: the first slot carries a preview, and each later slot refines the whole picture.
- **Video, three layers:**
  - **Base:** hardware HEVC Main 10 at constant bitrate with low-latency rate control, so it runs live on every iOS 26 device. It is always decodable on its own. Full resolution by default; reduced resolution only at the lowest call tier, where section 8 shows it helps on older encoders (to be tuned per chip).
  - **Enhancement, outside the loop:** super-resolution, artefact removal and frame interpolation on the receiver's Neural Engine. It can't drift and needn't be bit-exact. Target budget on iPhone 18 Pro: 8 ms per frame at 60 fps and 300 mW, to be measured.
  - **Residual, inside the loop:** a learned integer residual layer adds detail on devices that can run it in real time. Stored video only at first.
- **Metadata:** all EXIF, GPS, device and time data is dropped; only colour and HDR metadata is kept.

## 6. HDR and colour: wider than the phone

ñü.media carries more colour than the iPhone's screen shows, so the same file looks right on later displays.

| Property | ñü.media | ImageIO HEIC / JPEG | Hardware H.264 / HEVC on iPhone |
| --- | --- | --- | --- |
| Primaries | **BT.2020** (about 76% of CIE 1931 xy; P3 is about 54%, sRGB about 36%) | P3 or sRGB | BT.709, P3, BT.2020 (HEVC Main 10) |
| Transfer | **PQ (SMPTE ST 2084, up to 10,000 nits) and HLG (BT.2100)**; sRGB and P3 gamma for SDR | sRGB gamma; HDR through a gain map | PQ, HLG (HEVC Main 10); SDR only on H.264 |
| Bit depth | **12-bit images, 10-bit video** (12-bit via the residual layer) | 8-bit JPEG; 8- or 10-bit HEIC | 8-bit H.264; 10-bit HEVC |
| Chroma | **4:4:4 images**; 4:2:0 video base with chroma restored by the enhancement layer | 4:2:0 typical | 4:2:0 |
| Working space | Linear-light FP16 in BT.2020, native to the Neural Engine | Display-referred | Display-referred |
| HDR metadata | Mastering display, MaxCLL/MaxFALL, and our own per-scene tone-mapping curves | ISO 21496-1 gain map | HDR10 static; Dolby Vision 8.4 from the camera |

- **Display:** the receiver tone-maps from PQ or HLG to the screen's current headroom with Apple's EDR APIs, so HDR stays HDR at 1,600 nits and degrades cleanly on SDR screens.
- **Export:** when you save to Photos or share outside khensu.ñü, ñü.media writes HEIC with an ISO 21496-1 gain map through ImageIO (images), or HEVC Main 10 HLG through VideoToolbox (video), so other apps show it correctly.
- **Dolby Vision and HDR10+:** received camera clips in Dolby Vision profile 8.4 are carried as their HLG base plus our own tone-mapping metadata. We play Dolby Vision and HDR10+ through Apple's decoders but don't author either; both need licences from their owners.
- **Cost of HDR:** about 10–25% more bits than SDR at the same quality (estimate), included in the tables above.

## 7. More than the usual formats

| Feature | What ñü.media does |
| --- | --- |
| Up to 48 MP | Full-resolution originals, coded in tiles so any region can be fetched first |
| Alpha | Transparency channel for stickers and cut-outs |
| Depth | Portrait and LiDAR depth maps at a quarter resolution, for refocusing and AR |
| Spatial photos and video | The second eye coded as a residual from the first (Apple's spatial video is MV-HEVC 1080p30) |
| Live Photos | Still plus up to 3 s of motion, the motion as a video residual from the still |
| Screen content | A mode for screenshots and documents: sharp text, palettes, optional lossless |
| Lossless | Bit-exact mode for documents and originals |
| Region of interest | Extra bits on faces and text in the same file size |
| Later | 360° video in viewport tiles (Places), Gaussian splats and 3D capture |

### 7.1 Frame rate: 120 Hz, and double the fastest gaming display

- **Format:** frames carry a 1 MHz timestamp, not a fixed rate, so a stream can run at any rate up to **2,000 fps** and change rate mid-stream. That is double the fastest gaming monitors on sale (about 500 to 1,000 Hz in 2026; the exact top figure is to be confirmed before it is quoted on the site).
- **Tiers:**

  | Tier | Rate | Where |
  | --- | --- | --- |
  | Standard | 30 and 60 fps | Every iOS 26 device |
  | ProMotion | 120 fps | iPhone Pro, iPad Pro, MacBook Pro |
  | Double ProMotion | 240 fps | Recording and playback; slow motion from the camera |
  | Gaming | Up to 2,000 fps | Mac and PC capture to high-refresh displays |

- **How:** above the rate the sender's encoder can sustain, the sender codes a lower rate (for example 60 fps) and the receiver's Neural Engine interpolates the missing frames in the enhancement layer (section 5). Interpolated frames cost no bits, so 120 and 240 fps calls use the same bitrate as 60 fps. Stored high-rate video (camera 4K120, 240 fps slow motion, game capture) is coded at its native rate.
- **No frame loss:** the receiver never drops a coded frame. It shows every coded frame and only adds or skips interpolated ones to match the display. The benchmark counts frames in and out for every run.
- **To measure on iPhone Air:** hardware encode and Neural Engine super-resolution throughput at each base size (section 8.3), and Apple's low-latency frame interpolation from 30 or 60 to 120 and 240 fps. A 120 fps test clip is still needed: the NASA 4K clip is 29.97 fps.

### 7.2 Resolution: native from the best cameras, headroom to 42K

- **Rule:** ñü.media never scales a source down to fit the codec. Video is carried at the camera's native resolution, frame rate and bit depth; only the bitrate changes. Lowering resolution is the viewer's choice (a smaller screen or a slower link fetches fewer tiles), not the sender's.
- **Format limits:** frame sizes up to **43,008 × 21,504** (42K equirectangular), coded as independent tiles of 512 × 512 to 2,048 × 2,048 so no single decoder has to hold a whole frame. 42K cameras don't exist yet; the limit is there so the format won't need to change when they do.
- **Cameras to support first:**

  | Camera | Native video | Live today | Notes |
  | --- | --- | --- | --- |
  | Insta360 Titan | 11K mono, 10K 3D, 30 fps, 10-bit, 8 Micro Four Thirds sensors | 4K30 stitched in camera; 8K30 with Insta360's 8K Live licence and an external stitching server (RTSP, RTMP, RTMPS, HLS, SDI) | [insta360.com](https://www.insta360.com/product/insta360-titan) |
  | Large-format cinema cameras | 12K to 17K (for example Blackmagic URSA Cine 17K 65) | Not as live streams | Model list to be confirmed before it is quoted |
  | Dome and immersive rigs | Up to about 18K square (Sphere's Big Sky) | No | Theatre and dome playback |

- **Viewing 360 and VR:** tiles are fetched by viewport (section 7, Places), so a viewer on iPhone or Vision Pro downloads only what they're looking at in full detail, plus a low-detail full sphere for quick head turns.
- **Raw versus native:** truly uncompressed 11K30 10-bit is about 25 Gbit/s (10,560 × 5,280 × 30 fps × 15 bits at 4:2:0), which no internet path carries. "Raw" in khensu.ñü means **native resolution, never downscaled**, at a visually lossless bitrate, with a mathematically lossless mode (section 7, Lossless) for local networks and dedicated fibre.
- **Ingest without servers:** the encoder runs on the camera operator's own Mac or stitching machine, which takes the camera's SDI, RTSP or RTMP feed and sends ñü.media into the network. Nothing is transcoded on khensu.ñü or operator servers. MOQOM Cloud uses the same format and the same ingest tool.
- **Theatres:** cinemas play features from DCI packages (JPEG 2000, encrypted with per-screen keys) and take live events as alternative content through a decoder on the projector's SDI or HDMI input. ñü.media targets that alternative-content input first, at the projector's native 2K or 4K, or up to 16K on LED walls and domes. DCI packaging is a separate licensing and certification job.
- **Open questions:**
  - how high-bitrate live streams travel: the mixnet's constant-rate cover traffic makes multi-gigabit streams costly, so large live events may use the two-relay call path instead;
  - decoder memory and power for 11K-plus tiles on iPhone and Vision Pro (to be measured);
  - the exact current top camera and display figures, checked at publication.

### 7.3 nu-score: the test where VMAF stops

VMAF alone can't judge nu-media. Its models stop at 3840 × 2160 and assume 8-bit SDR at ordinary frame rates, which is about the ceiling of what Netflix streams (4K HDR). Its single average hides a few bad frames, and it can't see dropped frames, stalls or banding. `bench/nuscore.py` reports, for any resolution and frame rate:

| Group | What it measures |
| --- | --- |
| Size | Bytes, mean bitrate, peak bitrate over any 1-second window, bits per pixel per frame |
| Timing | Frames in and out, dropped and duplicated frames, longest stall, effective fps, encode fps (from the device), decode fps |
| Resolution | Native size of the source and the encode; scoring always happens at the source size, in tiles of at most 3840 × 2160, so 8K, 11K and 42K work |
| Quality | Per frame and per tile: VMAF (4K model per tile), PSNR-Y, MS-SSIM and Netflix's CAMBI banding score; mean, worst 1% of frames and worst tile. HDR and high-frame-rate perception with ColorVideoVDP (JOD, 10 = identical) when installed |
| Verdict | "Same as the original" only when every gate passes: VMAF mean 95 and worst 1% 90, MS-SSIM worst 1% 0.985, CAMBI no higher than 3, no dropped frames, no stall longer than 1.5 frames, and JOD 9.5 when ColorVideoVDP runs. The gates are a starting point, calibrated against a viewer test (ITU-T P.910) |

First run, on a synthetic 7680 × 4320 clip with x264 at CRF 32: VMAF mean 87, but the worst 1% of frames 62 and the worst tile 78, which a single VMAF number would have hidden.

**Test media.** `bench/ytstream.py` saves exactly the stream YouTube delivers, without re-encoding, with a JSON record of the format, codec, resolution, frame rate, HDR transfer, bitrate, licence and SHA-256. The first clip is "Best of 8K Video" (4K Video ULTRA HD on YouTube), format 702: AV1 Main 10-bit, 7680 × 4320, 59.94 fps, PQ (SMPTE ST 2084) in BT.2020, about 51 Mbit/s; 20 seconds from 1:00. The title says 120 fps, but YouTube sends 60. Downloaded streams are for private dev testing; showing them publicly needs the owner's permission.

## 8. Benchmark: replacing the estimates

A Swift test app, `nu-media/bench`, runs on iPhone 18 Pro and an iOS 26 device from the oldest supported generation and writes the tables above with measured numbers.

- **Codecs:**
  - ImageIO JPEG and HEIC at quality 0.3–0.95, with ImageIO AVIF and JPEG XL as decode-only references;
  - VideoToolbox hardware H.264 and HEVC Main and Main 10, both variable and constant bitrate, with low-latency rate control for the call tiers;
  - ñü.media images and video.
- **Content:**
  - images: Kodak (24 images), the CLIC professional validation set, and our own iPhone captures in SDR and HDR;
  - video: the UVG sequences at 1080p and 4K, HDR test sequences, and recorded video-call content.
- **Quality metrics:**
  - all content: PSNR on Y′CbCr (6:1:1 weighting), MS-SSIM and VMAF;
  - HDR: PU21-encoded PSNR and VMAF, and colour error as ΔE_ITP (ITU-R BT.2124).
- **Results:** BD-rate against each baseline, bits per image and per minute, encode and decode time per image and per frame, and energy per image and per minute (MetricKit and power logs).
- **Pass criteria for shipping:**
  - images use at least 35% fewer bits than ImageIO HEIC at equal MS-SSIM;
  - calls score higher VMAF at the displayed resolution than hardware HEVC at the same tier;
  - decode is bit-exact across all supported devices;
  - no frame drops at 60 fps on iPhone 18 Pro.

Measured results go here, with the device, OS build and commit of each run.

| Run | Device | OS | Result |
| --- | --- | --- | --- |
| 8.1 | Apple M1 Pro (Mac, not iPhone) | macOS 26.4.1 | Video baselines and base layer only; no Neural Engine enhancement |
| 8.2 | iPhone Air (iPhone18,4, A19 Pro) | iOS 26.6.1 (23G83) | H.264 and HEVC hardware encodes on the phone; AV1 on the Mac; base layer only |

### 8.1 Desktop baseline run

`bench/codecs.py` with ffmpeg, data in `bench/results.json`. Source: *Tears of Steel* 1080p (Blender Foundation, CC BY 3.0), 6 s from 28 s, 24 fps, 8-bit 4:2:0. Quality is VMAF (libvmaf, default model) against the 1080p source. H.264 and HEVC use VideoToolbox with software fallback disabled, so these are Apple's hardware encoders; VideoToolbox undershoots its target by about 30%, so the table uses actual bitrates. ñü.media rows are the base layer only, upscaled with Lanczos: a floor for the enhancement layer to build on.

| Codec | Real time live | ~350 kbit/s | ~700 kbit/s | ~1,400 kbit/s | ~2,800 kbit/s | kbit/s for VMAF 80 |
| --- | --- | --- | --- | --- | --- | --- |
| H.264, Apple hardware | Yes | 29.6 | 56.3 | 77.2 | 88.5 | 1,638 |
| HEVC, Apple hardware | Yes | 37.0 | 62.4 | 82.4 | 90.9 | 1,277 |
| ñü.media base, HEVC hardware at 960 × 540 | Yes | 47.5 | 68.2 | 81.7 | 89.3 | 1,270 |
| ñü.media base, SVT-AV1 real time at 960 × 540 | Yes, CPU | 63.5 (299) | 73.5 (560) | 82.0 (1,056) | 87.6 (2,062) | 912 |
| AV1, SVT-AV1 real time (CBR, low delay, preset 10) at 1080p | CPU heavy | 65.0 (334) | 75.0 (581) | 83.3 (1,114) | 89.7 (2,133) | 861 |
| AV1, SVT-AV1 preset 8, lookahead (not usable live) | No | 72.8 (248) | 83.1 (495) | 89.1 (956) | 92.8 (1,899) | 403 |

Bracketed figures are the actual kbit/s where an encoder didn't land near the column. Equal-bitrate check at 500 kbit/s (each encoder steered to within 3%): H.264 42.6, HEVC 50.9, ñü.media HEVC base 59.2, ñü.media AV1 base 72.0, real-time AV1 at 1080p 72.9.

What this changes and what it doesn't:

- **Superseded by 8.2 for the base layer.** The M1 Pro's hardware encoder is several generations old; on an iPhone Air, hardware HEVC is much stronger, so the base layer stays hardware HEVC.
- **Offline AV1 is the bar for the enhancement layer:** ñü.media's target is that quality (about 400 kbit/s for VMAF 80 on this clip) in real time on iPhone. Unmeasured until the enhancement network exists.
- **AV2 and learned codecs are not measured here.** Published figures: AV2 about 30% fewer bits than AV1 (AOMedia); DCVC-RT 21% fewer than H.266 VTM and real time at 1080p only on an NVIDIA A100 (Jia et al., CVPR 2025). Neither has a phone encoder. The site plots them as estimates scaled from the offline AV1 curve (0.70 and 0.65).
- **One clip, one machine, 8-bit SDR.** The section 8 pass criteria still need the iPhone app, the full content set, HDR and energy.

### 8.2 iPhone Air run

`bench/iphone.py` drives the `bench/ios` app (NuBench) over `devicectl`: the Mac copies ProRes 422 clips to the phone, the phone encodes them with VideoToolbox hardware only (real time, no frame reordering, average bitrate capped per second), and the Mac copies the files back and scores them. AV1 is SVT-AV1 at real-time call settings on the Mac (the iPhone has no AV1 encoder). ñü.media rows are the half-size base layer with a Lanczos upscale, no Neural Engine. Data in `bench/iphone-reel.json` and `bench/iphone-aurora.json`. Encode fps is the phone's whole pipeline, including ProRes decode.

**720p:** a 720 × 1280 portrait reel (supplied by the user; already H.264 at 2.5 Mbit/s, so its compression is baked in), 6 s from 8 s, 30 fps. VMAF default model.

| Codec | ~180–350 kbit/s | ~700 kbit/s | ~1,400 kbit/s | Equal 500 kbit/s | iPhone encode fps |
| --- | --- | --- | --- | --- | --- |
| H.264, iPhone hardware | 35.4 (359) | 67.9 | 85.4 | 52.7 | ~210 |
| HEVC, iPhone hardware | 61.4 (352) | 79.7 | 90.0 | 72.6 | ~196 |
| ñü.media base, HEVC hardware at 360 × 640 | 62.0 (352) | 75.2 | 83.8 | 69.4 | ~375 |
| AV1, SVT-AV1 real time on the Mac | 62.9 (306) | 84.8 (1,054) | 92.9 (2,047) | 72.4 | Mac |
| ñü.media base, SVT-AV1 at 360 × 640 on the Mac | 58.7 (273) | 80.2 (1,021) | 86.4 (2,030) | 69.8 | Mac |

**4K:** NASA SVS 31375, aurora from the ISS during the November 2025 geomagnetic storm, 3840 × 2160 at 180 Mbit/s, 6 s from 24 s, 30 fps. VMAF 4K model.

| Codec | ~1,400–2,000 kbit/s | ~2,800–4,000 kbit/s | ~5,600–8,000 kbit/s | Equal 4,000 kbit/s | iPhone encode fps |
| --- | --- | --- | --- | --- | --- |
| H.264, iPhone hardware | 83.2 (1,403) | 88.3 (2,801) | 90.9 (5,613) | 90.0 | ~53 |
| HEVC, iPhone hardware | 90.9 (1,402) | 92.8 (2,805) | 93.7 (5,609) | 93.3 | ~48 |
| ñü.media base, HEVC hardware at 1920 × 1080 | 84.8 (1,328) | 85.6 (1,859) | 86.6 (3,815) | 86.6 (3,815) | ~97 |
| AV1, SVT-AV1 real time on the Mac | 86.6 (2,078) | 88.3 (4,132) | 89.6 (8,197) | 88.2 | Mac |
| ñü.media base, SVT-AV1 at 1920 × 1080 on the Mac | 82.5 (2,008) | 83.9 (3,927) | 85.3 (7,709) | 84.0 | Mac |

What this shows:

- **Apple's current HEVC encoder is the baseline to beat.** It matches real-time AV1 software at 720p and beats it by 5 VMAF points at 4K, in hardware. The base layer stays HEVC.
- **A half-size base layer alone loses on this hardware** (69 vs 73 at 720p, 87 vs 93 at 4K): upscaling can't restore detail the encoder never sent. Everything ñü.media claims beyond HEVC has to come from the Neural Engine layers, which don't exist yet. The target stays 40% fewer bits than hardware HEVC at equal VMAF.
- **4K HEVC encodes at about 48 fps on iPhone Air** including ProRes decode, so 4K30 is live; the half-size path runs at about 97 fps, leaving headroom for enhancement.
- **Limits:** two clips, one phone, 8-bit SDR, no energy measurement yet. Publishing the reel on khensu.ñü needs the creator's permission.

**Every codec at 500 kbit/s, 720p, with a first Neural Engine enhancement** (`bench/grid720.py`, data in `bench/iphone-720p.json`). The source is the Instagram file itself: H.264 High profile, 720 × 1280 at 30 fps, 2.44 Mbit/s video (2.51 Mbit/s with audio). Every encoder is steered to 500 kbit/s ±3%.

| Tile | Where | VMAF |
| --- | --- | --- |
| ñü.media prototype: HEVC hardware at 360 × 640 + `VTLowLatencySuperResolutionScaler` 2x on the Neural Engine | iPhone Air | 62.7 |
| Same base with a Lanczos upscale | iPhone Air encode, Mac upscale | 69.4 |
| H.264, iPhone hardware | iPhone Air | 52.7 |
| HEVC, iPhone hardware | iPhone Air | 72.6 |
| AV1, SVT-AV1 real time | Mac | 72.9 |
| AV1, SVT-AV1 preset 4 with lookahead (not live) | Mac | 86.1 |
| VP9, libvpx real time | Mac | 64.0 |
| HEVC, x265 preset slow (not live) | Mac | 81.3 |

- **Apple's low-latency super resolution** runs at about 440–500 fps at 360 × 640 → 720 × 1280 on iPhone Air, so a learned enhancement layer has ample real-time budget. It looks sharper but scores below a plain upscale: it is a general-purpose scaler that adds texture the original doesn't have, which VMAF penalises. ñü.media's enhancement has to be trained on our own base layer with a fidelity loss, not borrowed.
- **Offline encoders show the headroom:** x265 slow and AV1 with lookahead reach VMAF 81–86 at the same bits, 9–14 points above the live hardware encoder. That gap is what a learned layer on the receiving phone can try to close without changing what's sent.
- **Bug fixed on the way:** the scaler rejects frames that lack the padded layout in `sourcePixelBufferAttributes`, which `AVAssetReader` ignores; frames are copied into a pool with those attributes first.
