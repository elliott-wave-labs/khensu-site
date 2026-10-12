#!/bin/sh
# Builds ñü.Føňt and puts it where the sites read it:
#   sites/khensu-nu/public/fonts/nufont/   variable TTF + WOFF2, twelve static TTFs, a zip of everything, nufont.json
#   sites/khensu-dev/public/fonts/nufont/  the variable WOFF2 (the dev site only uses it for display)
#   src/data/nufont-marks.ts               inline SVG wordmarks for khensu-nu and khensu-dev
# Needs the venv from: uv venv .venv && uv pip install --python .venv/bin/python fonttools brotli
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PY="$HERE/.venv/bin/python"
OUT="$HERE/dist"
NU="$ROOT/sites/khensu-nu/public/fonts/nufont"
DEV="$ROOT/sites/khensu-dev/public/fonts/nufont"

rm -rf "$OUT"
"$PY" "$HERE/nufont.py" build "$OUT"
mkdir -p "$NU" "$DEV"
rm -f "$NU"/nuFont-* "$NU"/nufont.json "$NU"/nufont.zip
cp "$OUT"/nuFont-*.ttf "$OUT"/nuFont-Variable.woff2 "$OUT"/nufont.json "$NU/"
cp "$OUT"/nuFont-Variable.woff2 "$DEV/"
(cd "$OUT" && rm -f nufont.zip && zip -q -X nufont.zip nuFont-*.ttf nufont.json && mv nufont.zip "$NU/")
"$PY" "$HERE/nufont.py" marks "$ROOT/sites/khensu-nu/src/data/nufont-marks.ts" "$ROOT/sites/khensu-dev/src/data/nufont-marks.ts"
ls -la "$NU" | awk '{print $5, $9}' | sed '1d'
