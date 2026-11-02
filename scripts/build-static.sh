#!/usr/bin/env bash
# Build a server-free copy of the JARVIS dashboard (served at "/") for drag-and-drop
# hosts such as Netlify Drop. Claude works there via the API key you paste in Settings.
#
#   pnpm build:static      ->  jarvis-static.zip in the repo root
#
# The repo itself is untouched: the build runs in a temporary copy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

tar -C "$ROOT" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./out --exclude=./jarvis-static.zip -cf - . | tar -C "$WORK" -xf -
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cd "$WORK"

# Dashboard becomes the home page; drop the album page and the server route.
rm -rf app/api app/page.tsx
mkdir -p "app/(jarvis)"
mv app/jarvis/layout.tsx app/jarvis/page.tsx app/jarvis/jarvis.css "app/(jarvis)/"
rmdir app/jarvis

node - <<'EOF'
const fs = require("fs")
const cfg = fs.readFileSync("next.config.mjs", "utf8").replace("const nextConfig = {", "const nextConfig = {\n  output: 'export',")
fs.writeFileSync("next.config.mjs", cfg)
const m = JSON.parse(fs.readFileSync("app/site.webmanifest", "utf8"))
Object.assign(m, { name: "J.A.R.V.I.S.", short_name: "JARVIS", theme_color: "#01050a", background_color: "#01050a", start_url: "/" })
fs.writeFileSync("app/site.webmanifest", JSON.stringify(m, null, 2))
EOF

npx next build

cd out
# Album media isn't used by the dashboard; icons referenced by the layout live in app/.
rm -rf albums videos images placeholder* index.txt
cp ../app/favicon.svg ../app/favicon-96x96.png ../app/apple-touch-icon.png ../app/site.webmanifest \
  ../app/web-app-manifest-192x192.png ../app/web-app-manifest-512x512.png .

rm -f "$ROOT/jarvis-static.zip"
zip -qr "$ROOT/jarvis-static.zip" .
echo "Built $ROOT/jarvis-static.zip ($(du -h "$ROOT/jarvis-static.zip" | cut -f1))"
