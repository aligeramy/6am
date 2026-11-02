# 6am

## J.A.R.V.I.S. life dashboard (`/jarvis`)

A private, voice-driven HUD for seven pillars of life: Health, Wealth, Career, Mind, Habits, Missions and Spirit.
It lives at `/jarvis`, is not linked from the album site, and is marked `noindex`.

```bash
pnpm install
pnpm dev            # open http://localhost:3000/jarvis
```

### What it does

- **Boot sequence**: the arc reactor powers on and each pillar comes online, then JARVIS greets you. Turn it off in settings, or press Esc to skip.
- **Arc reactor**: shows your Life Index (0–100) with a ring segment per pillar. Hover a segment for its score, click to open the pillar.
- **Pillar panels**: quick-log buttons on each panel, plus a full detail view with 30-day charts, history, and editors for projects, habits, missions and vision.
- **Voice + chat**: click the mic, or turn on the **"Hey JARVIS"** wake word (the radio icon in the top bar) and just talk. Replies are spoken in the browser's British voice.
- **Morning briefing**: delivered at your wake time, or the first time you open JARVIS after it. You can also trigger it with the Briefing button.
- **Form of address**: change it in Settings, or say *"Jarvis, call me Boss."*

### Things to say

| You say | JARVIS does |
|---|---|
| "I slept 7.5 hours, spent $40 on dinner and did 2 hours in the studio" | Logs sleep, an expense and deep work |
| "Meditated 15 minutes" / "Read 30 minutes" / "Mood 8" | Mind telemetry |
| "Ran 5k" / "Gym 60 minutes" / "Drank 3 glasses of water" | Health telemetry |
| "Earned $850 from the show" / "Net worth is 42k" | Wealth |
| "New habit Cold shower" / "Completed cold shower" | Habits |
| "New mission Release the album" / "Release the album to 60%" | Missions |
| "Grateful for my family" / "Journal: …" | Spirit & journal |
| "Status report" / "Brief me" | Reports |
| "Call me Chief" | Changes how JARVIS addresses you |

### Environment variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Gives JARVIS a full Claude brain: free-form conversation, coaching from your data, and smarter logging. Without it, a built-in parser handles the commands above and briefings are assembled locally. |
| `JARVIS_ACCESS_CODE` | Recommended once deployed. The `/api/jarvis` endpoint only answers browsers whose access code (Settings → Security) matches, so strangers can't spend your API credits. |

Put them in `.env.local` locally, or in your Vercel project settings.

### Deploy without a server (Netlify Drop)

```bash
pnpm build:static    # -> jarvis-static.zip (dashboard at "/", no server route)
```

Drag the zip onto [app.netlify.com/drop](https://app.netlify.com/drop). To give this version Claude, open
Settings → **Neural link · Claude** and paste your Anthropic API key. The browser then talks to Anthropic directly.
The key is stored only in that browser, sent only to Anthropic, and left out of backups, so use it only on your own devices,
and consider setting a monthly spend limit in the Anthropic console.

### Data

Everything is stored in your browser (`localStorage`). Use Settings → Export backup regularly. **Load sample data** in Settings fills every panel so you can explore. Cloud sync through the existing Supabase setup is the natural next step.

### Code map

- `app/jarvis/`: route, fonts and HUD stylesheet
- `app/api/jarvis/route.ts`: Claude endpoint (tool use; the browser applies the returned actions)
- `lib/jarvis/claude.ts`: the shared brain (persona, tools, tool loop), used by the server route and by browser-key mode
- `scripts/build-static.sh`: static build for drag-and-drop hosting
- `components/jarvis/`: arc reactor, boot sequence, panels, console, settings
- `lib/jarvis/`: store, scoring, the offline command parser, voice engine, briefing
