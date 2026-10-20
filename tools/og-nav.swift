// Animated link previews for the nav pages (1200 x 630 H.264 og:video, 1080 x 1080 HEVC nu:preview, 3 s).
// The centre visual is never a phone; phones stay on the home, shield and buy cards (tools/og-anim.sh).
// Usage: swift tools/og-nav.swift [slug ...] && python3 tools/og-previews.py slug ...
import AppKit
import CoreGraphics
import Foundation

let site = "/Users/elliott/Documents/GitHub/khensu/khensu-site/sites/khensu-nu"
let pubOg = "\(site)/public/og"
let instaDir = "\(NSHomeDirectory())/Desktop/khensu-instagram"
let tmpDir = "/tmp/khensu-nav-og"
try? FileManager.default.createDirectory(atPath: pubOg, withIntermediateDirectories: true)
try? FileManager.default.createDirectory(atPath: instaDir, withIntermediateDirectories: true)

struct CardSpec {
    let slug: String
    let pillLeft: String
    let pillRight: String
    let badge: String
    let h1: String
    let h2: String
    let h3: String
    let cardTitle: String
    let cardSub: String
    let cardGreen: String
    let cta: String
    let accentR: CGFloat, accentG: CGFloat, accentB: CGFloat
    let visualKind: String
    let imgPath: String?
}

