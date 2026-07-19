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

## Deployment

See [DEPLOY.md](./DEPLOY.md).
