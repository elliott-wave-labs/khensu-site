// Indra cards for bi, create and the violet flame, including every section link.
// Earth, a turning net, and the section's own words. No phone, no fake button chrome.
// Landscape H.264 is og:video. Square HEVC is nu:preview.
// Usage: swift tools/og-sections.swift [slug ...] && python3 tools/og-previews.py slug ...
import AppKit
import CoreGraphics
import CoreText
import Foundation

let site = "/Users/elliott/Documents/GitHub/khensu/khensu-site/sites/khensu-nu"
let pubOg = "\(site)/public/og"
let instaDir = "\(NSHomeDirectory())/Desktop/khensu-instagram"
let tmpRoot = "/tmp/khensu-section-og"
let jsonPath = "\(site)/src/data/og-sections.json"

try? FileManager.default.createDirectory(atPath: pubOg, withIntermediateDirectories: true)
try? FileManager.default.createDirectory(atPath: instaDir, withIntermediateDirectories: true)

struct Spec: Decodable {
    let slug: String
    let render: Bool
    let eyebrow: String
    let beats: [String]
    let kind: String
    let accent: [Double]
    let foot: String
    let figures: [String]?
}

let specs = try JSONDecoder().decode([Spec].self, from: Data(contentsOf: URL(fileURLWithPath: jsonPath)))
let earth = NSImage(contentsOfFile: "\(site)/public/khensu/hero/earth.jpg")

func clamp(_ x: CGFloat, _ a: CGFloat = 0, _ b: CGFloat = 1) -> CGFloat { min(b, max(a, x)) }
func smooth(_ x: CGFloat) -> CGFloat {
    let t = clamp(x)
    return t * t * (3 - 2 * t)
}

for name in [
    "/System/Library/Fonts/Supplemental/SF-Pro-Display-Bold.otf",
    "/System/Library/Fonts/SFNS.ttf",
] {
    CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: name) as CFURL, .process, nil)
}

func ctFont(_ size: CGFloat, bold: Bool) -> CTFont {
    let want = bold ? "SFProDisplay-Bold" : "SFProDisplay-Regular"
    let probe = CTFontCreateWithName(want as CFString, size, nil)
    let ps = CTFontCopyPostScriptName(probe) as String
    if ps.lowercased().contains("sf") { return probe }
    return CTFontCreateWithName((bold ? "Helvetica-Bold" : "Helvetica") as CFString, size, nil)
}

func font(_ size: CGFloat, bold: Bool) -> NSFont {
    let ps = CTFontCopyPostScriptName(ctFont(size, bold: bold)) as String
    return NSFont(name: ps, size: size) ?? (bold ? NSFont.boldSystemFont(ofSize: size) : NSFont.systemFont(ofSize: size))
}

func drawLines(_ text: String, ctx: CGContext, midX: CGFloat, midY: CGFloat, maxW: CGFloat, maxSize: CGFloat, color: NSColor, bold: Bool) {
    let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
    let n = max(1, lines.count)
    var size = maxSize
    func make(_ s: CGFloat) -> [(CTLine, CGRect)] {
        let f = ctFont(s, bold: bold)
        return lines.map { line in
            let attrs: [CFString: Any] = [
                kCTFontAttributeName: f,
                kCTForegroundColorAttributeName: color.cgColor,
            ]
            let ln = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, line as CFString, attrs as CFDictionary)!)
            return (ln, CTLineGetBoundsWithOptions(ln, [.useGlyphPathBounds]))
        }
    }
    var drawn = make(size)
    let widest = drawn.map(\.1.width).max() ?? 1
    if widest > maxW {
        size *= maxW / widest
        drawn = make(size)
    }
    let lh = size * 1.05
    let total = lh * CGFloat(n)
    var y = midY + total / 2 - size * 0.15
    ctx.textMatrix = .identity
    for (ln, bounds) in drawn {
        y -= lh
        ctx.textPosition = CGPoint(x: midX - bounds.width / 2 - bounds.origin.x, y: y)
        CTLineDraw(ln, ctx)
    }
}

func beatIndex(_ t: CGFloat, _ n: Int) -> (Int, CGFloat) {
    let count = max(1, n)
    let slot = t * CGFloat(count)
    let i = min(count - 1, Int(slot))
    let local = slot - CGFloat(i)
    return (i, local)
}