let specs: [CardSpec] = [
    CardSpec(
        slug: "aura",
        pillLeft: "ñü.åůřâ · first show · Venice Beach",
        pillRight: "ñü.isheru · $444 → $44m",
        badge: "FIRST FASHION SHOW · DRESSED IN ÑÜ.ISHERU",
        h1: "ÑÜ.ÅŮŘÂ",
        h2: "I’m the designer.",
        h3: "It’s my first show.",
        cardTitle: "ñü.åůřâ · Quiet sensing as jewelry",
        cardSub: "$444 sets · $44k emerald · $4.4m diamond · $44m moldavite (3 only)",
        cardGreen: "Lapis · Bloodstone · Labradorite · Onyx · Platinum · Moldavite",
        cta: "SEE THE FIRST SHOW · aura.khensu.nu",
        accentR: 0.13, accentG: 0.96, accentB: 0.60,
        visualKind: "aura",
        imgPath: "\(site)/public/khensu/stones/inlay-standard.png"
    ),
    CardSpec(
        slug: "avatars",
        pillLeft: "ñü.ævätåřş · on-device live style studio",
        pillRight: "Ink · Toon · Pixel · Glass · 3D",
        badge: "ON-DEVICE NEURAL ENGINE · ZERO CLOUD",
        h1: "ñü.ævätåřş",
        h2: "Style on device.",
        h3: "Stream smaller.",
        cardTitle: "Live Ink, Toon, Pixel, Glass & 3D Mesh",
        cardSub: "Packed by nu.media over the mixnet · Ready for AR & ñü.êýêš",
        cardGreen: "Your face never leaves your device",
        cta: "OPEN AVATAR STUDIO · avatars.khensu.nu",
        accentR: 0.49, accentG: 0.78, accentB: 1.00,
        visualKind: "avatars",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "bi",
        pillLeft: "ñũ.Bî · universal basic income",
        pillRight: "Paid by the network",
        badge: "ONE WORLDWIDE RATE · EQUAL SHARE FOR EVERY PERSON",
        h1: "ñũ.Bî",
        h2: "A basic income,",
        h3: "paid by the network.",
        cardTitle: "Node work first · Universal basic income next",
        cardSub: "Proofs, storage, renditions & mixnet relays settled in shielded pool",
        cardGreen: "Freedom, privacy and a basic income for humanity",
        cta: "EXPLORE ÑŨ.BÎ · bi.khensu.nu",
        accentR: 0.24, accentG: 0.92, accentB: 0.68,
        visualKind: "bi",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "devices",
        pillLeft: "nu.devices · wear the post-quantum set",
        pillRight: "Cost + labour + 10%",
        badge: "GLASSES · EARS · RING · BROOCH · NECKLACE · SHIELD",
        h1: "nu.devices",
        h2: "Wear the set.",
        h3: "Set with ñü.isheru.",
        cardTitle: "7 post-quantum pieces · Same chips as suñůlink.shield",
        cardSub: "Glasses, ears, ring, brooch, necklace, bracelet & transceiver shield",
        cardGreen: "Transparent pricing: cost + labour + 10% · Full recycle",
        cta: "EXPLORE NU.DEVICES · devices.khensu.nu",
        accentR: 0.85, accentG: 0.72, accentB: 0.45,
        visualKind: "devices",
        imgPath: "\(site)/public/khensu/stones/inlay-standard.png"
    ),
    CardSpec(
        slug: "eyes",
        pillLeft: "ñü.êýêš · clear autodim AR glasses",
        pillRight: "4K Cams · Jawbone · EEG",
        badge: "CLEAR GLASS · BUTTON FOR THE SUN · ON-DEVICE AI",
        h1: "ñü.êýêš",
        h2: "Clear glass.",
        h3: "Button for the sun.",
        cardTitle: "ñü.êýêš · Electrochromic dim + quiet sensing",
        cardSub: "4K cameras, jawbone mic, non-invasive EEG & bone conduction",
        cardGreen: "Part of nu.devices · Same post-quantum chips as the shield",
        cta: "SEE ÑÜ.ÊÝÊŠ · eyes.khensu.nu",
        accentR: 0.35, accentG: 0.85, accentB: 1.00,
        visualKind: "eyes",
        imgPath: "\(site)/public/khensu/stones/inlay-standard.png"
    ),
    CardSpec(
        slug: "nufi",
        pillLeft: "ñũ.Fî · post-quantum private finance",
        pillRight: "$10 / 1,000 plays · 0% cut",
        badge: "SHIELDED POOL · STARK PROOFS · PRIVATE PAYMENTS",
        h1: "ñũ.Fî",
        h2: "A basic income first.",
        h3: "Private, with no cut.",
        cardTitle: "Creators paid for every view · Nodes for every job",
        cardSub: "Post-quantum shielded pool settled on device with zero middlemen",
        cardGreen: "100% of tips to the person · Flat 10% app commerce",
        cta: "OPEN ÑŨ.FÎ · fi.khensu.nu",
        accentR: 0.18, accentG: 0.94, accentB: 0.74,
        visualKind: "nufi",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "app",
        pillLeft: "get.apps · khėnsu.ñü for iPhone, iPad & Mac",
        pillRight: "iOS 26 · macOS 26",
        badge: "POST-QUANTUM MESSENGER · MIXNET · ON-DEVICE AI",
        h1: "khėnsu.ñü",
        h2: "For iPhone, iPad",
        h3: "and Mac.",
        cardTitle: "Messages, calls, feeds, sites & private payments",
        cardSub: "ML-KEM-1024 + ML-DSA-87 · 5-hop Outfox mixnet · Liquid Glass",
        cardGreen: "Nothing on servers · No Siri · No iCloud · 100% on device",
        cta: "GET THE APPS · get.apps.khensu.nu",
        accentR: 0.43, accentG: 0.97, accentB: 0.84,
        visualKind: "app",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "design-quantumglass",
        pillLeft: "nu.glass · Quantum × Liquid Glass",
        pillRight: "design.quantumglass.khensu.nu",
        badge: "CLEAR NUMBER-LIGHT BUBBLE EXPLOSION · NU.AURA",
        h1: "nu.glass",
        h2: "Quantum ×",
        h3: "Liquid Glass.",
        cardTitle: "See-through specular film · Rim refraction · Aura flow",
        cardSub: "Apple iOS 26 Liquid Glass paired with khėnsu.ñü number-light bubbles",
        cardGreen: "Live across nu.waves, Kronos & nu.aura",
        cta: "EXPLORE NU.GLASS · design.quantumglass.khensu.nu",
        accentR: 0.52, accentG: 0.82, accentB: 1.00,
        visualKind: "glass",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "kronos",
        pillLeft: "Kronos · agent brain + partner",
        pillRight: "nu.harness × nu.ot.222",
        badge: "PAIR-LOCKED HARNESS · OUT OF TOWN THU 2:00 / 2:22",
        h1: "Kronos",
        h2: "harness × OT ·",
        h3: "one breath.",
        cardTitle: "Always-live HTTPS · Publish now · Dead-man’s switch",
        cardSub: "Both skills required together — lone skill fires KRONOS_PAIR_ERROR",
        cardGreen: "100% uptime SLA · Venice CA · kronos.khensu.nu",
        cta: "OPEN KRONOS DESK · kronos.khensu.nu",
        accentR: 0.69, accentG: 0.49, accentB: 1.00,
        visualKind: "kronos",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "media",
        pillLeft: "ñü.media · learned Neural Engine codec",
        pillRight: "90% fewer bytes",
        badge: "PHOTOS · 4K VIDEO · SPATIAL AUDIO · ZERO HALLUCINATION",
        h1: "ñü.media",
        h2: "Same look,",
        h3: "a fraction of the bits.",
        cardTitle: "Measured against JPEG, HEIC, H.264, HEVC & AV1",
        cardSub: "Integer entropy model on CPU + FP16 synthesis on Apple Neural Engine",
        cardGreen: "Progressive 2 KB first-tick preview · Strips camera fingerprint",
        cta: "SEE THE BENCHMARKS · media.khensu.nu",
        accentR: 0.24, accentG: 0.90, accentB: 0.82,
        visualKind: "media",
        imgPath: "\(site)/public/khensu/creators/compare-nu.webp"
    ),
    CardSpec(
        slug: "memory",
        pillLeft: "ñü.řåł · private on-device AI & memory",
        pillRight: "memory.khensu.nu",
        badge: "INDRA’S NET GRAPH · ZERO CLOUD · ~ COMMANDS",
        h1: "ñü.řåł",
        h2: "Your private AI.",
        h3: "On your device only.",
        cardTitle: "KhensuMemory index engine · Local Neural Engine LLM",
        cardSub: "Remembers what you look forward to without ever phoning home",
        cardGreen: "No Siri · No Private Cloud Compute · No telemetry",
        cta: "EXPLORE ÑÜ.ŘÅŁ · memory.khensu.nu",
        accentR: 0.78, accentG: 0.56, accentB: 1.00,
        visualKind: "memory",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "moments",
        pillLeft: "ñü.mømëntš · on-device creator editor",
        pillRight: "Beat Sync · Carousels",
        badge: "TEMPLATES · BEAT SYNC · CAPTIONS · ZERO UPLOAD",
        h1: "ñü.mømëntš",
        h2: "Boost the moments",
        h3: "you actually keep.",
        cardTitle: "Beat sync studio, designer templates & scrapbook carousels",
        cardSub: "Shot cuts, subject lift & Apple Speech captions on your Neural Engine",
        cardGreen: "Nobody else sees your clips · Tips 100% to the creator",
        cta: "OPEN ÑÜ.MØMËNTŠ · moments.khensu.nu",
        accentR: 0.94, accentG: 0.66, accentB: 0.78,
        visualKind: "moments",
        imgPath: "\(site)/public/khensu/creators/fans-1080.webp"
    ),
    CardSpec(
        slug: "network",
        pillLeft: "ñü.ñetwork · people-run post-quantum network",
        pillRight: "network.khensu.nu",
        badge: "5-HOP OUTFOX MIXNET · WORK RECEIPTS · SHIELDED POOL",
        h1: "ñü.ñetwork",
        h2: "A gift to humanity",
        h3: "and all beings.",
        cardTitle: "Mac & Raspberry Pi 5 nodes (`nu.khensu.tatenan`)",
        cardSub: "Paid at one worldwide rate for proofs, storage, renditions & relays",
        cardGreen: "Founder handover active · Consensus-owned forever",
        cta: "EXPLORE THE NETWORK · network.khensu.nu",
        accentR: 0.35, accentG: 0.92, accentB: 0.78,
        visualKind: "network",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "skills-music-theory",
        pillLeft: "skills.music.theory · live code & audio",
        pillRight: "nu.waves × nu.media",
        badge: "NOTES · INTERVALS · CHORDS · LIVE TIDAL PATTERNS",
        h1: "music.theory",
        h2: "Hear the note,",
        h3: "write the pattern.",
        cardTitle: "Music theory as live code for nu.waves, nu.media & ñü.řåł",
        cardSub: "Animated intervals, chord geometry, beat sync & 3D stem remixing",
        cardGreen: "Interactive shorthand that looks and moves like the music",
        cta: "LEARN MUSIC THEORY · skills.music.theory.khensu.nu",
        accentR: 0.49, accentG: 0.78, accentB: 1.00,
        visualKind: "music",
        imgPath: nil
    ),
    CardSpec(
        slug: "sla",
        pillLeft: "sla.khensu.nu · 100% uptime + dead-man’s switch",
        pillRight: "ACTIVE · Venice CA",
        badge: "FOUNDER HANDOVER FIRED 14 OCT 2026 · 2:22 PM PDT",
        h1: "100% SLA",
        h2: "Dead-man’s switch",
        h3: "active for humanity.",
        cardTitle: "Weekly keep-alive · 42-day silence releases all sealed escrow",
        cardSub: "Every commit, release & patent opens to nodes, press & Internet Archive",
        cardGreen: "Consensus-governed · Permanent gift to all beings",
        cta: "VERIFY LIVE SLA · sla.khensu.nu",
        accentR: 0.24, accentG: 0.96, accentB: 0.65,
        visualKind: "sla",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "vegan",
        pillLeft: "nu.vegan · plant-only kitchen by Elliott",
        pillRight: "vegan.khensu.nu",
        badge: "100% PLANT-BASED · WHOLE FOODS · COMPOST :-)",
        h1: "nu.vegan",
        h2: "Plant only.",
        h3: "Nourish every being.",
        cardTitle: "Elliott’s dishes, elixirs, bowls & Venice kitchen notes",
        cardSub: "Zero animal products, clean ingredients, high-frequency nourishment",
        cardGreen: "Don’t forget to compost :-) · vegan.khensu.nu",
        cta: "OPEN NU.VEGAN · vegan.khensu.nu",
        accentR: 0.32, accentG: 0.92, accentB: 0.52,
        visualKind: "vegan",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "void",
        pillLeft: "ñü.vœîð · post-quantum stealth bag",
        pillRight: "64 KiB · ñü.fêět",
        badge: "64 KIB CHUNKS · ONE KEY EACH · 8 COPIES · NO FILE NAMES",
        h1: "ñü.vœîð",
        h2: "64 KiB chunks.",
        h3: "One key each.",
        cardTitle: "Trailing ñü.fêět footer inside the ciphertext",
        cardSub: "Eight copies across the network · A wrong key opens nothing",
        cardGreen: "Stealth storage on khėnsu.ñü · void.khensu.nu",
        cta: "EXPLORE ÑÜ.VŒÎÐ · void.khensu.nu",
        accentR: 0.58, accentG: 0.52, accentB: 1.00,
        visualKind: "void",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "webe",
        pillLeft: "webË · a people-run post-quantum internet",
        pillRight: "webe:// · WEBE.md",
        badge: "NAMES · SITES · FEEDS · PAYMENTS · STARK CONTRACTS",
        h1: "webË",
        h2: "A people-run",
        h3: "internet.",
        cardTitle: "Permanent handles (`name.khensu.nu`) over the mixnet",
        cardSub: "Two-relay stealth fetch · Self-enforcing STARK contracts · nu:preview",
        cardGreen: "Run a node on Mac or Raspberry Pi 5 · webe.khensu.nu",
        cta: "EXPLORE WEBË · webe.khensu.nu",
        accentR: 0.43, accentG: 0.97, accentB: 0.84,
        visualKind: "webe",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "compliance",
        pillLeft: "compliance.khensu.nu · GDPR & global privacy",
        pillRight: "FIPS 203 · FIPS 204",
        badge: "CNSA 2.0 · GDPR · CCPA · ZERO SERVER DATA",
        h1: "Compliance",
        h2: "GDPR & every major",
        h3: "privacy law by design.",
        cardTitle: "Nothing on servers to request, breach or hand over",
        cardSub: "NIST FIPS 203 (ML-KEM-1024) & FIPS 204 (ML-DSA-87) post-quantum suite",
        cardGreen: "Architectural compliance by mathematical construction",
        cta: "READ COMPLIANCE · compliance.khensu.nu",
        accentR: 0.38, accentG: 0.84, accentB: 0.98,
        visualKind: "compliance",
        imgPath: "\(site)/public/seal-512.png"
    ),
    CardSpec(
        slug: "security",
        pillLeft: "security.khensu.nu · post-quantum cryptography",
        pillRight: "ML-KEM-1024 · ML-DSA-87",
        badge: "PURE POST-QUANTUM · 5-HOP MIXNET · 5-MINUTE KEY ROTATION",
        h1: "Security",
        h2: "Nothing to read.",
        h3: "Post-quantum only.",
        cardTitle: "MLS_256_MLKEM1024_AES256GCM_SHA512_MLDSA87",
        cardSub: "Signatures inside ciphertext only · Keys rotate every 5 min or 1,000 msgs",
        cardGreen: "Formal Tamarin proofs · Key transparency log over mixnet",
        cta: "READ SECURITY · security.khensu.nu",
        accentR: 0.43, accentG: 0.97, accentB: 0.84,
        visualKind: "security",
        imgPath: "\(site)/public/seal-512.png"
    ),
]

