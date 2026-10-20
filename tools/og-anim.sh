#!/bin/sh
# Animated Indra cards for posts and chats: Earth time-lapsed under the phone turning once, the card's words on top.
# Inter overlays, phone fully in frame, 4 s at 30 fps with motion-interpolated turn,
# landscape 1200×630 for og:video and square 1080×1080 for nu:preview / Instagram.
# Only home, buy and thumb carry the phone; creators is Earth and words alone (phone height 0).
#
# Landscape og:video is H.264 (avc1) so Apple Messages, Android, and most unfurlers can play it.
# Square nu:preview stays HEVC (hvc1) for webË / Apple quality. design/indra.md.
#
# With slugs (sh tools/og-anim.sh creators) only those cards are made.
# Writes for each of home, buy, thumb, creators:
#   public/og/<slug>.mp4              landscape H.264 (og:video)
#   public/og/<slug>-square.mp4       square HEVC (nu:preview)
#   ~/Desktop/khensu-instagram/…      gif / h264 / hevc copies
set -eu
only=" $* "
want() { [ "$only" = "  " ] || case "$only" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
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
  want "$slug" || return 0
  overlay="$out/$slug-overlay.png"
  # Landscape overlays are named <slug>-overlay-wide.png
  if [ "$out_w" != "$out_h" ]; then
    overlay="$out/$slug-overlay-wide.png"
  fi
  [ -s "$overlay" ] || { echo "missing $overlay; run tools/og.sh first" >&2; exit 1; }
  base="$out/$slug-$tag-anim"
  bg="[0:v]setpts=PTS*$speed,fps=$fps,scale=${out_w}:${out_h}:force_original_aspect_ratio=increase,crop=${out_w}:${out_h}[bg]"
  if [ "$phone_h" = 0 ]; then
    ffmpeg -y -v error \
      -i "$earth" \
      -loop 1 -framerate "$fps" -t "$dur" -i "$overlay" \
      -filter_complex "$bg;[bg][1:v]overlay=0:0:shortest=1,format=yuv420p" \
      -t "$dur" -r "$fps" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -movflags +faststart -tag:v avc1 "$base.mp4"
  else
    read -r scale w x y <<EOF
$(place "$phone_h" "$phone_top" "$out_w" "$out_h")
EOF
    # Phone: 48 turn frames, motion-interpolated to $fps over $dur so the spin is smooth.
    turn_rate="$(python3 -c "print(48 / $dur)")"
    # Blend interpolate 48 turn frames up to $fps — smooth enough, far faster than MCI.
    phone_filter="minterpolate=fps=$fps:mi_mode=blend,scale=$w:-1:flags=lanczos"
    ffmpeg -y -v error \
      -i "$earth" \
      -framerate "$turn_rate" -i "$turn" \
      -loop 1 -framerate "$fps" -t "$dur" -i "$overlay" \
      -filter_complex "$bg;[1:v]${phone_filter}[ph];[bg][ph]overlay=$x:$y:shortest=1[a];[a][2:v]overlay=0:0:shortest=1,format=yuv420p" \
      -t "$dur" -r "$fps" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -movflags +faststart -tag:v avc1 "$base.mp4"
  fi
  ffmpeg -y -v error -i "$base.mp4" -c:v hevc_videotoolbox -q:v 65 -tag:v hvc1 -movflags +faststart "$base-hevc.mp4"
  ffmpeg -y -v error -i "$base.mp4" -vf "fps=$fps,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$base.gif"
  if [ "$out_w" = "$out_h" ]; then
    ffmpeg -y -v error -i "$base.mp4" -vf "fps=$fps,scale=540:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$base-540.gif"
    cp "$base-540.gif" "$insta_dir/$name-540.gif"
    # Square nu:preview: HEVC for Apple / webË.
    cp "$base-hevc.mp4" "$pub_dir/$slug-square.mp4"
  else
    # Landscape og:video: H.264 so Android and Slack-class unfurlers can decode it; Apple Messages plays it too.
    cp "$base.mp4" "$pub_dir/$slug.mp4"
    cp "$base-hevc.mp4" "$pub_dir/$slug-hevc.mp4"
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
anim_one creators khensu-nu-creators-square 0 0 1080 1080 square
# Landscape for Messages / Android og:video (phone on the right, fully in the 630-tall frame).
anim_one buy khensu-nu-buy 400 115 1200 630 wide
anim_one home khensu-nu-home 400 115 1200 630 wide
anim_one creators khensu-nu-creators 0 0 1200 630 wide


# Record byte counts and hashes in src/data/og.ts for the shipped previews.
set -- $only
[ $# -gt 0 ] || set -- home buy thumb creators
python3 "$(dirname "$0")/og-previews.py" "$@"