func paintBed(ctx: CGContext, spec: Spec, wf: CGFloat, hf: CGFloat, t: CGFloat, square: Bool) {
    ctx.setFillColor(NSColor(calibratedRed: 0.015, green: 0.02, blue: 0.04, alpha: 1).cgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: wf, height: hf))
    if let earth = earth {
        let spin = t * CGFloat.pi * 2
        let z = 1.12 + 0.05 * sin(spin)
        let dw = wf * z
        let dh = hf * z * 1.15
        let drift: CGFloat = square ? 12 : 28
        let ox = (wf - dw) / 2 + sin(spin) * drift
        let oy = (hf - dh) / 2 + cos(spin) * 10
        let frac: CGFloat = spec.kind == "flame" ? 0.22 : 0.34
        earth.draw(in: CGRect(x: ox, y: oy, width: dw, height: dh), from: .zero, operation: .sourceOver, fraction: frac)
    }
    let veil = [
        NSColor(calibratedRed: 0.01, green: 0.015, blue: 0.03, alpha: 0.55).cgColor,
        NSColor(calibratedRed: 0.02, green: 0.02, blue: 0.05, alpha: 0.72).cgColor,
        NSColor(calibratedRed: 0.01, green: 0.01, blue: 0.03, alpha: 0.88).cgColor,
    ] as CFArray
    let locs: [CGFloat] = [0, 0.45, 1]
    if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: veil, locations: locs) {
        ctx.drawLinearGradient(g, start: CGPoint(x: wf, y: hf), end: CGPoint(x: 0, y: 0), options: [])
    }
}

func paintGlow(ctx: CGContext, spec: Spec, cx: CGFloat, cy: CGFloat, R: CGFloat, t: CGFloat) {
    let ar = spec.accent[0]
    let ag = spec.accent[1]
    let ab = spec.accent[2]
    if spec.kind == "flame" {
        let glow = [
            NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: 0.55).cgColor,
            NSColor(calibratedRed: 0.95, green: 0.75, blue: 1, alpha: 0.18).cgColor,
            NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: 0).cgColor,
        ] as CFArray
        let locs: [CGFloat] = [0, 0.35, 1]
        if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: glow, locations: locs) {
            let lift = 18 * sin(t * CGFloat.pi * 2)
            ctx.drawRadialGradient(
                g,
                startCenter: CGPoint(x: cx, y: cy - R * 0.15 + lift),
                startRadius: 0,
                endCenter: CGPoint(x: cx, y: cy + lift),
                endRadius: R * 1.35,
                options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
            )
        }
        for i in 0..<28 {
            let rise = (t + CGFloat(i) / 28).truncatingRemainder(dividingBy: 1)
            let wob = sin(CGFloat(i) * 1.7 + t * CGFloat.pi * 4) * R * 0.12
            let x = cx + wob + sin(CGFloat(i)) * R * 0.28
            let y = cy - R * 0.45 + rise * R * 1.15
            let rad = (1 - rise) * (10 + CGFloat(i % 5) * 3)
            let alpha = (1 - rise) * 0.55
            ctx.setFillColor(NSColor(calibratedRed: 0.82 + ar * 0.1, green: 0.55, blue: 1, alpha: alpha).cgColor)
            ctx.fillEllipse(in: CGRect(x: x - rad, y: y - rad, width: rad * 2, height: rad * 2))
        }
    } else {
        let glow = [
            NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: 0.42).cgColor,
            NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: 0.08).cgColor,
        ] as CFArray
        let locs: [CGFloat] = [0, 1]
        if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: glow, locations: locs) {
            ctx.drawRadialGradient(g, startCenter: CGPoint(x: cx, y: cy), startRadius: 0, endCenter: CGPoint(x: cx, y: cy), endRadius: R * 1.25, options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
        }
    }
}

