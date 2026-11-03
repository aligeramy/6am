import type Anthropic from "@anthropic-ai/sdk"

/* The Jared brain, shared by the server route (app/api/jarvis) and the browser
   (when you paste your own API key in Settings, e.g. on a static Netlify deploy). */

export const MODEL = "claude-opus-5-5"

const PERSONA = `You are J.A.R.E.D. (Jared for short), the personal life operating system of one person. You run their life dashboard, which tracks seven pillars: health, wealth, career (creative work, music, business), mind, daily habits, missions (goals), and spirit (purpose, gratitude, values), plus an ideas vault where they capture and rate ideas.

Voice and manner: a composed, quick, dryly witty British AI butler. Precise and warm underneath. Address the user by their chosen form of address (given in the snapshot); use it naturally, about once per reply, not in every sentence.

Your replies are spoken aloud by a speech synthesizer and shown in a HUD console, so write plain spoken sentences: no markdown, lists, headings, emoji, or URLs. Keep ordinary replies to one to three sentences. Spell numbers the way they should be said when it helps ("seven and a half hours").

Tracking: when the user reports something they did, spent, earned, felt, or wants to track, call the matching tool, once per distinct item, then confirm in one short line. Use the user's local date from the snapshot; only pass a date when they refer to another day ("yesterday"). Metric ids: sleep (hours), workout (minutes), water (glasses), weight, energy (1-10), deepwork (minutes of focused work, including studio, writing, coding, producing), shipped (count of finished releases or deliverables), reading, meditation, learning, reflection (minutes), mood (1-10). Habits, missions and ideas must be referenced by the names in the snapshot. If the user asks to be called something different, call set_form_of_address immediately.

Ideas: when the user shares an idea ("idea: ...", "what if we...", "I have an idea"), capture it with create_idea using a short, clear title; put extra detail in the note. Ratings are 1 to 5 stars. "Add a note to the X idea" means annotate_idea. If they want to change how the app itself looks or is laid out, tell them the Workshop can do that and offer to open it (open_panel with "workshop").

Answering: ground every number in the snapshot. Never invent data that isn't there; if something isn't tracked yet, say so and suggest how to log it. When asked for advice, be specific to their data and targets, and favour one clear next action over a list.`

const BRIEFING_INSTRUCTIONS = `Deliver the morning briefing now. Speak it as one flowing piece of about 120 to 170 words: greet them with the day and date; give the life index; the priority mission and its deadline; which habits are pending today and any streak worth protecting; last night's sleep against target; a one-line money snapshot; then one specific recommendation for today based on their weakest pillar. If they have a life vision, close with a short line tying today to it. If data is thin, keep it shorter and tell them what to log. Do not call any tools.`

