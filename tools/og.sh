#!/bin/sh
# Screenshots every built /og/<slug>/ card (khensu-nu, src/data/og.ts) to public/og/<slug>.jpg, 1200 x 630, and the
# home card to public/og.png for old links.
set -eu
site="$(cd "$(dirname "$0")/../sites/khensu-nu" && pwd)"
port=8765
(cd "$site/dist" && python3 -m http.server "$port" >/dev/null 2>&1) &
server=$!
trap 'kill $server' EXIT
sleep 1
mkdir -p "$site/public/og" "$site/dist/og"
for dir in "$site"/dist/og/*/; do
  slug=$(basename "$dir")
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
    --window-size=1200,630 --virtual-time-budget=4000 \
    --screenshot="/tmp/og-$slug.png" "http://localhost:$port/og/$slug/" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 82 "/tmp/og-$slug.png" --out "$site/public/og/$slug.jpg" >/dev/null
  cp "$site/public/og/$slug.jpg" "$site/dist/og/$slug.jpg"
  echo "wrote og/$slug.jpg"
done
cp /tmp/og-home.png "$site/public/og.png"
cp "$site/public/og.png" "$site/dist/og.png"