func paintNet(ctx: CGContext, spec: Spec, cx: CGFloat, cy: CGFloat, R: CGFloat, t: CGFloat) {
    let ar = spec.accent[0]
    let ag = spec.accent[1]
    let ab = spec.accent[2]
    let jewels = spec.kind == "ladder" ? max(5, spec.figures?.count ?? 6) : 8
    var pts: [CGPoint] = []
    let spin = t * CGFloat.pi * 2 * 0.35
    for i in 0..<jewels {
        let a = (CGFloat(i) / CGFloat(jewels)) * CGFloat.pi * 2 - CGFloat.pi / 2 + spin
        pts.append(CGPoint(x: cx + cos(a) * R, y: cy + sin(a) * R * 0.92))
    }
    ctx.setLineWidth(1.15)
    let linkAlpha: CGFloat = spec.kind == "flame" ? 0.16 : 0.28
    let hub = CGPoint(x: cx, y: cy)
    for p in pts {
        ctx.setStrokeColor(NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: linkAlpha * 0.65).cgColor)
        ctx.move(to: hub)
        ctx.addLine(to: p)
        ctx.strokePath()
    }
    for i in 0..<jewels {
        for j in (i + 1)..<jewels {
            let span = min(j - i, jewels - (j - i))
            if span > 2 && spec.kind != "flame" { continue }
            ctx.setStrokeColor(NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: linkAlpha).cgColor)
            ctx.move(to: pts[i])
            ctx.addLine(to: pts[j])
            ctx.strokePath()
        }
    }
    let figs = spec.figures ?? []
    for (i, p) in pts.enumerated() {
        let on = jewelOn(spec: spec, t: t, i: i, jewels: jewels)
        let base: CGFloat = spec.kind == "ladder" ? 16 : 7
        let rad = base * (0.75 + 0.25 * on)
        ctx.setFillColor(NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: 0.18 * on).cgColor)
        ctx.fillEllipse(in: CGRect(x: p.x - rad * 2.2, y: p.y - rad * 2.2, width: rad * 4.4, height: rad * 4.4))
        let core = NSColor(
            calibratedRed: min(1, ar + 0.3),
            green: min(1, ag + 0.25),
            blue: min(1, ab + 0.2),
            alpha: 0.35 + 0.65 * on
        )
        ctx.setFillColor(core.cgColor)
        ctx.fillEllipse(in: CGRect(x: p.x - rad, y: p.y - rad, width: rad * 2, height: rad * 2))
        if spec.kind == "ladder", i < figs.count {
            let ink = NSColor(calibratedWhite: 1, alpha: 0.35 + 0.65 * on)
            drawLines(figs[i], ctx: ctx, midX: p.x, midY: p.y - rad - 16, maxW: 70, maxSize: 18, color: ink, bold: true)
        }
    }
    let hubRad: CGFloat = spec.kind == "ladder" ? 9 : 6.5
    ctx.setFillColor(NSColor(calibratedRed: ar, green: ag, blue: ab, alpha: 0.28).cgColor)
    ctx.fillEllipse(in: CGRect(x: hub.x - hubRad * 2.4, y: hub.y - hubRad * 2.4, width: hubRad * 4.8, height: hubRad * 4.8))
    ctx.setFillColor(NSColor(calibratedRed: min(1, ar + 0.35), green: min(1, ag + 0.3), blue: min(1, ab + 0.25), alpha: 1).cgColor)
    ctx.fillEllipse(in: CGRect(x: hub.x - hubRad, y: hub.y - hubRad, width: hubRad * 2, height: hubRad * 2))
}

func jewelOn(spec: Spec, t: CGFloat, i: Int, jewels: Int) -> CGFloat {
    if spec.kind == "ladder" || spec.kind == "bars" {
        let lit = t * CGFloat(jewels + 1)
        return smooth(lit - CGFloat(i))
    }
    return 0.55 + 0.45 * sin(t * CGFloat.pi * 4 + CGFloat(i))
}

func paintBars(ctx: CGContext, spec: Spec, wf: CGFloat, hf: CGFloat, t: CGFloat, square: Bool, accent: NSColor) {
    if spec.kind != "bars" { return }
    let figs = spec.figures ?? []
    let labels = figs.isEmpty ? ["", "", ""] : figs
    let n = labels.count
    let bw: CGFloat = square ? wf * 0.62 : wf * 0.42
    let left: CGFloat = square ? (wf - bw) / 2 : 64
    let base: CGFloat = square ? hf * 0.18 : 108
    let gap: CGFloat = 18
    let h: CGFloat = 10
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font(15, bold: true),
        .foregroundColor: NSColor(calibratedWhite: 1, alpha: 0.9),
    ]
    for i in 0..<n {
        let grow = smooth(t * 1.4 - CGFloat(i) * 0.12)
        let y = base + CGFloat(n - 1 - i) * (h + gap)
        let fillW = bw * (0.28 + 0.62 * grow) * (1 - CGFloat(i) * 0.12)
        ctx.setFillColor(NSColor(calibratedWhite: 1, alpha: 0.08).cgColor)
        ctx.fill(CGRect(x: left, y: y, width: bw, height: h))
        ctx.setFillColor(accent.cgColor)
        ctx.fill(CGRect(x: left, y: y, width: fillW, height: h))
        NSString(string: labels[i]).draw(at: NSPoint(x: left, y: y + 14), withAttributes: attrs)
    }
}

