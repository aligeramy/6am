import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { runJarvis, type ClientMessage } from "@/lib/jarvis/claude"

export const runtime = "nodejs"
export const maxDuration = 60

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

  try {
    const result = await runJarvis(new Anthropic(), {
      messages: body.messages ?? [],
      snapshot: body.snapshot ?? "",
      mode: body.mode,
    })
    return NextResponse.json(result)
  } catch (error) {
    if ((error as { code?: string }).code === "no_user_message") {
      return NextResponse.json({ error: "no_user_message" }, { status: 400 })
    }
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
}
