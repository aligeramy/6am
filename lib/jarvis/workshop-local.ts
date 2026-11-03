import type { JarvisAction, SectionId } from "./types"

/* Offline Workshop: handles the common requests (colors, show/hide, minimize, rename, text size, reset)
   when Claude isn't connected. Anything else gets a pointer to connecting Claude. */

const COLORS: Record<string, { accent: string; warning?: string; danger?: string }> = {
  cyan: { accent: "#29e6ff" },
  blue: { accent: "#3d8bff" },
  teal: { accent: "#2fe0c0" },
  green: { accent: "#3dff9a" },
  lime: { accent: "#b6ff3d" },
  yellow: { accent: "#ffe14d", warning: "#ff9f40" },
  gold: { accent: "#ffc247", warning: "#ff8a3d", danger: "#ff4d4d" },
  orange: { accent: "#ff8a3d", warning: "#ffd84d" },
  red: { accent: "#ff3b3b", warning: "#ffc247", danger: "#ff7ad9" },
  pink: { accent: "#ff5fd2" },
  purple: { accent: "#b26bff" },
  violet: { accent: "#8a6bff" },
  white: { accent: "#e8f4f8" },
  silver: { accent: "#c9d6dc" },
}
const SUIT = { accent: "#ff3b3b", warning: "#ffc247", danger: "#ff7ad9" }

const SECTION_WORDS: Record<string, SectionId> = {
  greeting: "greeting",
  welcome: "greeting",
  habit: "habits",
  habits: "habits",
  protocols: "habits",
  mission: "missions",
  missions: "missions",
  goals: "missions",
  idea: "ideas",
  ideas: "ideas",
  health: "health",
  wealth: "wealth",
  money: "wealth",
  finance: "wealth",
  career: "career",
  work: "career",
  mind: "mind",
  spirit: "spirit",
  faith: "spirit",
}

function findSection(text: string): SectionId | null {
  for (const [word, id] of Object.entries(SECTION_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return id
  }
  return null
}

export function localWorkshop(input: string): { reply: string; actions: JarvisAction[] } {
  const text = input.trim()
  const lower = text.toLowerCase()

  if (/\b(reset|restore|original|default)\b.*\b(look|theme|appearance|design|everything|layout)\b|\breset\b$/.test(lower)) {
    return { reply: "Everything's back to the original look.", actions: [{ type: "reset_appearance" }] }
  }

  if (/\b(iron ?man|suit|mark)\b/.test(lower)) {
    return { reply: "Suit colors engaged.", actions: [{ type: "set_theme", ...SUIT }] }
  }

  const hex = text.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i)
  const colorWord = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`).test(lower))
  if ((hex || colorWord) && /\b(color|colour|theme|accent|make|turn|change|switch|paint|go)\b/.test(lower)) {
    const theme = hex ? { accent: hex[0] } : COLORS[colorWord!]
    return { reply: `Accent set to ${hex ? hex[0] : colorWord}.`, actions: [{ type: "set_theme", ...theme }] }
  }

  const size = lower.match(/\b(bigger|larger|smaller|tinier)\b.*\b(text|font|words)\b|\b(text|font)\b.*\b(bigger|larger|smaller)\b/)
  if (size) {
    const up = /bigger|larger/.test(lower)
    return { reply: up ? "Text is bigger now." : "Text is smaller now.", actions: [{ type: "set_theme", font_scale: up ? 1.15 : 0.9 }] }
  }
  if (/\b(normal|default)\b.*\b(text|font)\b/.test(lower)) return { reply: "Text size reset.", actions: [{ type: "set_theme", font_scale: 1 }] }

  const section = findSection(lower)
  if (section) {
    const rename = text.match(/\brename\b.*?\bto\s+["“']?([^"”']+?)["”']?\s*$/i) || text.match(/\bcall\b.*?\b(?:section|card|panel)?\s*["“']?([^"”']+?)["”']?\s*$/i)
    if (/\brename\b/i.test(text) && rename) {
      return { reply: `Renamed to ${rename[1].trim()}.`, actions: [{ type: "update_section", section, title: rename[1].trim() }] }
    }
    if (/\b(hide|remove|get rid of|turn off)\b/.test(lower)) return { reply: "Hidden. Say “show” to bring it back.", actions: [{ type: "update_section", section, hidden: true }] }
    if (/\b(show|unhide|bring back|restore)\b/.test(lower)) return { reply: "It's back.", actions: [{ type: "update_section", section, hidden: false, collapsed: false }] }
    if (/\b(minimi[sz]e|collapse|shrink|fold)\b/.test(lower)) return { reply: "Minimized.", actions: [{ type: "update_section", section, collapsed: true }] }
    if (/\b(expand|maximi[sz]e|open up|unfold)\b/.test(lower)) return { reply: "Expanded.", actions: [{ type: "update_section", section, collapsed: false }] }
    if (/\b(move|put)\b.*\bleft\b/.test(lower)) return { reply: "Moved to the left column.", actions: [{ type: "update_section", section, column: "left" }] }
    if (/\b(move|put)\b.*\bright\b/.test(lower)) return { reply: "Moved to the right column.", actions: [{ type: "update_section", section, column: "right" }] }
    if (/\b(move|put)\b.*\b(top|first)\b/.test(lower)) return { reply: "Moved to the top.", actions: [{ type: "update_section", section, position: 1 }] }
  }

  return {
    reply:
      "Without Claude connected I can handle colors (\"make it red\", \"Iron Man colors\"), text size, and sections (\"hide wealth\", \"minimize ideas\", \"rename spirit to Faith\", \"move ideas to the right\"). Connect Claude in Settings and I can do much more, including fixing your data.",
    actions: [],
  }
}
