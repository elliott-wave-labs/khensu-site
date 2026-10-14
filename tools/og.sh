#!/bin/sh
# Screenshots every /og/<slug>/ card (khensu-nu, see src/data/og.ts) to public/og/<slug>.jpg, the 1200 x 630
# link-preview images, and /og/home/ to public/og.png; then the squares and the transparent word overlays that
# tools/og-anim.sh lays over video. Builds into its own directory so it never touches dist.
set -eu
site="$(cd "$(dirname "$0")/../sites/khensu-nu" && pwd)"
out="${TMPDIR:-/tmp}/khensu-og"
port=8765
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
rm -rf "$out"
mkdir -p "$out"
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
  case "$slug" in overlay) continue ;; esac
  shot 1200,630 "$slug" "$out/$slug.png"
  sips -s format jpeg -s formatOptions 88 "$out/$slug.png" --out "$site/public/og/$slug.jpg" >/dev/null
  echo "wrote public/og/$slug.jpg"
done
cp "$out/home.png" "$site/public/og.png"
# Square cards for Instagram link pages and posts, plus the thumbnail card.
insta="$HOME/Desktop/khensu-instagram"
mkdir -p "$insta"
for slug in home buy shield bi thumb; do
  shot 1080,1080 "$slug" "$out/$slug-square.png"
  sips -s format jpeg -s formatOptions 88 "$out/$slug-square.png" --out "$site/public/og/$slug-square.jpg" >/dev/null
  echo "wrote public/og/$slug-square.jpg"
done
desk() {
  cp "$out/$1-square.png" "$insta/$2.png"
  sips -s format jpeg -s formatOptions 100 "$out/$1-square.png" --out "$insta/$2.jpg" >/dev/null
}
desk home khensu-nu-square
desk buy khensu-nu-buy-square
desk bi khensu-bi-square
desk thumb khensu-nu-link-thumb
for px in 128 256 512; do
  sips -Z "$px" "$out/thumb-square.png" --out "$insta/khensu-nu-link-thumb-$px.png" >/dev/null
done
# Word overlays: square (anim squares) and wide (iMessage landscape).
for slug in home buy thumb; do
  for try in 1 2 3; do
    rm -f "$out/$slug-overlay.png"
    "$chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 \
      --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1080,1080 --virtual-time-budget=6000 \
      --screenshot="$out/$slug-overlay.png" "http://localhost:$port/og/overlay/$slug/" >/dev/null 2>&1 || true
    [ -s "$out/$slug-overlay.png" ] && break
    sleep 1
  done
  for try in 1 2 3; do
    rm -f "$out/$slug-overlay-wide.png"
    "$chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 \
      --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1200,630 --virtual-time-budget=6000 \
      --screenshot="$out/$slug-overlay-wide.png" "http://localhost:$port/og/overlay/$slug/" >/dev/null 2>&1 || true
    [ -s "$out/$slug-overlay-wide.png" ] && break
    sleep 1
  done
done
echo "overlays in $out; run tools/og-anim.sh for the animated cards"