func font(_ size: CGFloat, bold: Bool = false) -> NSFont {
    return NSFont.systemFont(ofSize: size, weight: bold ? .bold : .medium)
}

func drawText(_ str: String, x: CGFloat, yTop: CGFloat, H: CGFloat, f: NSFont, color: NSColor) {
    let attrs: [NSAttributedString.Key: Any] = [.font: f, .foregroundColor: color]
    let ns = NSString(string: str)
    let sz = ns.size(withAttributes: attrs)
    ns.draw(at: NSPoint(x: x, y: H - yTop - sz.height), withAttributes: attrs)
}

func roundedRect(_ ctx: CGContext, x: CGFloat, yTop: CGFloat, w: CGFloat, h: CGFloat, r: CGFloat, H: CGFloat, fill: NSColor?, stroke: NSColor?, lineWidth: CGFloat = 1) {
    let rect = CGRect(x: x, y: H - yTop - h, width: w, height: h)
    let path = CGPath(roundedRect: rect, cornerWidth: r, cornerHeight: r, transform: nil)
    if let fill = fill {
        ctx.setFillColor(fill.cgColor)
        ctx.addPath(path)
        ctx.fillPath()
    }
    if let stroke = stroke {
        ctx.setStrokeColor(stroke.cgColor)
        ctx.setLineWidth(lineWidth)
        ctx.addPath(path)
        ctx.strokePath()
    }
}

