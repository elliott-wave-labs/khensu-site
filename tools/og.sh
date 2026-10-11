#!/bin/sh
# Screenshots every /og/<slug>/ card (khensu-nu, see src/data/og.ts) to public/og/<slug>.jpg, the 1200 x 630
# link-preview images, and /og/home/ to public/og.png. Builds into its own directory so it never touches dist.
set -eu
site="$(cd "$(dirname "$0")/../sites/khensu-nu" && pwd)"
out="${TMPDIR:-/tmp}/khensu-og"
port=8765
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
rm -rf "$out"
(cd "$site" && ./node_modules/.bin/astro build --outDir "$out/dist" >"$out.log" 2>&1)
(cd "$out/dist" && python3 -m http.server "$port" >/dev/null 2>&1) &
server=$!
trap 'kill $server' EXIT
sleep 1
mkdir -p "$site/public/og"
for dir in "$out"/dist/og/*/; do
  slug="$(basename "$dir")"
  "$chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 \
    --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1200,630 --virtual-time-budget=6000 \
    --screenshot="$out/$slug.png" "http://localhost:$port/og/$slug/" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 88 "$out/$slug.png" --out "$site/public/og/$slug.jpg" >/dev/null
  echo "wrote public/og/$slug.jpg"
done
cp "$out/home.png" "$site/public/og.png"
