#!/usr/bin/env bash
# Build a server-free copy of one app, served at "/", for drag-and-drop hosts such as Netlify Drop.
#
#   pnpm build:static          ->  4m-static.zip     (the 4M app: Mind, Muscle, Money, Music)
#   pnpm build:static jared    ->  jared-static.zip  (the Jared dashboard)
#
# The repo itself is untouched: the build runs in a temporary copy.
set -euo pipefail

TARGET="${1:-4m}"
case "$TARGET" in
  4m) DIR=4m; FILES="layout.tsx page.tsx fourm.css"; ZIP=4m-static.zip ;;
  jared) DIR=jared; FILES="layout.tsx page.tsx jarvis.css"; ZIP=jared-static.zip ;;
  *) echo "Unknown target '$TARGET' (use 4m or jared)" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

tar -C "$ROOT" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./out --exclude='./*-static.zip' -cf - . | tar -C "$WORK" -xf -
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cd "$WORK"

# The chosen app becomes the home page; drop the album page, the server route and the other apps.
mkdir -p "app/($DIR)"
for f in $FILES; do mv "app/$DIR/$f" "app/($DIR)/"; done
rm -rf app/api app/page.tsx app/jarvis app/jared app/4m

TARGET="$TARGET" node - <<'EOF'
const fs = require("fs")
const cfg = fs.readFileSync("next.config.mjs", "utf8").replace("const nextConfig = {", "const nextConfig = {\n  output: 'export',")
fs.writeFileSync("next.config.mjs", cfg)
if (process.env.TARGET === "4m") {
  const p = "public/4m/manifest.webmanifest"
  const m = JSON.parse(fs.readFileSync(p, "utf8"))
  fs.writeFileSync(p, JSON.stringify({ ...m, start_url: "/" }, null, 2))
} else {
  const m = JSON.parse(fs.readFileSync("app/site.webmanifest", "utf8"))
  Object.assign(m, { name: "J.A.R.E.D.", short_name: "Jared", theme_color: "#01050a", background_color: "#01050a", start_url: "/" })
  fs.writeFileSync("app/site.webmanifest", JSON.stringify(m, null, 2))
}
EOF

npx next build

cd out
# Album media isn't used by either app.
rm -rf albums videos images placeholder* index.txt
if [ "$TARGET" = "jared" ]; then
  # Icons referenced by Jared's layout live in app/.
  cp ../app/favicon.svg ../app/favicon-96x96.png ../app/apple-touch-icon.png ../app/site.webmanifest \
    ../app/web-app-manifest-192x192.png ../app/web-app-manifest-512x512.png .
fi

rm -f "$ROOT/$ZIP"
zip -qr "$ROOT/$ZIP" .
echo "Built $ROOT/$ZIP ($(du -h "$ROOT/$ZIP" | cut -f1))"
