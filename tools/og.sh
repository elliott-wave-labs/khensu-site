#!/bin/sh
# Screenshots the built /og-card page (khensu-nu) to public/og.png, the 1200 x 630 link-preview image.
set -eu
site="$(cd "$(dirname "$0")/../sites/khensu-nu" && pwd)"
port=8765
(cd "$site/dist" && python3 -m http.server "$port" >/dev/null 2>&1) &
server=$!
trap 'kill $server' EXIT
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1200,630 --virtual-time-budget=6000 \
  --screenshot="$site/public/og.png" "http://localhost:$port/og-card/" >/dev/null 2>&1
cp "$site/public/og.png" "$site/dist/og.png"
echo "wrote $site/public/og.png"