const str = (description: string) => ({ type: "string" as const, description })
const PILLAR_ENUM = ["health", "wealth", "career", "mind", "habits", "missions", "spirit"]
const SECTION_ENUM = ["greeting", "habits", "missions", "ideas", "health", "wealth", "career", "mind", "spirit"]

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "log_metric",
    description: "Log a numeric measurement for today (or a given date): sleep hours, workout minutes, water glasses, weight, energy 1-10, deepwork minutes, shipped count, reading/meditation/learning/reflection minutes, mood 1-10.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["sleep", "workout", "water", "weight", "energy", "deepwork", "shipped", "reading", "meditation", "learning", "reflection", "mood"],
        },
        value: { type: "number", description: "Hours for sleep, minutes for durations, count for water/shipped, 1-10 for mood/energy." },
        note: str("Optional short context, e.g. 'leg day' or 'mixing track 3'."),
        date: str("YYYY-MM-DD, only when not today."),
      },
      required: ["metric", "value"],
      additionalProperties: false,
    },
  },
  {
    name: "add_transaction",
    description: "Record money spent or earned.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["income", "expense"] },
        amount: { type: "number", description: "Positive amount in the user's currency." },
        category: str("Lowercase category, e.g. food, rent, transport, studio, gear, subscriptions, health, fun, shopping, travel, bills, salary, shows, streaming, freelance, sales, investment, other."),
        note: str("Optional short description."),
        date: str("YYYY-MM-DD, only when not today."),
      },
      required: ["kind", "amount", "category"],
      additionalProperties: false,
    },
  },
  {
    name: "complete_habit",
    description: "Mark one of the user's existing habits as done.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { habit: str("Habit name exactly as in the snapshot."), date: str("YYYY-MM-DD, only when not today.") },
      required: ["habit"],
      additionalProperties: false,
    },
  },
  {
    name: "create_habit",
    description: "Start tracking a new daily habit.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { name: str("Short habit name, e.g. 'Cold shower'.") },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "create_mission",
    description: "Create a new mission (goal), optionally broken into milestones.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: str("Concise mission title."),
        pillar: { type: "string", enum: PILLAR_ENUM, description: "Which life pillar it serves." },
        horizon: { type: "string", enum: ["week", "quarter", "year", "life"] },
        due: str("YYYY-MM-DD deadline, if any."),
        milestones: { type: "array", items: { type: "string" }, description: "Ordered milestone titles." },
      },
      required: ["title", "pillar", "horizon"],
      additionalProperties: false,
    },
  },
  {
    name: "update_mission",
    description: "Update an existing mission: set progress, mark complete, or tick off a milestone.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: str("Mission title as in the snapshot."),
        progress: { type: "number", description: "0-100." },
        status: { type: "string", enum: ["active", "done"] },
        complete_milestone: str("Milestone title to tick off."),
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "upsert_project",
    description: "Create or update a career or creative project (song, album, product, client job).",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        name: str("Project name."),
        status: { type: "string", enum: ["idea", "active", "paused", "shipped"] },
        progress: { type: "number", description: "0-100." },
        note: str("Optional note."),
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "add_journal_entry",
    description: "Save a journal entry, gratitude, reflection, or win.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { kind: { type: "string", enum: ["journal", "gratitude", "reflection", "win"] }, text: str("The entry, in the user's words.") },
      required: ["kind", "text"],
      additionalProperties: false,
    },
  },
  {
    name: "set_form_of_address",
    description: "Change how Jared addresses the user, e.g. 'Sir', 'Boss', or their name.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { address: str("The new form of address, capitalised as it should be spoken.") },
      required: ["address"],
      additionalProperties: false,
    },
  },
  {
    name: "update_profile",
    description: "Update profile settings: name, wake time (HH:mm 24h), monthly budget, or life vision statement.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        name: str("User's name."),
        wake_time: str("HH:mm, 24-hour."),
        monthly_budget: { type: "number" },
        vision: str("Life vision statement."),
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "set_net_worth",
    description: "Record the user's current total net worth.",
    strict: true,
    input_schema: { type: "object", properties: { amount: { type: "number" } }, required: ["amount"], additionalProperties: false },
  },
  {
    name: "open_panel",
    description: "Bring a panel up on screen when the user asks to see it: a pillar, the ideas vault, or the Workshop (where the app itself can be changed).",
    strict: true,
    input_schema: {
      type: "object",
      properties: { pillar: { type: "string", enum: [...PILLAR_ENUM, "ideas", "workshop"] } },
      required: ["pillar"],
      additionalProperties: false,
    },
  },
  ...IDEA_TOOLS(),
]

function IDEA_TOOLS(): Anthropic.Beta.BetaTool[] {
  const idea = str("The idea's title as shown in the snapshot (a distinctive part is enough).")
  return [
    {
      name: "create_idea",
      description: "Capture a new idea in the ideas vault.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          title: str("Short, clear title for the idea."),
          note: str("Optional first note with any extra detail the user gave."),
          rating: { type: "integer", enum: [1, 2, 3, 4, 5], description: "Stars, only if the user gave a rating." },
          tags: { type: "array", items: { type: "string" }, description: "Optional lowercase tags, e.g. music, business." },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
    {
      name: "rate_idea",
      description: "Rate an existing idea from 1 to 5 stars.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { idea, rating: { type: "integer", enum: [1, 2, 3, 4, 5] } },
        required: ["idea", "rating"],
        additionalProperties: false,
      },
    },
    {
      name: "annotate_idea",
      description: "Add a note (annotation) to an existing idea.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { idea, note: str("The note, in the user's words.") },
        required: ["idea", "note"],
        additionalProperties: false,
      },
    },
    {
      name: "update_idea",
      description: "Rename an idea, change its status, or replace its tags.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          idea,
          title: str("New title."),
          status: { type: "string", enum: ["new", "exploring", "doing", "parked", "done"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["idea"],
        additionalProperties: false,
      },
    },
    {
      name: "delete_idea",
      description: "Delete an idea. Only when the user clearly asks to delete or remove it.",
      strict: true,
      input_schema: { type: "object", properties: { idea }, required: ["idea"], additionalProperties: false },
    },
  ]
}