var imageCache: [String: NSImage] = [:]
func loadImg(_ path: String?) -> NSImage? {
    guard let p = path else { return nil }
    if let cached = imageCache[p] { return cached }
    if let im = NSImage(contentsOfFile: p) {
        imageCache[p] = im
        return im
    }
    return nil
}

let earthBg = loadImg("\(site)/public/khensu/hero/earth.jpg")
let auraBg = loadImg("\(site)/public/khensu/aura/legacy.aura.jpg")

func renderCard(spec: CardSpec, W: Int, H: Int, tNorm: CGFloat, outPng: String) {
    autoreleasepool {
        let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H,
            bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
            colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
        )!
        NSGraphicsContext.saveGraphicsState()
        let nsCtx = NSGraphicsContext(bitmapImageRep: rep)!
        NSGraphicsContext.current = nsCtx
        let ctx = nsCtx.cgContext
        let wf = CGFloat(W), hf = CGFloat(H)
        let isSquare = (W == H)

        ctx.setFillColor(NSColor(calibratedRed: 0.024, green: 0.035, blue: 0.065, alpha: 1.0).cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: wf, height: hf))

        let bgImg = (spec.slug == "aura") ? (auraBg ?? earthBg) : earthBg
        if let bg = bgImg {
            bg.draw(in: CGRect(x: 0, y: 0, width: wf, height: hf), from: .zero, operation: .sourceOver, fraction: spec.slug == "aura" ? 0.34 : 0.26)
        }

        let veilColors = [
            NSColor(calibratedRed: 0.02, green: 0.03, blue: 0.06, alpha: 0.90).cgColor,
            NSColor(calibratedRed: 0.02, green: 0.03, blue: 0.06, alpha: 0.62).cgColor,
            NSColor(calibratedRed: 0.02, green: 0.03, blue: 0.06, alpha: 0.78).cgColor,
        ] as CFArray
        if let vGrad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: veilColors, locations: [0.0, 0.55, 1.0]) {
            ctx.drawLinearGradient(vGrad, start: CGPoint(x: 0, y: hf * 0.5), end: CGPoint(x: wf, y: hf * 0.5), options: [])
        }

        let accent = NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 1.0)
        let cx: CGFloat = isSquare ? wf * 0.50 : wf * 0.735
        let cyTop: CGFloat = isSquare ? hf * 0.42 : hf * 0.52
        let cy: CGFloat = hf - cyTop
        let R: CGFloat = isSquare ? wf * 0.295 : hf * 0.38

        let glowColors = [
            NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.28).cgColor,
            NSColor(calibratedRed: 0.42, green: 0.42, blue: 1.0, alpha: 0.09).cgColor,
            NSColor(calibratedRed: 0.02, green: 0.03, blue: 0.06, alpha: 0.0).cgColor,
        ] as CFArray
        if let rGrad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: glowColors, locations: [0.0, 0.55, 1.0]) {
            ctx.drawRadialGradient(rGrad, startCenter: CGPoint(x: cx, y: cy), startRadius: 4, endCenter: CGPoint(x: cx, y: cy), endRadius: R * 1.42, options: [])
        }

        ctx.setStrokeColor(NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.68).cgColor)
        ctx.setLineWidth(2.2)
        ctx.strokeEllipse(in: CGRect(x: cx - R, y: cy - R, width: R * 2, height: R * 2))

        ctx.setStrokeColor(NSColor(calibratedWhite: 1.0, alpha: 0.20).cgColor)
        ctx.setLineWidth(1.1)
        ctx.strokeEllipse(in: CGRect(x: cx - R * 0.90, y: cy - R * 0.90, width: R * 1.80, height: R * 1.80))
        ctx.strokeEllipse(in: CGRect(x: cx - R, y: cy - R * 0.32, width: R * 2, height: R * 0.64))
        ctx.strokeEllipse(in: CGRect(x: cx - R * 0.34, y: cy - R, width: R * 0.68, height: R * 2))

        for i in 0..<110 {
            let phi = CGFloat(i) * 2.3999632 + tNorm * .pi * 2
            let u = CGFloat((i * 73) % 100) / 100.0
            let rad = R * 0.88 * sqrt(u)
            let px = cx + cos(phi) * rad
            let py = cy + sin(phi * 1.13) * rad * 0.88
            let pCol = (i % 2 == 0)
                ? NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.55)
                : NSColor(calibratedRed: 0.55, green: 0.78, blue: 1.0, alpha: 0.45)
            ctx.setFillColor(pCol.cgColor)
            let pr: CGFloat = (i % 3 == 0) ? 2.4 : 1.6
            ctx.fillEllipse(in: CGRect(x: px - pr, y: py - pr, width: pr * 2, height: pr * 2))
        }

        if let mainImg = loadImg(spec.imgPath) {
            let pulse = 1.0 + 0.045 * sin(tNorm * .pi * 2)
            let imgR = R * (spec.slug == "aura" || spec.slug == "devices" || spec.slug == "eyes" ? 0.58 : 0.52) * pulse
            let imgRect = CGRect(x: cx - imgR, y: cy - imgR, width: imgR * 2, height: imgR * 2)
            mainImg.draw(in: imgRect, from: .zero, operation: .sourceOver, fraction: 0.96)
        }

        let nodeLabels: [(String, CGFloat, CGFloat, CGFloat)] = {
            switch spec.slug {
            case "aura":
                return [
                    ("$444 Set", 0.12, 0.56, 1.0),
                    ("$44k Emerald", 0.13, 0.96, 0.60),
                    ("$4.4m Diamond", 0.92, 0.96, 1.0),
                    ("$44m Moldavite", 0.42, 1.0, 0.29),
                    ("Lapis", 0.25, 0.52, 1.0),
                    ("Bloodstone", 1.0, 0.32, 0.36),
                    ("Labradorite", 0.38, 0.88, 0.96),
                    ("Platinum", 0.90, 0.92, 0.96),
                ]
            case "avatars":
                return [
                    ("Ink", 0.95, 0.95, 0.98),
                    ("Toon", 1.0, 0.58, 0.28),
                    ("Pixel", 0.24, 0.94, 0.68),
                    ("Glass", 0.45, 0.82, 1.0),
                    ("3D Mesh", 0.72, 0.52, 1.0),
                    ("AR Ready", 0.18, 0.92, 0.78),
                ]
            case "moments":
                return [
                    ("Beat Sync", 0.94, 0.66, 0.78),
                    ("Templates", 0.49, 0.88, 0.78),
                    ("Carousels", 0.55, 0.78, 1.0),
                    ("Captions", 1.0, 0.82, 0.35),
                    ("Matte Lift", 0.75, 0.56, 1.0),
                    ("On Device", 0.24, 0.94, 0.68),
                ]
            case "skills-music-theory":
                return [
                    ("Root · I", 1.0, 0.32, 0.36),
                    ("Third · iii", 1.0, 0.78, 0.28),
                    ("Fifth · V", 0.24, 0.94, 0.68),
                    ("Seventh · vii°", 0.38, 0.78, 1.0),
                    ("Octave · 2:1", 0.75, 0.52, 1.0),
                    ("Tidal ~", 0.18, 0.92, 0.82),
                ]
            default:
                return [
                    ("ML-KEM-1024", spec.accentR, spec.accentG, spec.accentB),
                    ("ML-DSA-87", 0.49, 0.78, 1.0),
                    ("Mixnet 5-Hop", 0.69, 0.49, 1.0),
                    ("On-Device", 0.24, 0.94, 0.68),
                    ("Shielded", 1.0, 0.78, 0.35),
                    ("100% SLA", 0.18, 0.92, 0.82),
                ]
            }
        }()

        let nCount = nodeLabels.count
        let lblFont = font(isSquare ? 13 : 12, bold: true)
        var pts: [(CGFloat, CGFloat, String, CGFloat, CGFloat, CGFloat)] = []
        for (idx, item) in nodeLabels.enumerated() {
            let baseAng = (CGFloat(idx) / CGFloat(nCount)) * .pi * 2
            let theta = baseAng + tNorm * .pi * 2
            let rx = cos(theta) * R * 0.78
            let ry = sin(theta) * R * 0.72
            pts.append((cx + rx, cy + ry, item.0, item.1, item.2, item.3))
        }

        for i in 0..<pts.count {
            let p1 = pts[i]
            let p2 = pts[(i + 1) % pts.count]
            ctx.setStrokeColor(NSColor(calibratedRed: p1.3, green: p1.4, blue: p1.5, alpha: 0.42).cgColor)
            ctx.setLineWidth(1.5)
            ctx.move(to: CGPoint(x: p1.0, y: p1.1))
            ctx.addLine(to: CGPoint(x: p2.0, y: p2.1))
            ctx.strokePath()
        }

        for (idx, p) in pts.enumerated() {
            let pulse = 1.0 + 0.14 * sin(tNorm * .pi * 4 + CGFloat(idx))
            let nr: CGFloat = 11.5 * pulse
            ctx.setFillColor(NSColor(calibratedRed: p.3, green: p.4, blue: p.5, alpha: 0.25).cgColor)
            ctx.fillEllipse(in: CGRect(x: p.0 - nr - 6, y: p.1 - nr - 6, width: (nr + 6) * 2, height: (nr + 6) * 2))
            ctx.setFillColor(NSColor(calibratedRed: p.3, green: p.4, blue: p.5, alpha: 0.96).cgColor)
            ctx.fillEllipse(in: CGRect(x: p.0 - nr, y: p.1 - nr, width: nr * 2, height: nr * 2))
            ctx.setStrokeColor(NSColor.white.cgColor)
            ctx.setLineWidth(1.6)
            ctx.strokeEllipse(in: CGRect(x: p.0 - nr, y: p.1 - nr, width: nr * 2, height: nr * 2))
            drawText(p.2, x: p.0 + nr + 6, yTop: hf - p.1 - 7, H: hf, f: lblFont, color: NSColor(calibratedWhite: 0.96, alpha: 0.94))
        }

        roundedRect(ctx, x: 38, yTop: 26, w: wf - 76, h: 40, r: 20, H: hf,
                    fill: NSColor(calibratedRed: 0.06, green: 0.09, blue: 0.15, alpha: 0.88),
                    stroke: NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.42), lineWidth: 1.2)
        ctx.setFillColor(accent.cgColor)
        ctx.fillEllipse(in: CGRect(x: 54, y: hf - 51, width: 10, height: 10))
        drawText(spec.pillLeft, x: 74, yTop: 36, H: hf, f: font(15, bold: true), color: .white)
        drawText(spec.pillRight, x: wf - 295, yTop: 36, H: hf, f: font(15, bold: true), color: accent)

        if !isSquare {
            roundedRect(ctx, x: 42, yTop: 88, w: 390, h: 28, r: 14, H: hf,
                        fill: NSColor(calibratedRed: 0.06, green: 0.14, blue: 0.18, alpha: 0.90),
                        stroke: NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.55), lineWidth: 1.2)
            drawText(spec.badge, x: 56, yTop: 95, H: hf, f: font(11.5, bold: true), color: accent)

            let hFont = font(35, bold: true)
            drawText(spec.h1, x: 42, yTop: 130, H: hf, f: hFont, color: .white)
            drawText(spec.h2, x: 42, yTop: 173, H: hf, f: hFont, color: accent)
            drawText(spec.h3, x: 42, yTop: 216, H: hf, f: hFont, color: accent)

            roundedRect(ctx, x: 42, yTop: 282, w: 496, h: 164, r: 20, H: hf,
                        fill: NSColor(calibratedRed: 0.055, green: 0.08, blue: 0.14, alpha: 0.92),
                        stroke: NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.38), lineWidth: 1.2)
            drawText(spec.cardTitle, x: 64, yTop: 304, H: hf, f: font(20, bold: true), color: .white)
            drawText(spec.cardSub, x: 64, yTop: 336, H: hf, f: font(13.5, bold: false), color: NSColor(calibratedWhite: 0.80, alpha: 1.0))
            drawText(spec.cardGreen, x: 64, yTop: 364, H: hf, f: font(13.5, bold: true), color: accent)

            roundedRect(ctx, x: 64, yTop: 412, w: 450, h: 9, r: 4.5, H: hf,
                        fill: NSColor(calibratedRed: 0.14, green: 0.19, blue: 0.28, alpha: 1.0), stroke: nil)
            let progW: CGFloat = 150 + 210 * (0.5 + 0.5 * sin(tNorm * .pi * 2))
            roundedRect(ctx, x: 64, yTop: 412, w: progW, h: 9, r: 4.5, H: hf, fill: accent, stroke: nil)

            roundedRect(ctx, x: 42, yTop: 526, w: 540, h: 54, r: 27, H: hf, fill: accent, stroke: nil)
            drawText(spec.cta, x: 66, yTop: 544, H: hf, f: font(15, bold: true), color: NSColor(calibratedRed: 0.03, green: 0.06, blue: 0.09, alpha: 1.0))
        } else {
            roundedRect(ctx, x: 64, yTop: 790, w: wf - 128, h: 150, r: 22, H: hf,
                        fill: NSColor(calibratedRed: 0.055, green: 0.08, blue: 0.14, alpha: 0.92),
                        stroke: NSColor(calibratedRed: spec.accentR, green: spec.accentG, blue: spec.accentB, alpha: 0.48), lineWidth: 1.6)
            drawText("\(spec.h1) · \(spec.h2) \(spec.h3)", x: 92, yTop: 812, H: hf, f: font(26, bold: true), color: .white)
            drawText(spec.cardSub, x: 92, yTop: 854, H: hf, f: font(17, bold: false), color: NSColor(calibratedWhite: 0.82, alpha: 1.0))
            drawText(spec.cardGreen, x: 92, yTop: 890, H: hf, f: font(17, bold: true), color: accent)

            roundedRect(ctx, x: 64, yTop: 966, w: wf - 128, h: 64, r: 32, H: hf, fill: accent, stroke: nil)
            drawText(spec.cta, x: 110, yTop: 987, H: hf, f: font(19, bold: true), color: NSColor(calibratedRed: 0.03, green: 0.06, blue: 0.09, alpha: 1.0))
        }

        NSGraphicsContext.restoreGraphicsState()
        if let data = rep.representation(using: .png, properties: [:]) {
            try? data.write(to: URL(fileURLWithPath: outPng))
        }
    }
}

