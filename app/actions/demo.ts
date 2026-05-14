"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { DemoScenario } from "@/lib/demo-mode"

export async function enableDemoMode(scenario: DemoScenario = "blank") {
  const cookieStore = await cookies()
  cookieStore.set("demo_mode", scenario, { path: "/", httpOnly: false })
  cookieStore.delete("review_mode")
  redirect("/dashboard")
}

export async function disableDemoMode() {
  const cookieStore = await cookies()
  cookieStore.delete("demo_mode")
  redirect("/dashboard")
}

const DEMO_ORDER: DemoScenario[] = ["blank", "space-ready", "study-in-progress", "study-complete"]

export async function advanceDemoScenario(current: DemoScenario) {
  const next = DEMO_ORDER[DEMO_ORDER.indexOf(current) + 1]
  if (!next) return
  const cookieStore = await cookies()
  cookieStore.set("demo_mode", next, { path: "/", httpOnly: false })
  redirect("/dashboard")
}
