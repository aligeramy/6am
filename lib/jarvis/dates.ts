import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth } from "date-fns"

export const todayKey = (d: Date = new Date()) => format(d, "yyyy-MM-dd")

export const dayKey = (offsetDays: number, from: Date = new Date()) => todayKey(addDays(from, offsetDays))

/** The last `n` day keys, oldest first, ending today. */
export const lastNDays = (n: number, from: Date = new Date()) =>
  Array.from({ length: n }, (_, i) => dayKey(i - (n - 1), from))

export const monthPrefix = (d: Date = new Date()) => format(d, "yyyy-MM")

export const monthElapsedFraction = (d: Date = new Date()) => {
  const start = startOfMonth(d)
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Math.min(1, (differenceInCalendarDays(d, start) + 1) / daysInMonth)
}

export const daysUntil = (date: string) => differenceInCalendarDays(parseISO(date), new Date())

export const prettyDate = (date: string) => format(parseISO(date), "MMM d")

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** True when `now` is at or past the HH:mm wake time today. */
export const isPastTime = (hhmm: string, now: Date = new Date()) => {
  const [h, m] = hhmm.split(":").map(Number)
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + (m || 0)
}

export const greetingFor = (d: Date = new Date()) => {
  const h = d.getHours()
  if (h < 5) return "Good evening"
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}
