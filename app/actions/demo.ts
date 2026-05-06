"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { DemoScenario } from "@/lib/demo-mode"

export async function enableDemoMode(scenario: DemoScenario = "blank") {
  const cookieStore = await cookies()
  cookieStore.set("demo_mode", scenario, { path: "/", httpOnly: false })
  redirect("/dashboard")
}

export async function disableDemoMode() {
  const cookieStore = await cookies()
  cookieStore.delete("demo_mode")
  redirect("/dashboard")
}
