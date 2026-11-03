import { redirect } from "next/navigation"

// The dashboard was renamed from JARVIS to Jared; keep old links working.
export default function OldJarvisRoute() {
  redirect("/jared")
}
