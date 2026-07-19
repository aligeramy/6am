# 6am OS — Artist Command Center

A standalone, local-first dashboard for organizing the music career of the artist **6am**.

Fully independent Vite + React + TypeScript static site with no backend, no auth, and no
database — everything is stored in your browser's `localStorage`.

## Sections

1. **Home** — active release, today's priorities checklist, quick idea capture, snapshot stats
2. **Calendar** — content calendar: releases, content posts, and studio sessions with drag-and-drop rescheduling
3. **Songs** — kanban-style pipeline by stage
4. **Budget** — income/expenses grouped by song

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `dist/` — a fully static site.

## Data

Stored in `localStorage` under `6am-os-storage`. Use **Export JSON** / **Import JSON**
in the top bar to back up or move data between browsers/devices.

## Device Sync

The **Sync** button in the top bar keeps two devices (e.g. iPhone + laptop) automatically
in sync via a Netlify Function backed by Netlify Blobs (`netlify/functions/sync.mts`).
Start sync on one device, enter the generated code on the other.

Sync requires the site to be deployed on Netlify **via Git import** (functions don't run
on manual drag-and-drop deploys). On a manual deploy the app detects this and falls back
to local-only storage with Export/Import JSON.

## Deployment

See [DEPLOY.md](./DEPLOY.md).