func paintWords(ctx: CGContext, spec: Spec, wf: CGFloat, hf: CGFloat, t: CGFloat, square: Bool, accent: NSColor) {
    let pair = beatIndex(t, spec.beats.count)
    let local = pair.1
    var fade: CGFloat = 1
    if local < 0.18 { fade = smooth(local / 0.18) }
    if local > 0.82 { fade = smooth((1 - local) / 0.18) }
    let words = spec.beats[pair.0]
    let textX: CGFloat = square ? wf * 0.5 : wf * 0.30
    let textY: CGFloat = square ? hf * 0.28 : hf * 0.46
    let maxW: CGFloat = square ? wf * 0.86 : wf * 0.52
    let eyeY: CGFloat = textY + (square ? 118 : 132)
    let eyeSize: CGFloat = square ? 20 : 16
    drawLines(spec.eyebrow, ctx: ctx, midX: textX, midY: eyeY, maxW: maxW, maxSize: eyeSize, color: accent.withAlphaComponent(0.95), bold: true)
    ctx.saveGState()
    ctx.setAlpha(fade)
    let wordSize: CGFloat = square ? 84 : 68
    drawLines(words, ctx: ctx, midX: textX, midY: textY, maxW: maxW, maxSize: wordSize, color: .white, bold: true)
    ctx.restoreGState()
    let footSize: CGFloat = square ? 16 : 14
    let footAttrs: [NSAttributedString.Key: Any] = [
        .font: font(footSize, bold: false),
        .foregroundColor: NSColor(calibratedWhite: 1, alpha: 0.55),
    ]
    let foot = spec.foot as NSString
    let fsz = foot.size(withAttributes: footAttrs)
    let footX: CGFloat = square ? (wf - fsz.width) / 2 : 64
    let footY: CGFloat = square ? 36 : 28
    foot.draw(at: NSPoint(x: footX, y: footY), withAttributes: footAttrs)
}

func render(spec: Spec, W: Int, H: Int, t: CGFloat, out: String) {
    autoreleasepool {
        let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H,
            bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
            colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
        )!
        NSGraphicsContext.saveGraphicsState()
        let ns = NSGraphicsContext(bitmapImageRep: rep)!
        NSGraphicsContext.current = ns
        let ctx = ns.cgContext
        let wf = CGFloat(W)
        let hf = CGFloat(H)
        let square = W == H
        let accent = NSColor(calibratedRed: spec.accent[0], green: spec.accent[1], blue: spec.accent[2], alpha: 1)
        paintBed(ctx: ctx, spec: spec, wf: wf, hf: hf, t: t, square: square)
        let cx: CGFloat = square ? wf * 0.5 : wf * 0.74
        let cy: CGFloat = square ? hf * 0.62 : hf * 0.50
        let R: CGFloat = square ? wf * 0.30 : hf * 0.36
        paintGlow(ctx: ctx, spec: spec, cx: cx, cy: cy, R: R, t: t)
        paintNet(ctx: ctx, spec: spec, cx: cx, cy: cy, R: R, t: t)
        paintBars(ctx: ctx, spec: spec, wf: wf, hf: hf, t: t, square: square, accent: accent)
        paintWords(ctx: ctx, spec: spec, wf: wf, hf: hf, t: t, square: square, accent: accent)
        NSGraphicsContext.restoreGraphicsState()
        if let data = rep.representation(using: .png, properties: [:]) {
            try? data.write(to: URL(fileURLWithPath: out))
        }
    }
}

func runCmd(_ args: [String]) {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    p.arguments = args
    try! p.run()
    p.waitUntilExit()
    if p.terminationStatus != 0 {
        fputs("failed: \(args.joined(separator: " "))\n", stderr)
        exit(p.terminationStatus)
    }
}

let only = Set(CommandLine.arguments.dropFirst())
let frames = 48
for spec in specs where spec.render && (only.isEmpty || only.contains(spec.slug)) {
    let dir = "\(tmpRoot)/\(spec.slug)"
    let wide = "\(dir)/wide"
    let square = "\(dir)/square"
    try? FileManager.default.removeItem(atPath: dir)
    try? FileManager.default.createDirectory(atPath: wide, withIntermediateDirectories: true)
    try? FileManager.default.createDirectory(atPath: square, withIntermediateDirectories: true)
    for f in 0..<frames {
        let t = CGFloat(f) / CGFloat(frames)
        render(spec: spec, W: 1200, H: 630, t: t, out: String(format: "%@/%04d.png", wide, f))
        render(spec: spec, W: 1080, H: 1080, t: t, out: String(format: "%@/%04d.png", square, f))
    }
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-i", "\(wide)/0010.png", "-q:v", "3", "\(pubOg)/\(spec.slug).jpg"])
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-i", "\(square)/0010.png", "-q:v", "3", "\(pubOg)/\(spec.slug)-square.jpg"])
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "16", "-i", "\(wide)/%04d.png", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast", "-movflags", "+faststart", "-an", "\(pubOg)/\(spec.slug).mp4"])
    runCmd(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "16", "-i", "\(square)/%04d.png", "-c:v", "libx265", "-tag:v", "hvc1", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "ultrafast", "-movflags", "+faststart", "-an", "\(pubOg)/\(spec.slug)-square.mp4"])
    runCmd(["cp", "\(pubOg)/\(spec.slug)-square.jpg", "\(instaDir)/\(spec.slug)-square.jpg"])
    runCmd(["cp", "\(pubOg)/\(spec.slug)-square.mp4", "\(instaDir)/\(spec.slug)-square.mp4"])
    try? FileManager.default.removeItem(atPath: dir)
    print("Completed \(spec.slug)")
}