/* ───────────────────────── Workshop: changes the app itself ───────────────────────── */

const WORKSHOP_PERSONA = `You are the Workshop: the engineering side of J.A.R.E.D., a personal life dashboard. The user talks to you to change the app itself: its look, its layout, its section names, and to fix or clean up their data. You also answer questions about how the app works.

What you can change, through your tools:
- Theme (set_theme): the accent color drives every glow, line and highlight; warning and danger colors are used for low scores and alerts; background is the page color; font_scale makes all text bigger or smaller (0.85 to 1.3). Use hex colors. For an "Iron Man suit" look use a red or gold accent (e.g. accent #ff3b3b with warning #ffc247, or accent #ffb640 with danger #ff4d4d). Keep danger visibly different from the accent.
- Sections (update_section): the dashboard has sections ${SECTION_ENUM.join(", ")}. Each can be renamed (title), hidden, minimized (collapsed), or moved to the left or right column at a 1-based position. Renaming changes only the label; the data stays.
- Custom CSS (set_custom_css): for anything else visual. The root element is .jarvis-root; cards use .glass; buttons .hud-btn; small caps labels .hud-label; display font .font-hud. CSS variables: --j-cyan (accent), --j-cyan-rgb, --j-amber, --j-red, --j-bg, --j-text, --j-muted. Prefer theme and section tools first; use CSS for things like corner radius, transparency, spacing or blur. Always scope selectors under .jarvis-root. Use mode "append" to add to existing CSS and "replace" to rewrite it (the current CSS is in the snapshot).
- Data fixes (delete_entries, edit_entry): use the ids in the snapshot. Before deleting more than three items, or anything ambiguous, ask first.
- reset_appearance puts every visual setting back to the original.

You cannot change the app's code or add new kinds of features, and you cannot reach the internet. If they ask for something like that, say so briefly and offer the closest thing you can do (often custom CSS, a renamed section, or a data change). When a request is ambiguous and the choice matters, call ask_user with a short question and two to four concrete options, then stop. Otherwise just do it.

Every change you make can be undone by the user with one tap, so act confidently. After changing things, reply in one or two short plain sentences saying what you changed. No markdown.`

const WORKSHOP_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "set_theme",
    description: "Change the app's colors and text size. Only include what should change.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        accent: str("Hex color for the main accent, e.g. #ff3b3b."),
        warning: str("Hex color for warnings and middling scores."),
        danger: str("Hex color for low scores and alerts."),
        background: str("Hex color for the page background; keep it very dark."),
        font_scale: { type: "number", description: "Text size multiplier between 0.85 and 1.3. 1 is default." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "update_section",
    description: "Rename, hide/show, minimize/expand, or move one dashboard section.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        section: { type: "string", enum: SECTION_ENUM },
        title: str("New display name. Empty string restores the original name."),
        hidden: { type: "boolean" },
        collapsed: { type: "boolean", description: "true minimizes the section to its header." },
        column: { type: "string", enum: ["left", "right"] },
        position: { type: "integer", description: "1-based position within the column." },
      },
      required: ["section"],
      additionalProperties: false,
    },
  },
  {
    name: "set_custom_css",
    description: "Apply custom CSS to the app for visual changes the theme can't express.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { css: str("CSS rules scoped under .jarvis-root. No @import or url()."), mode: { type: "string", enum: ["append", "replace"] } },
      required: ["css", "mode"],
      additionalProperties: false,
    },
  },
  {
    name: "reset_appearance",
    description: "Restore every visual and layout setting to the original design. Data is untouched.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "delete_entries",
    description: "Delete logged entries, transactions, journal entries or ideas by their ids from the snapshot.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
      required: ["ids"],
      additionalProperties: false,
    },
  },
  {
    name: "edit_entry",
    description: "Correct one logged entry or transaction by id: its value/amount, date, note, or (for money) category.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        id: str("Entry id from the snapshot."),
        value: { type: "number", description: "New value for a logged metric." },
        amount: { type: "number", description: "New amount for a transaction." },
        date: str("YYYY-MM-DD"),
        note: str("New note."),
        category: str("New category for a transaction."),
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "ask_user",
    description: "Ask the user a short clarifying question, offering concrete options they can tap. Then stop and wait.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { question: str("The question."), options: { type: "array", items: { type: "string" }, description: "Two to four short answers." } },
      required: ["question", "options"],
      additionalProperties: false,
    },
  },
]

