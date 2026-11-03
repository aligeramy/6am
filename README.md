# 6am

## J.A.R.E.D. life dashboard (`/jared`)

A private, voice-driven HUD for seven pillars of life (Health, Wealth, Career, Mind, Habits, Missions and Spirit), plus an ideas vault and a Workshop that changes the app itself.
It lives at `/jared` (the old `/jarvis` link redirects there), is not linked from the album site, and is marked `noindex`.

```bash
pnpm install
pnpm dev            # open http://localhost:3000/jared
```

### What it does

- **Daily ritual**: a two-minute **morning plan** (energy, Top 3, intention) and an **evening review** (check off priorities, rate the day, win, lesson, tomorrow's #1). Jared then gives a candid debrief: what got done, the main gap, and one specific fix for tomorrow.
- **Focus timer**: start a 25/50/90-minute session from a priority, the Focus tile, or by voice; the arc reactor becomes the countdown and the time is logged as deep work when it ends.
- **Progress**: a 30-day Life Index trend, **insights** from your own data (each with a concrete fix), **suit levels** (XP from showing up, Mark I to Mark L) and **achievements**.
- **Weather**: set your city in Settings for live weather in the HUD and in briefings (Open-Meteo, no key needed).
- **Boot sequence**: the arc reactor powers on, each pillar comes online, then Jared greets you. Press Esc to skip, or turn it off in Settings.
- **Arc reactor**: shows your Life Index (0–100) with a ring segment per pillar. Hover a segment for its score, click it to open the pillar.
- **Two looks**: the classic HUD (angular frames, corner brackets, scanlines, segmented meters) is the default; a softer glass style is one tap away in the Workshop.
- **Sections**: greeting, Today, habits, missions and ideas on the left; insights and pillar cards on the right. Every section can be **minimized** with the chevron in its header; the app remembers which ones you minimized.
- **Ideas**: capture ideas by typing, by the mic, or by saying *"Jared, idea: …"*. Rate them 1–5 stars, add notes over time, tag them, set a status, and search, sort or filter the whole vault.
- **Workshop** (wrench icon): a separate Claude that changes the app itself: colors, text size, section names, hiding, minimizing and moving sections, custom styling, and fixes to your data. It asks a question when something's unclear, and every change has an Undo. Its **Controls** tab does the same things by hand. Without Claude it still handles colors, text size and sections.
- **Voice + chat**: click the mic, or turn on the **"Hey Jared"** wake word (radio icon) and just talk. Replies are spoken in the browser's British voice.
- **Morning briefing**: delivered at your wake time, or the first time you open Jared after it. You can also run it from the sun icon.

### Things to say

| You say | Jared does |
|---|---|
| "I slept 7.5 hours, spent $40 on dinner and did 2 hours in the studio" | Logs sleep, an expense and deep work |
| "Meditated 15 minutes" / "Read 30 minutes" / "Mood 8" | Mind telemetry |
| "Ran 5k" / "Gym 60 minutes" / "Drank 3 glasses of water" | Health telemetry |
| "Earned $850 from the show" / "Net worth is 42k" | Wealth |
| "Idea: start a podcast about making music, 4 stars" / "What if we did a vinyl-only release" | Captures an idea |
| "Rate the podcast idea 5 stars" / "Add a note to the podcast idea: invite producers" | Rates or annotates an idea |
| "New habit Cold shower" / "Completed cold shower" | Habits |
| "New mission Release the album" / "Release the album to 60%" | Missions |
| "Grateful for my family" / "Journal: …" | Spirit & journal |
| "Status report" / "Brief me" | Reports |
| "Top 3: mix track 3, gym and call mom" / "Done with the gym" | Sets or checks off today's priorities |
| "Focus 50 minutes on mixing" / "Stop focus" | Starts or ends a focus session |
| "Plan my day" / "Evening review" | Opens the ritual |
| "Open the workshop" / "Open ideas" | Opens a panel |
| "Call me Chief" | Changes how Jared addresses you |

In the Workshop: *"Make it red and gold like the suit"*, *"Rename Spirit to Faith"*, *"Hide wealth"*, *"Minimize everything except habits"*, *"Make the text bigger"*, *"Delete the duplicate sleep entry from yesterday"*.

### Environment variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Gives Jared and the Workshop a full Claude brain. Without it, a built-in parser handles the commands above and briefings are assembled locally. |
| `JARVIS_ACCESS_CODE` | Recommended once deployed. The `/api/jarvis` endpoint only answers browsers whose access code (Settings → Security) matches, so strangers can't spend your API credits. |

Put them in `.env.local` locally, or in your hosting provider's settings.

### Deploy without a server (Netlify Drop)

```bash
pnpm build:static    # -> jared-static.zip (dashboard at "/", no server route)
```

Drag the zip onto [app.netlify.com/drop](https://app.netlify.com/drop), or onto an existing site's **Deploys** tab to update it in place.
To give this version Claude, open Settings → **Neural link · Claude** and paste your Anthropic API key. The browser then talks to Anthropic directly.
The key is stored only in that browser, sent only to Anthropic, and left out of backups, so use it only on your own devices,
and consider setting a monthly spend limit in the Anthropic console.

### Data

Everything is stored in your browser (`localStorage`). Use Settings → Export backup regularly. **Load sample data** in Settings fills every panel so you can explore. Cloud sync through the existing Supabase setup is the natural next step.

### Code map

- `app/jared/`: route, fonts and HUD stylesheet (`/jarvis` redirects here)
- `app/api/jarvis/route.ts`: Claude endpoint (tool use; the browser applies the returned actions)
- `lib/jarvis/claude.ts`: the shared brain: persona, tools and tool loop for Jared and for the Workshop
- `lib/jarvis/workshop-local.ts`: the Workshop's offline parser
- `lib/jarvis/progress.ts`, `ritual.ts`, `weather.ts`: XP, achievements, insights, the daily ritual, and weather
- `components/jarvis/`: arc reactor, boot sequence, cards, ideas, Workshop, command bar, settings
- `lib/jarvis/`: store, scoring, actions, the offline command parser, voice engine, briefing
- `scripts/build-static.sh`: static build for drag-and-drop hosting
