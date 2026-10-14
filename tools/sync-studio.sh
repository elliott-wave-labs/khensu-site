#!/bin/sh
# Copies the khensu pieces into the elliottwave.studio site, which lives outside git:
# shared components, scripts and styles from sites/khensu-nu, the studio homepage from studio/,
# and the studio's /khensu page generated from the khensu.nu homepage.
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
STUDIO="${STUDIO_DIR:-$HOME/Documents/GitHub/moqom-cloud/sites/elliottwave-studio}"
K="$HERE/sites/khensu-nu/src"
cp "$K"/components/khensu/*.astro "$STUDIO/src/components/khensu/"
for f in "$STUDIO"/src/components/khensu/*.astro; do
  sed -i '' -e 's|href="/buy|href="https://khensu.nu/buy|g' -e 's|href="/creators|href="https://khensu.nu/creators|g' -e 's|href="/network|href="https://khensu.nu/network|g' -e 's|href="/compliance|href="https://khensu.nu/compliance|g' "$f"
done
cp "$K"/scripts/*.ts "$STUDIO/src/scripts/"
mkdir -p "$STUDIO/src/data" && cp "$K"/data/*.ts "$K"/data/*.json "$STUDIO/src/data/"
for d in shell codec hero; do
  rsync -a --delete "$HERE/sites/khensu-nu/public/khensu/$d/" "$STUDIO/public/khensu/$d/"
done
rm -rf "$STUDIO/public/fonts/nufont" "$STUDIO/public/fonts/dosis"
rm -f "$STUDIO/src/components/khensu/NuMark.astro" "$STUDIO/src/data/nufont-marks.ts"
sed 's/--accent: #18e0c8;/--accent: #f59e0b;/' "$K/styles/global.css" > "$STUDIO/src/styles/global.css"
cp "$HERE/studio/pages/index.astro" "$STUDIO/src/pages/index.astro"
python3 - "$K/pages/index.astro" "$STUDIO/src/pages/khensu.astro" <<'PY'
import sys
s = open(sys.argv[1]).read()
import re
s, n = re.subn(r"<Base>\s*<Hero[\s\S]*?/>", """<Base
  title="khensu.ñü"
  description="khensu.ñü is a post-quantum private messenger on a network run by people: messages, calls, feeds, forums, sites and private payments, with private AI that runs only on your device."
>
  <Hero eyebrow="elliottwave.studio lab · Flagship 00000000" cta={false} />""", s, count=1)
assert n == 1, "hero"
swaps = [
    ("""<a class="btn primary" href="#run-a-node">Run a node</a>
          <a class="btn" href="https://dev.khensu.nu">Developer docs</a>""",
     """<a class="btn primary" href="https://khensu.nu">Visit khensu.nu</a>
          <a class="btn" href="#run-a-node">Run a node</a>"""),
    ('<a class="btn" href="https://dev.khensu.nu/node">Node guide</a>', '<a class="btn" href="/">Back to the studio</a>'),
    ('<a class="btn primary" href="/buy">Buy suñůlink.shield</a>', '<a class="btn primary" href="https://khensu.nu/buy">Buy suñůlink.shield</a>'),
]
for a, b in swaps:
    s = s.replace(a, b)
open(sys.argv[2], "w").write(s)
PY
echo "synced into $STUDIO"
