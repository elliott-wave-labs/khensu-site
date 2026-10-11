#!/bin/sh
# Publishes khensu.nu, dev.khensu.nu and the elliottwave.studio khensu page whenever their sources change.
# A site is published only after a clean build, because publish-sites.sh deletes remote files missing from dist.
#   sh tools/autopublish.sh            # every 60 s
#   INTERVAL=30 sh tools/autopublish.sh
HERE="$(cd "$(dirname "$0")/.." && pwd)"
MOQOM="$HOME/Documents/GitHub/moqom-cloud"
STUDIO="$MOQOM/sites/elliottwave-studio"
INTERVAL="${INTERVAL:-60}"
STATE="${TMPDIR:-/tmp}/khensu-autopublish"
mkdir -p "$STATE"

stamp() {
  find "$@" -type f ! -name '.DS_Store' -newer "$STATE/epoch" 2>/dev/null | head -1
}

publish() {
  while pgrep -f publish-sites.sh >/dev/null; do sleep 5; done
  (cd "$MOQOM" && MOQOM_SITES_SKIP_BUILD=1 MOQOM_SITES_DIR="$HERE/sites" sh moqom-pq/deploy/tools/publish-sites.sh "$1" > "$STATE/pub-$1.log" 2>&1)
  if tail -1 "$STATE/pub-$1.log" | grep -q 'done'; then echo "$(date +%T) published $1"; else echo "$(date +%T) publish $1 failed, see $STATE/pub-$1.log"; fi
}

build() {
  (cd "$1" && pnpm -s build > "$STATE/build-$2.log" 2>&1)
  grep -q 'Complete!' "$STATE/build-$2.log" && ! grep -qi '\[ERROR\]\|error:' "$STATE/build-$2.log"
}

touch -t 197001010000 "$STATE/epoch"
while :; do
  touch "$STATE/next"
  if [ -n "$(stamp "$HERE/sites/khensu-nu/src" "$HERE/sites/khensu-nu/public" "$HERE/sites/_shared")" ]; then
    if build "$HERE/sites/khensu-nu" khensu-nu; then
      publish khensu-nu
      if sh "$HERE/tools/sync-studio.sh" > "$STATE/sync.log" 2>&1 && build "$STUDIO" studio; then
        (cd "$MOQOM" && MOQOM_SITES_SKIP_BUILD=1 sh moqom-pq/deploy/tools/publish-sites.sh elliottwave-studio > "$STATE/pub-studio.log" 2>&1) && echo "$(date +%T) published elliottwave-studio"
      else
        echo "$(date +%T) studio sync or build failed, see $STATE"
      fi
    else
      echo "$(date +%T) khensu-nu build failed, not published (see $STATE/build-khensu-nu.log)"
    fi
  fi
  if [ -n "$(stamp "$HERE/sites/khensu-dev/src" "$HERE/sites/khensu-dev/public" "$HERE/sites/_shared" "$HOME/Documents/GitHub/khensu/khensu-specs/WEBE.md" "$HOME/Documents/GitHub/khensu/khensu-specs/PROTOCOL.md" "$HOME/Documents/GitHub/khensu/khensu-specs/WORK.md" "$HOME/Documents/GitHub/khensu/khensu-specs/COMPLIANCE.md" "$HOME/Documents/GitHub/khensu/khensu-specs/THREAT-MODEL.md" "$HOME/Documents/GitHub/khensu/khensu-specs/design")" ]; then
    python3 "$HERE/tools/sync-specs.py" > /dev/null 2>&1
    if build "$HERE/sites/khensu-dev" khensu-dev; then publish khensu-dev; else echo "$(date +%T) khensu-dev build failed, not published"; fi
  fi
  mv "$STATE/next" "$STATE/epoch"
  sleep "$INTERVAL"
done