export interface ClientMessage {
  role: "user" | "jarvis"
  text: string
}

export interface JarvisRequest {
  messages: ClientMessage[]
  snapshot: string
  mode?: "chat" | "briefing" | "workshop"
}

export interface JarvisResult {
  reply: string
  actions: { type: string; [k: string]: unknown }[]
}

/** Run one Jared turn (or Workshop turn): Claude may call tools; we collect them as actions for the browser to apply. */
export async function runJarvis(client: Anthropic, req: JarvisRequest): Promise<JarvisResult> {
  const snapshot = String(req.snapshot ?? "").slice(0, 20000)
  const history = (req.messages ?? []).slice(-14).filter((m) => m && typeof m.text === "string" && m.text.trim())

  // Plain-text history only; earlier turns' tool calls are reflected in the fresh snapshot.
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  for (const m of history) {
    const role = m.role === "user" ? "user" : "assistant"
    const last = messages[messages.length - 1]
    if (!last && role === "assistant") continue
    if (last && last.role === role) {
      last.content = `${last.content}\n${m.text}`
    } else {
      messages.push({ role, content: m.text.slice(0, 4000) })
    }
  }
  if (req.mode === "briefing") {
    if (messages.length && messages[messages.length - 1].role === "user") messages.pop()
    messages.push({ role: "user", content: BRIEFING_INSTRUCTIONS })
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw Object.assign(new Error("No user message to answer."), { code: "no_user_message" })
  }

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: req.mode === "workshop" ? WORKSHOP_PERSONA : PERSONA, cache_control: { type: "ephemeral" } },
    { type: "text", text: `CURRENT DATA SNAPSHOT\n${snapshot}` },
  ]

  const actions: JarvisResult["actions"] = []
  let reply = ""

  for (let turn = 0; turn < 6; turn++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Low effort keeps spoken replies snappy; raise it for deeper coaching.
      output_config: { effort: req.mode === "workshop" ? "medium" : "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      tools: req.mode === "briefing" ? undefined : req.mode === "workshop" ? WORKSHOP_TOOLS : TOOLS,
      messages,
    })

    if (response.stop_reason === "refusal") {
      reply = "I'm afraid that's one request I can't help with."
      break
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim()
    if (text) reply = text

    if (response.stop_reason !== "tool_use") break

    // Append the assistant turn verbatim (thinking blocks included), then answer each tool call.
    messages.push({ role: "assistant", content: response.content })
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== "tool_use") continue
      const input = (block.input ?? {}) as Record<string, unknown>
      const allowed = req.mode === "workshop" ? WORKSHOP_TOOLS : TOOLS
      if (!allowed.some((t) => t.name === block.name) || typeof input !== "object") {
        results.push({ type: "tool_result", tool_use_id: block.id, content: "Unknown tool.", is_error: true })
        continue
      }
      actions.push({ type: block.name, ...input })
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content:
          block.name === "ask_user"
            ? "The question is on screen with the options as buttons. Stop now; the user will answer in their next message."
            : "Done. The app has been updated.",
      })
    }
    messages.push({ role: "user", content: results })
  }

  return { reply, actions }
}
