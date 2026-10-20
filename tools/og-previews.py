#!/usr/bin/env python3
"""Record byte counts and hashes of public/og/<slug>-square.mp4 and <slug>.mp4 in PREVIEWS (src/data/og.ts).

Usage: python3 tools/og-previews.py slug [slug ...]
Only the named entries change; the rest of PREVIEWS is left as it is.
"""
import hashlib
import re
import subprocess
import sys
from pathlib import Path

site = Path(__file__).resolve().parent.parent / "sites/khensu-nu"
ts = site / "src/data/og.ts"
s = ts.read_text()
start = s.index("export const PREVIEWS")
end = s.index("\n};", start)
block = s[start:end]


def digest(path: Path) -> tuple[int, str]:
    b = path.read_bytes()
    return len(b), "sha-256=" + hashlib.sha256(b).hexdigest()


for slug in sys.argv[1:]:
    square = site / "public/og" / f"{slug}-square.mp4"
    wide = site / "public/og" / f"{slug}.mp4"
    if not square.exists():
        print(f"skip {slug}: no {square.name}", file=sys.stderr)
        continue
    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(square)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    size, sha = digest(square)
    lines = [f"    bytes: {size},", f"    hash: '{sha}',", f"    duration: {round(float(dur))},"]
    if wide.exists():
        wsize, wsha = digest(wide)
        lines += [f"    wideBytes: {wsize},", f"    wideHash: '{wsha}',"]
    key = slug if re.fullmatch(r"[A-Za-z_]\w*", slug) else f"'{slug}'"
    entry = f"  {key}: {{\n" + "\n".join(lines) + "\n  },"
    pat = re.compile(r"^  ['\"]?" + re.escape(slug) + r"['\"]?: \{\n.*?^  \},?", re.S | re.M)
    if pat.search(block):
        block = pat.sub(lambda _: entry, block, count=1)
    else:
        block = block.rstrip()
        block = (block if block.endswith((",", "{")) else block + ",") + "\n" + entry
    print(f"updated PREVIEWS.{slug}")

ts.write_text(s[:start] + block + s[end:])
