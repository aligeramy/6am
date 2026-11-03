"use client"

import { useEffect, useState } from "react"
import { useJarvis } from "./store"

/* Live weather from Open-Meteo: free, no API key, CORS-friendly. Location comes from
   Settings (a city name, or "use my location"). Cached for 30 minutes. */

export interface Weather {
  temp: number
  code: number
  high: number
  low: number
  rain: number // max precipitation probability today, %
  label: string
  place: string
  unit: "f" | "c"
  at: number
}

const LABELS: [number[], string][] = [
  [[0], "clear"],
  [[1, 2], "partly cloudy"],
  [[3], "overcast"],
  [[45, 48], "foggy"],
  [[51, 53, 55, 56, 57], "drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "rain"],
  [[71, 73, 75, 77, 85, 86], "snow"],
  [[95, 96, 99], "thunderstorms"],
]
export const weatherLabel = (code: number) => LABELS.find(([codes]) => codes.includes(code))?.[1] ?? "mixed"
export const weatherGlyph = (code: number) =>
  code === 0 ? "☀" : code <= 2 ? "⛅" : code === 3 ? "☁" : code <= 48 ? "≋" : code >= 95 ? "⚡" : [71, 73, 75, 77, 85, 86].includes(code) ? "❄" : "☂"

let cache: Weather | null = null
const subs = new Set<(w: Weather | null) => void>()

export async function geocode(name: string) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`)
  const j = await r.json()
  const hit = j?.results?.[0]
  return hit ? { name: [hit.name, hit.admin1].filter(Boolean).join(", "), lat: hit.latitude as number, lon: hit.longitude as number } : null
}

export async function refreshWeather(force = false) {
  const { location, tempUnit } = useJarvis.getState().settings
  if (!location) return null
  if (!force && cache && cache.place === location.name && cache.unit === tempUnit && Date.now() - cache.at < 30 * 60 * 1000) return cache
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&temperature_unit=${tempUnit === "c" ? "celsius" : "fahrenheit"}&timezone=auto&forecast_days=1`
    const j = await (await fetch(url)).json()
    cache = {
      temp: Math.round(j.current.temperature_2m),
      code: j.current.weather_code,
      high: Math.round(j.daily.temperature_2m_max[0]),
      low: Math.round(j.daily.temperature_2m_min[0]),
      rain: j.daily.precipitation_probability_max?.[0] ?? 0,
      label: weatherLabel(j.current.weather_code),
      place: location.name,
      unit: tempUnit,
      at: Date.now(),
    }
    subs.forEach((f) => f(cache))
    return cache
  } catch {
    return cache
  }
}

export const currentWeather = () => cache

/** One line for briefings and Claude's snapshot. */
export const weatherLine = (w: Weather | null) =>
  w ? `${w.temp}°${w.unit.toUpperCase()} and ${w.label} in ${w.place.split(",")[0]}, high ${w.high}°, low ${w.low}°${w.rain >= 40 ? `, ${w.rain}% chance of rain` : ""}` : ""

export function useWeather() {
  const [w, setW] = useState<Weather | null>(cache)
  const location = useJarvis((s) => s.settings.location)
  const unit = useJarvis((s) => s.settings.tempUnit)
  useEffect(() => {
    subs.add(setW)
    void refreshWeather()
    const t = setInterval(() => void refreshWeather(), 30 * 60 * 1000)
    return () => {
      subs.delete(setW)
      clearInterval(t)
    }
  }, [])
  useEffect(() => {
    if (location) void refreshWeather(true)
    else setW(null)
  }, [location?.name, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  return location ? w : null
}
