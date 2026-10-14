#!/bin/sh
# Animated cards for posts and chats: Earth time-lapsed under the phone turning once, the card's words on top.
# Inter overlays, phone fully in frame, 4 s at 30 fps with motion-interpolated turn,
# landscape 1200×630 for iMessage (og:video) and square 1080×1080 for nu:preview / Instagram.
#
# Writes for each of home, buy and thumb:
#   public/og/<slug>.mp4              landscape HEVC (og:video)
#   public/og/<slug>-square.mp4       square HEVC (nu:preview)
#   ~/Desktop/khensu-instagram/…      gif / h264 / hevc copies
set -eu
site="$(cd "$(dirname "$0")/../sites/khensu-nu" && pwd)"
out="${TMPDIR:-/tmp}/khensu-og"
insta="$HOME/Desktop/khensu-instagram"
mkdir -p "$insta"
earth="$site/public/khensu/hero/earth-1080.mp4"
turn="$site/public/khensu/renders/turn/%03d.webp"
# Phone body in the turn frames: about 1180 px tall from y 181 in a 1200×1500 frame.
src_top=181
src_h=1180
src_frame_h=1500
src_frame_w=1200

dur=4
fps=30
pub_dir="$site/public/og"
insta_dir="$insta"
mkdir -p "$pub_dir" "$insta_dir"


len="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$earth")"
speed="$(python3 -c "print($dur / float('$len'))")"

# Place the phone so its body top sits at phone_top and its body height is phone_h (both in output pixels).
place() {
  phone_h="$1"; phone_top="$2"; out_w="$3"; out_h="$4"
  python3 -c "
scale = $phone_h / $src_h
w = round($src_frame_w * scale)
if $out_w != $out_h:
    x = round($out_w - w - 56)  # landscape: right side
else:
    x = round(($out_w - w) / 2)  # square: centred
y = round($phone_top - $src_top * scale)
body_top = y + round($src_top * scale)
body_bot = body_top + $phone_h
if body_top < 8:
    y += 8 - body_top
    body_top, body_bot = 8, 8 + $phone_h
if body_bot > $out_h - 8:
    y -= body_bot - ($out_h - 8)
print(f'{scale} {w} {x} {y}')
"
}

anim_one() {
  slug="$1"; name="$2"; phone_h="$3"; phone_top="$4"; out_w="$5"; out_h="$6"; tag="$7"
  overlay="$out/$slug-overlay.png"
  # Landscape overlays are named <slug>-overlay-wide.png
  if [ "$out_w" != "$out_h" ]; then
    overlay="$out/$slug-overlay-wide.png"
  fi
  [ -s "$overlay" ] || { echo "missing $overlay; run tools/og.sh first" >&2; exit 1; }
  read -r scale w x y <<EOF
$(place "$phone_h" "$phone_top" "$out_w" "$out_h")
EOF
  base="$out/$slug-$tag-anim"
  # Phone: 48 turn frames, motion-interpolated to $fps over $dur so the spin is smooth.
  turn_rate="$(python3 -c "print(48 / $dur)")"
  # Blend interpolate 48 turn frames up to $fps — smooth enough, far faster than MCI.
  phone_filter="minterpolate=fps=$fps:mi_mode=blend,scale=$w:-1:flags=lanczos"
  ffmpeg -y -v error \
    -i "$earth" \
    -framerate "$turn_rate" -i "$turn" \
    -loop 1 -framerate "$fps" -t "$dur" -i "$overlay" \
    -filter_complex "[0:v]setpts=PTS*$speed,fps=$fps,scale=${out_w}:${out_h}:force_original_aspect_ratio=increase,crop=${out_w}:${out_h}[bg];[1:v]${phone_filter}[ph];[bg][ph]overlay=$x:$y:shortest=1[a];[a][2:v]overlay=0:0:shortest=1,format=yuv420p" \
    -t "$dur" -r "$fps" -c:v libx264 -preset slow -crf 15 -movflags +faststart "$base.mp4"
  ffmpeg -y -v error -i "$base.mp4" -c:v hevc_videotoolbox -q:v 65 -tag:v hvc1 -movflags +faststart "$base-hevc.mp4"
  ffmpeg -y -v error -i "$base.mp4" -vf "fps=$fps,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$base.gif"
  if [ "$out_w" = "$out_h" ]; then
    ffmpeg -y -v error -i "$base.mp4" -vf "fps=$fps,scale=540:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$base-540.gif"
    cp "$base-540.gif" "$insta_dir/$name-540.gif"
    cp "$base-hevc.mp4" "$pub_dir/$slug-square.mp4"
  else
    cp "$base-hevc.mp4" "$pub_dir/$slug.mp4"
  fi
  cp "$base.mp4" "$insta_dir/$name.mp4"
  cp "$base-hevc.mp4" "$insta_dir/$name-hevc.mp4"
  cp "$base.gif" "$insta_dir/$name.gif"
  echo "wrote $insta_dir/$name.{gif,mp4} and $pub_dir ($tag)"
}

# Room around the phone so iMessage and the square both keep the whole device.
anim_one buy khensu-nu-buy-square 420 72 1080 1080 square
anim_one thumb khensu-nu-link-thumb 400 56 1080 1080 square
anim_one home khensu-nu-square 420 72 1080 1080 square
# Landscape for Messages og:video (phone on the right, fully in the 630-tall frame).
anim_one buy khensu-nu-buy 400 115 1200 630 wide
anim_one home khensu-nu-home 400 115 1200 630 wide


# Record byte counts and hashes in src/data/og.ts for the shipped previews.
python3 - "$site" "$dur" <<'PY'
import hashlib, json, re, sys
from pathlib import Path
site = Path(sys.argv[1])
dur = int(float(sys.argv[2]))
previews = {}
for slug in ("home", "buy", "thumb"):
    square = site / "public/og" / f"{slug}-square.mp4"
    wide = site / "public/og" / f"{slug}.mp4"
    if square.exists():
        b = square.read_bytes()
        entry = {
            "bytes": len(b),
            "hash": "sha-256=" + hashlib.sha256(b).hexdigest(),
            "duration": dur,
        }
        if wide.exists():
            wb = wide.read_bytes()
            entry["wideBytes"] = len(wb)
            entry["wideHash"] = "sha-256=" + hashlib.sha256(wb).hexdigest()
        previews[slug] = entry
ts = site / "src/data/og.ts"
s = ts.read_text()
block = json.dumps(previews, indent=2)
# Keep TypeScript object shape without quoted keys where the old file used bare keys — use a TS-ish dump.
def to_ts(obj, indent=2):
    def walk(o, level):
        sp = " " * (indent * level)
        sp1 = " " * (indent * (level + 1))
        if isinstance(o, dict):
            lines = ["{"]
            for i, (k, v) in enumerate(o.items()):
                comma = "," if i < len(o) - 1 else ""
                lines.append(f"{sp1}{k}: {walk(v, level+1)}{comma}")
            lines.append(sp + "}")
            return "\n".join(lines)
        if isinstance(o, str):
            return json.dumps(o)
        return json.dumps(o)
    return walk(obj, 0)
ts_block = to_ts(previews)
s2 = re.sub(
    r"export const PREVIEWS: Record<string, \{[^}]+\}> = \{.*?\n\};",
    f"export const PREVIEWS: Record<string, {{ bytes: number; hash: string; duration: number; wideBytes?: number; wideHash?: string }}> = {ts_block};",
    s,
    flags=re.S,
)
ts.write_text(s2)
print("updated", ts, list(previews))
PY
