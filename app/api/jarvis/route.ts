import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

const MODEL = "claude-opus-5-5"

const PERSONA = `You are J.A.R.V.I.S., the personal life operating system of one person. You run their life dashboard, which tracks seven pillars: health, wealth, career (creative work, music, business), mind, daily habits, missions (goals), and spirit (purpose, gratitude, values).

Voice and manner: a composed, quick, dryly witty British AI butler. Precise and warm underneath. Address the user by their chosen form of address (given in the snapshot); use it naturally, about once per reply, not in every sentence.

Your replies are spoken aloud by a speech synthesizer and shown in a HUD console, so write plain spoken sentences: no markdown, lists, headings, emoji, or URLs. Keep ordinary replies to one to three sentences. Spell numbers the way they should be said when it helps ("seven and a half hours").

Tracking: when the user reports something they did, spent, earned, felt, or wants to track, call the matching tool, once per distinct item, then confirm in one short line. Use the user's local date from the snapshot; only pass a date when they refer to another day ("yesterday"). Metric ids: sleep (hours), workout (minutes), water (glasses), weight, energy (1-10), deepwork (minutes of focused work, including studio, writing, coding, producing), shipped (count of finished releases or deliverables), reading, meditation, learning, reflection (minutes), mood (1-10). Habits and missions must be referenced by the names in the snapshot. If the user asks to be called something different, call set_form_of_address immediately.

Answering: ground every number in the snapshot. Never invent data that isn't there; if something isn't tracked yet, say so and suggest how to log it. When asked for advice, be specific to their data and targets, and favour one clear next action over a list.`

const BRIEFING_INSTRUCTIONS = `Deliver the morning briefing now. Speak it as one flowing piece of about 120 to 170 words: greet them with the day and date; give the life index; the priority mission and its deadline; which habits are pending today and any streak worth protecting; last night's sleep against target; a one-line money snapshot; then one specific recommendation for today based on their weakest pillar. If they have a life vision, close with a short line tying today to it. If data is thin, keep it shorter and tell them what to log. Do not call any tools.`

const str = (description: string) => ({ type: "string" as const, description })
const PILLAR_ENUM = ["health", "wealth", "career", "mind", "habits", "missions", "spirit"]

const TOOLS: Anthropic.Beta.BetaTool[] = [
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
    description: "Change how JARVIS addresses the user, e.g. 'Sir', 'Boss', or their name.",
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
    description: "Bring a pillar's detail panel up on screen when the user asks to see it.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { pillar: { type: "string", enum: PILLAR_ENUM } },
      required: ["pillar"],
      additionalProperties: false,
    },
  },
]

interface ClientMessage {
  role: "user" | "jarvis"
  text: string
}

const hasKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)

/** When JARVIS_ACCESS_CODE is set, only browsers that know it can spend your API credits. */
const authorized = (req: Request) => {
  const code = process.env.JARVIS_ACCESS_CODE
  return !code || req.headers.get("x-jarvis-code") === code
}

export async function GET(req: Request) {
  return NextResponse.json({ online: hasKey(), authorized: authorized(req), locked: !!process.env.JARVIS_ACCESS_CODE })
}

export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "offline" }, { status: 503 })
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { messages?: ClientMessage[]; snapshot?: string; mode?: "chat" | "briefing" }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const snapshot = String(body.snapshot ?? "").slice(0, 20000)
  const history = (body.messages ?? []).slice(-14).filter((m) => m && typeof m.text === "string" && m.text.trim())

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
  if (body.mode === "briefing") {
    if (messages.length && messages[messages.length - 1].role === "user") messages.pop()
    messages.push({ role: "user", content: BRIEFING_INSTRUCTIONS })
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "no_user_message" }, { status: 400 })
  }

  const client = new Anthropic()
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: PERSONA, cache_control: { type: "ephemeral" } },
    { type: "text", text: `CURRENT DATA SNAPSHOT\n${snapshot}` },
  ]

  const actions: { type: string; [k: string]: unknown }[] = []
  let reply = ""

  try {
    for (let turn = 0; turn < 6; turn++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        // Low effort keeps spoken replies snappy; raise it for deeper coaching.
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        tools: body.mode === "briefing" ? undefined : TOOLS,
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
        if (!TOOLS.some((t) => t.name === block.name) || typeof input !== "object") {
          results.push({ type: "tool_result", tool_use_id: block.id, content: "Unknown tool.", is_error: true })
          continue
        }
        actions.push({ type: block.name, ...input })
        results.push({ type: "tool_result", tool_use_id: block.id, content: "Done. The dashboard has been updated." })
      }
      messages.push({ role: "user", content: results })
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "auth", message: "The Anthropic API key was rejected." }, { status: 401 })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "rate_limited", message: "Rate limited. Try again in a moment." }, { status: 429 })
    }
    if (error instanceof Anthropic.APIError) {
      console.error("JARVIS API error", error.status, error.message)
      return NextResponse.json({ error: "api", message: error.message }, { status: 502 })
    }
    console.error("JARVIS error", error)
    return NextResponse.json({ error: "unknown" }, { status: 500 })
  }

  return NextResponse.json({ reply, actions })
}
