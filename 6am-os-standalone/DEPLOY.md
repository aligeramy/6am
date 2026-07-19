# Deploying 6am OS to Netlify

## Option 1: Manual Drag-and-Drop (fastest)

1. `npm install && npm run build`
2. Go to [Netlify](https://app.netlify.com) → **Add new site → Deploy manually**
3. Drag the **`dist`** folder onto the upload area.

## Option 2: GitHub Import

Push this folder to its own repo, then **Add new site → Import an existing project**.
Netlify auto-detects settings from `netlify.toml` (build: `npm run build`, publish: `dist`).

## Routing

Uses `HashRouter`, so all routes work on Netlify with no special redirect rules.
`netlify.toml` and `public/_redirects` are included as a safety net.

## Environment Variables

None required — fully client-side.
