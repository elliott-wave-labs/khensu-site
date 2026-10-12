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
# Headless Chrome sometimes exits without a screenshot, so each card gets three tries.
shot() {
  for try in 1 2 3; do
    rm -f "$3"
    "$chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 \
      --use-angle=swiftshader --enable-unsafe-swiftshader --window-size="$1" --virtual-time-budget=6000 \
      --screenshot="$3" "http://localhost:$port/og/$2/" >/dev/null 2>&1 || true
    [ -s "$3" ] && return 0
    sleep 1
  done
  echo "no screenshot for $2" >&2
  return 1
}
for dir in "$out"/dist/og/*/; do
  slug="$(basename "$dir")"
  shot 1200,630 "$slug" "$out/$slug.png"
  sips -s format jpeg -s formatOptions 88 "$out/$slug.png" --out "$site/public/og/$slug.jpg" >/dev/null
  echo "wrote public/og/$slug.jpg"
done
cp "$out/home.png" "$site/public/og.png"
# Square cards for Instagram; home, buy and bi also go to the Desktop as PNGs.
insta="$HOME/Desktop/khensu-instagram"
mkdir -p "$insta"
for slug in home buy shield bi; do
  shot 1080,1080 "$slug" "$out/$slug-square.png"
  sips -s format jpeg -s formatOptions 88 "$out/$slug-square.png" --out "$site/public/og/$slug-square.jpg" >/dev/null
  echo "wrote public/og/$slug-square.jpg"
done
cp "$out/home-square.png" "$insta/khensu-nu-square.png"
cp "$out/buy-square.png" "$insta/khensu-nu-buy-square.png"
cp "$out/bi-square.png" "$insta/khensu-bi-square.png"
