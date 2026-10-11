#!/bin/sh
# Copies the khensu pieces into the elliottwave.studio site, which lives outside git:
# shared components, scripts and styles from sites/khensu-nu, the studio homepage from studio/,
# and the studio's /khensu page generated from the khensu.nu homepage.
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
STUDIO="${STUDIO_DIR:-$HOME/Documents/GitHub/moqom-cloud/sites/elliottwave-studio}"
K="$HERE/sites/khensu-nu/src"
cp "$K"/components/khensu/*.astro "$STUDIO/src/components/khensu/"
cp "$K/scripts/scenes.ts" "$STUDIO/src/scripts/scenes.ts"
mkdir -p "$STUDIO/src/data" && cp "$K"/data/*.ts "$STUDIO/src/data/"
rsync -a --delete "$HERE/sites/khensu-nu/public/khensu/shell/" "$STUDIO/public/khensu/shell/"
sed 's/--accent: #18e0c8;/--accent: #f59e0b;/' "$K/styles/global.css" > "$STUDIO/src/styles/global.css"
cp "$HERE/studio/pages/index.astro" "$STUDIO/src/pages/index.astro"
python3 - "$K/pages/index.astro" "$STUDIO/src/pages/khensu.astro" <<'PY'
import sys
s = open(sys.argv[1]).read()
swaps = [
    ("""<Base>
  <Hero
    eyebrow="The first app on webE"
    links={[
      { href: APP_STORE_URL, label: 'App Store · Coming soon' },
      { href: '#run-a-node', label: 'Run a node' },
      { href: 'https://dev.khensu.nu', label: 'Developer docs' },
    ]}
  />""", """<Base
  title="khensu.nu"
  description="khensu.nu is a post-quantum private messenger on a network run by people: messages, calls, feeds, forums, sites and private payments, with private AI that runs only on your device."
>
  <Hero eyebrow="elliottwave.studio lab · Flagship 00000000" cta={false} />"""),
    ("""<a class="btn primary" href="#run-a-node">Run a node</a>
          <a class="btn" href="https://dev.khensu.nu">Developer docs</a>""",
     """<a class="btn primary" href="https://khensu.nu">Visit khensu.nu</a>
          <a class="btn" href="#run-a-node">Run a node</a>"""),
    ('<a class="btn" href="https://dev.khensu.nu/node">Node guide</a>', '<a class="btn" href="/">Back to the studio</a>'),
    ('<a class="btn primary" href="/buy">Buy suñůlink.shield</a>', '<a class="btn primary" href="https://khensu.nu/buy">Buy suñůlink.shield</a>'),
]
for a, b in swaps:
    assert a in s, a[:60]
    s = s.replace(a, b)
open(sys.argv[2], "w").write(s)
PY
echo "synced into $STUDIO"
