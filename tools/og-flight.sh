#!/bin/sh
# The nu.universes link preview is the app itself: tools/og-flight.mjs records the real flight from Earth's orbit
# into M33, and the card's words (tools/og.sh overlays) go on top. Run tools/og.sh universes first.
# Writes public/og/universes.mp4 (landscape H.264, og:video), universes-hevc.mp4 and universes-square.mp4
# (square HEVC, nu:preview), then records their sizes and hashes in src/data/og.ts.
set -eu
tools="$(cd "$(dirname "$0")" && pwd)"
site="$(cd "$tools/../sites/khensu-nu" && pwd)"
out="${TMPDIR:-/tmp}/khensu-og"
port=4398
slug=universes
fps=30
for o in "$out/$slug-overlay-wide.png" "$out/$slug-overlay.png"; do
  [ -s "$o" ] || { echo "missing $o; run tools/og.sh $slug first" >&2; exit 1; }
done
(cd "$site" && ./node_modules/.bin/astro build --outDir "$out/flight-dist" >"$out/flight.log" 2>&1)
(cd "$out/flight-dist" && python3 -m http.server "$port" >/dev/null 2>&1) &
server=$!
trap 'kill $server' EXIT
sleep 1

make() {
  w="$1"; h="$2"; overlay="$3"; base="$out/$slug-flight-${w}x$h"
  rm -rf "$base"
  node "$tools/og-flight.mjs" "http://localhost:$port/universes/" "$base" "$w" "$h"
  ffmpeg -y -v error -framerate "$fps" -i "$base/%04d.png" -loop 1 -framerate "$fps" -i "$overlay" \
    -filter_complex "[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p" \
    -r "$fps" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -tag:v avc1 "$base.mp4"
  ffmpeg -y -v error -i "$base.mp4" -c:v hevc_videotoolbox -q:v 65 -tag:v hvc1 -movflags +faststart "$base-hevc.mp4"
}
make 1200 630 "$out/$slug-overlay-wide.png"
make 1080 1080 "$out/$slug-overlay.png"
cp "$out/$slug-flight-1200x630.mp4" "$site/public/og/$slug.mp4"
cp "$out/$slug-flight-1200x630-hevc.mp4" "$site/public/og/$slug-hevc.mp4"
cp "$out/$slug-flight-1080x1080-hevc.mp4" "$site/public/og/$slug-square.mp4"
insta="$HOME/Desktop/khensu-instagram"
mkdir -p "$insta"
cp "$out/$slug-flight-1080x1080.mp4" "$insta/khensu-nu-universes-square.mp4"
cp "$out/$slug-flight-1200x630.mp4" "$insta/khensu-nu-universes.mp4"
python3 "$tools/og-previews.py" "$slug"
echo "wrote public/og/$slug.mp4, $slug-hevc.mp4, $slug-square.mp4"