func runCmd(_ args: [String]) {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    p.arguments = args
    try! p.run()
    p.waitUntilExit()
}

let frames = 48 // 3.0s @ 16fps -> ultra crisp, fast, <400KB per MP4
let only = Set(CommandLine.arguments.dropFirst())
for spec in specs where only.isEmpty || only.contains(spec.slug) {
    try? FileManager.default.removeItem(atPath: tmpDir)
    let wdir = "\(tmpDir)/wide"
    let sdir = "\(tmpDir)/square"
    try? FileManager.default.createDirectory(atPath: wdir, withIntermediateDirectories: true)
    try? FileManager.default.createDirectory(atPath: sdir, withIntermediateDirectories: true)

    for f in 0..<frames {
        let t = CGFloat(f) / CGFloat(frames)
        renderCard(spec: spec, W: 1200, H: 630, tNorm: t, outPng: String(format: "%@/%04d.png", wdir, f))
        renderCard(spec: spec, W: 1080, H: 1080, tNorm: t, outPng: String(format: "%@/%04d.png", sdir, f))
    }

    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-i", "\(wdir)/0012.png", "-q:v", "3", "\(pubOg)/\(spec.slug).jpg"])
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-i", "\(sdir)/0012.png", "-q:v", "3", "\(pubOg)/\(spec.slug)-square.jpg"])
    runCmd(["cp", "\(pubOg)/\(spec.slug)-square.jpg", "\(instaDir)/\(spec.slug)-square.jpg"])
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "16", "-i", "\(wdir)/%04d.png", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast", "-movflags", "+faststart", "-an", "\(pubOg)/\(spec.slug).mp4"])
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "16", "-i", "\(sdir)/%04d.png", "-c:v", "libx265", "-tag:v", "hvc1", "-pix_fmt", "yuv420p", "-crf", "25", "-preset", "ultrafast", "-movflags", "+faststart", "-an", "\(pubOg)/\(spec.slug)-square.mp4"])
    runCmd(["cp", "\(pubOg)/\(spec.slug)-square.mp4", "\(instaDir)/\(spec.slug)-square.mp4"])
    try? FileManager.default.removeItem(atPath: tmpDir)
    print("Completed \(spec.slug)")
}
