#!/bin/sh
# Animated squares for posts and chats: Earth time-lapsed under the phone turning once, the card's words on top.
# Three seconds, the whole hero video, the phone all the way round. Writes, for each of home, buy and thumb:
#   ~/Desktop/khensu-instagram/<name>.gif        1080 x 1080, 24 fps, best palette (chats, link previews)
#   ~/Desktop/khensu-instagram/<name>-540.gif    half size, for places with a size limit
#   ~/Desktop/khensu-instagram/<name>.mp4        H.264, for Instagram and everywhere else
#   ~/Desktop/khensu-instagram/<name>-hevc.mp4   HEVC (hvc1), smaller, for Apple devices and nu:preview
# Needs the overlays from tools/og.sh (in $TMPDIR/khensu-og) and ffmpeg.
set -eu
site="$(cd "$(dirname "$0")/../sites/khensu-nu" && pwd)"
out="${TMPDIR:-/tmp}/khensu-og"
insta="$HOME/Desktop/khensu-instagram"
mkdir -p "$insta"
earth="$site/public/khensu/hero/earth-1080.mp4"
turn="$site/public/khensu/renders/turn/%03d.webp"
dur=3
# The hero video is 20.04 s; play all of it in $dur seconds.
len="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$earth")"
speed="$(python3 -c "print($dur / $len)")"
anim() {
  slug="$1"; name="$2"; phone_h="$3"; phone_top="$4"
  overlay="$out/$slug-overlay.png"
  [ -s "$overlay" ] || { echo "missing $overlay; run tools/og.sh first" >&2; exit 1; }
  # The phone in the turn frames is about 1220 px tall from y 180 in a 1200 x 1500 frame.
  scale="$(python3 -c "print($phone_h / 1220)")"
  w="$(python3 -c "print(round(1200 * $scale))")"
  x="$(python3 -c "print(round((1080 - 1200 * $scale) / 2))")"
  y="$(python3 -c "print(round($phone_top - 180 * $scale))")"
  base="$out/$slug-anim"
  ffmpeg -y -v error \
    -i "$earth" \
    -framerate "$(python3 -c "print(48 / $dur)")" -i "$turn" \
    -loop 1 -framerate 24 -t "$dur" -i "$overlay" \
    -filter_complex "[0:v]setpts=PTS*$speed,fps=24,crop=1080:1080:(iw-1080)/2:0[bg];[1:v]fps=24,scale=$w:-1:flags=lanczos[ph];[bg][ph]overlay=$x:$y:shortest=1[a];[a][2:v]overlay=0:0:shortest=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset slow -crf 15 -movflags +faststart "$base.mp4"
  ffmpeg -y -v error -i "$base.mp4" -c:v hevc_videotoolbox -q:v 70 -tag:v hvc1 -movflags +faststart "$base-hevc.mp4"
  ffmpeg -y -v error -i "$base.mp4" -vf "fps=24,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$base.gif"
  ffmpeg -y -v error -i "$base.mp4" -vf "fps=24,scale=540:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$base-540.gif"
  cp "$base.mp4" "$insta/$name.mp4"
  cp "$base-hevc.mp4" "$insta/$name-hevc.mp4"
  cp "$base.gif" "$insta/$name.gif"
  cp "$base-540.gif" "$insta/$name-540.gif"
  cp "$base-hevc.mp4" "$site/public/og/$slug-square.mp4"
  echo "wrote $insta/$name.{gif,mp4} and public/og/$slug-square.mp4"
}
# slug, file name, phone height in the square, phone top (match OgCard.astro's square .shot and .thumb .shot)
anim buy khensu-nu-buy-square 500 36
anim thumb khensu-nu-link-thumb 460 24
anim home khensu-nu-square 500 36

# Record byte counts and hashes in src/data/og.ts, where Base.astro reads them for the nu:preview tags.
python3 - "$site" <<'PY'
import hashlib, json, re, sys
from pathlib import Path
site = Path(sys.argv[1])
previews = {}
for slug in ("home", "buy", "thumb"):
    f = site / "public/og" / f"{slug}-square.mp4"
    if f.exists():
        b = f.read_bytes()
        previews[slug] = {"bytes": len(b), "hash": "sha-256=" + hashlib.sha256(b).hexdigest()}
ts = site / "src/data/og.ts"
s = ts.read_text()
block = json.dumps(previews, indent=2).replace('"bytes"', "bytes").replace('"hash"', "hash")
s2 = re.sub(r"export const PREVIEWS: Record<string, \{ bytes: number; hash: string \}> = \{.*?\n\};", lambda m: f"export const PREVIEWS: Record<string, {{ bytes: number; hash: string }}> = {block};", s, flags=re.S)
ts.write_text(s2)
print("updated", ts, list(previews))
PY
