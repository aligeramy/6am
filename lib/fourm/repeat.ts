import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  format,
  getDaysInMonth,
  startOfDay,
} from "date-fns"

export type Unit = "day" | "week" | "month" | "year"

/** How a line repeats: every `every` units, counted from `start` (the day it was added). Weeks start on Monday. */
export interface Repeat {
  every: number
  unit: Unit
  /** week: the weekdays it falls on, 0 = sun … 6 = sat */
  days?: number[]
  /** month and year: the day of the month; 29–31 fall on the last day of shorter months */
  date?: number
  /** year: 0 = jan … 11 = dec */
  month?: number
  start: number
}

export type Rule = Omit<Repeat, "start">

/** Largest "every N" allowed per unit, which also keeps `nextOn`'s search short. */
export const MAX_EVERY: Record<Unit, number> = { day: 365, week: 52, month: 24, year: 10 }

/** Weekdays in display order, Monday first. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0]
const DAY3 = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
export const DAY2 = ["su", "mo", "tu", "we", "th", "fr", "sa"]

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export const monthName = (m: number) => format(new Date(2000, m, 1), "MMM").toLowerCase()

const onDate = (d: Date, want: number) => d.getDate() === Math.min(want, getDaysInMonth(d))

export function occursOn(r: Repeat, day: Date | number): boolean {
  const d = startOfDay(day)
  const s = new Date(r.start)
  if (d.getTime() < startOfDay(s).getTime()) return false
  const n = Math.max(1, r.every)
  switch (r.unit) {
    case "day":
      return differenceInCalendarDays(d, s) % n === 0
    case "week":
      return (
        (r.days?.length ? r.days : [s.getDay()]).includes(d.getDay()) &&
        differenceInCalendarWeeks(d, s, { weekStartsOn: 1 }) % n === 0
      )
    case "month":
      return differenceInCalendarMonths(d, s) % n === 0 && onDate(d, r.date ?? s.getDate())
    case "year":
      return (
        (d.getFullYear() - s.getFullYear()) % n === 0 &&
        d.getMonth() === (r.month ?? s.getMonth()) &&
        onDate(d, r.date ?? s.getDate())
      )
  }
}

/** Start of the first day on or after `from` that the line falls on. */
export function nextOn(r: Repeat, from: Date | number): number {
  let d = startOfDay(from)
  // MAX_EVERY keeps every rule's next date within 11 years.
  for (let i = 0; i < 366 * 11; i++, d = addDays(d, 1)) if (occursOn(r, d)) return d.getTime()
  return d.getTime()
}

/** "every day", "mon wed fri", "every 3 days", "monthly on the 1st", "every 2 weeks · tue"… */
export function ruleText(r: Rule): string {
  const n = Math.max(1, r.every)
  switch (r.unit) {
    case "day":
      return n === 1 ? "every day" : `every ${n} days`
    case "week": {
      const days = WEEK.filter((d) => r.days?.includes(d))
      const weekend = days.length === 2 && days.includes(0) && days.includes(6)
      const weekdays = days.length === 5 && !days.includes(0) && !days.includes(6)
      const list = days.length === 7 ? "all week" : weekdays ? "weekdays" : weekend ? "weekends" : days.map((d) => DAY3[d]).join(" ")
      if (n === 1) return days.length === 7 ? "every day" : days.length === 1 ? `every ${list}` : list
      return `every ${n} weeks · ${list}`
    }
    case "month":
      return `${n === 1 ? "monthly" : `every ${n} months`} on the ${ordinal(r.date ?? 1)}`
    case "year":
      return `${n === 1 ? "yearly" : `every ${n} years`} on ${r.date ?? 1} ${monthName(r.month ?? 0)}`
  }
}
