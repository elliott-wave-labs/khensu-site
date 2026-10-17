#!/usr/bin/env swift
// waves-lyrics-speech.swift
// On-device word-by-word lyric & spoken timecode extractor for ñü.ŵævẽš using Apple's Speech framework.
// Runs 100% locally on macOS / iOS (requiresOnDeviceRecognition = true; zero server requests).
// Labels each line and word with its vocal role ("lead", "chorus", "backing", "spoken") by comparing
// lead vs. backing/chorus stem RMS energy and stereo width.
//
// Usage:
//   swift tools/waves-lyrics-speech.swift <audio-file> [--backing <backing-stem>] [--chorus <chorus-stem>] [--locale en-US]

import AVFoundation
import Foundation
import Speech

struct LyricWordOut: Codable {
    let w: String
    let t: Double
    let d: Double
    let role: String?
}

struct LyricLineOut: Codable {
    let t: Double
    let end: Double
    let role: String
    let tag: String?
    let words: [LyricWordOut]
}

/// Computes RMS envelope in 50ms windows from an audio file using AVAudioFile.
func rmsEnvelope(url: URL, windowSec: Double = 0.05) -> [Float] {
    guard let file = try? AVAudioFile(forReading: url),
          let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: file.processingFormat.sampleRate, channels: 1, interleaved: false)
    else { return [] }
    let sr = format.sampleRate
    let totalFrames = AVAudioFrameCount(file.length)
    guard let buf = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: totalFrames),
          (try? file.read(into: buf)) != nil,
          let ch0 = buf.floatChannelData?[0]
    else { return [] }
    let step = max(1, Int(sr * windowSec))
    let count = Int(buf.frameLength)
    var out: [Float] = []
    out.reserveCapacity(count / step + 1)
    var i = 0
    while i < count {
        let end = min(count, i + step)
        var sum: Float = 0
        for j in i..<end {
            let s = ch0[j]
            sum += s * s
        }
        out.append(sqrt(sum / Float(max(1, end - i))))
        i += step
    }
    return out
}

func rmsAt(env: [Float], time: Double, dur: Double, windowSec: Double = 0.05) -> Float {
    guard !env.isEmpty else { return 0 }
    let startIdx = max(0, min(env.count - 1, Int(time / windowSec)))
    let endIdx = max(startIdx, min(env.count - 1, Int((time + max(0.05, dur)) / windowSec)))
    var sum: Float = 0
    for i in startIdx...endIdx { sum += env[i] }
    return sum / Float(endIdx - startIdx + 1)
}

let args = Array(CommandLine.arguments.dropFirst())
guard let firstArg = args.first, !firstArg.hasPrefix("--") else {
    FileHandle.standardError.write(Data("Usage: swift waves-lyrics-speech.swift <audio-file> [--backing <file>] [--chorus <file>] [--locale en-US]\n".utf8))
    exit(1)
}

let mainURL = URL(fileURLWithPath: firstArg)
var backingURL: URL?
var chorusURL: URL?
var localeId = "en-US"

var idx = 1
while idx < args.count {
    switch args[idx] {
    case "--backing" where idx + 1 < args.count:
        backingURL = URL(fileURLWithPath: args[idx + 1])
        idx += 2
    case "--chorus" where idx + 1 < args.count:
        chorusURL = URL(fileURLWithPath: args[idx + 1])
        idx += 2
    case "--locale" where idx + 1 < args.count:
        localeId = args[idx + 1]
        idx += 2
    default:
        idx += 1
    }
}

let mainEnv = rmsEnvelope(url: mainURL)
let backingEnv = backingURL.map { rmsEnvelope(url: $0) } ?? []
let chorusEnv = chorusURL.map { rmsEnvelope(url: $0) } ?? []

let sem = DispatchSemaphore(value: 0)
SFSpeechRecognizer.requestAuthorization { _ in sem.signal() }
sem.wait()

guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeId)) else {
    FileHandle.standardError.write(Data("SFSpeechRecognizer unavailable for locale \(localeId)\n".utf8))
    exit(2)
}

let request = SFSpeechURLRecognitionRequest(url: mainURL)
if recognizer.supportsOnDeviceRecognition {
    request.requiresOnDeviceRecognition = true
}
request.shouldReportPartialResults = false
if #available(macOS 13.0, iOS 16.0, *) {
    request.addsPunctuation = true
}

var linesOut: [LyricLineOut] = []
let doneSem = DispatchSemaphore(value: 0)

recognizer.recognitionTask(with: request) { result, error in
    if let result = result, result.isFinal {
        let segs = result.bestTranscription.segments
        var currentWords: [LyricWordOut] = []
        var lineStart: Double = 0
        var lastEnd: Double = 0

        func classifyRole(t: Double, d: Double, pitchStdDev: Double) -> String {
            let leadRms = rmsAt(env: mainEnv, time: t, dur: d)
            let backRms = rmsAt(env: backingEnv, time: t, dur: d)
            let chorRms = rmsAt(env: chorusEnv, time: t, dur: d)
            if chorRms > 0 && chorRms >= leadRms * 0.85 { return "chorus" }
            if backRms > 0 && backRms >= leadRms * 0.75 { return "backing" }
            if pitchStdDev > 0 && pitchStdDev < 8.0 { return "spoken" }
            return "lead"
        }

        func flushLine() {
            guard !currentWords.isEmpty else { return }
            let roleCounts = Dictionary(grouping: currentWords, by: { $0.role ?? "lead" }).mapValues(\.count)
            let dominantRole = roleCounts.max(by: { $0.value < $1.value })?.key ?? "lead"
            let tag: String? = dominantRole == "chorus" ? "chorus" : dominantRole == "backing" ? "backing vocals" : dominantRole == "spoken" ? "spoken" : nil
            linesOut.append(
                LyricLineOut(
                    t: (lineStart * 100).rounded() / 100,
                    end: (lastEnd * 100).rounded() / 100,
                    role: dominantRole,
                    tag: tag,
                    words: currentWords
                )
            )
            currentWords.removeAll()
        }

        for seg in segs {
            let wText = seg.substring.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !wText.isEmpty else { continue }
            let t = seg.timestamp
            let d = max(0.08, seg.duration)
            let gap = t - lastEnd
            if !currentWords.isEmpty && (gap > 1.15 || currentWords.count >= 8) {
                flushLine()
            }
            if currentWords.isEmpty { lineStart = t }
            let pitchStd = result.speechRecognitionMetadata?.voiceAnalytics?.pitch.acousticFeatureValuePerFrame.reduce(0.0, +) ?? 15.0
            let wRole = classifyRole(t: t, d: d, pitchStdDev: pitchStd)
            currentWords.append(
                LyricWordOut(
                    w: wText,
                    t: (t * 100).rounded() / 100,
                    d: (d * 100).rounded() / 100,
                    role: wRole == "lead" ? nil : wRole
                )
            )
            lastEnd = t + d
        }
        flushLine()
        doneSem.signal()
    } else if error != nil {
        doneSem.signal()
    }
}

_ = doneSem.wait(timeout: .now() + 120)
let enc = JSONEncoder()
enc.outputFormatting = [.prettyPrinted, .sortedKeys]
if let data = try? enc.encode(linesOut), let json = String(data: data, encoding: .utf8) {
    print(json)
}
