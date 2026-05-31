"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { DemoScenario } from "@/lib/demo-mode"
import { LGQ_SPACE_ID, EXPE_SPACE_ID } from "@/lib/demo-seeds"

const DEMO_SPACE_IDS = new Set([LGQ_SPACE_ID, EXPE_SPACE_ID])

function scenarioRedirect(scenario: DemoScenario): string {
  return scenario === "model-created" ? "/dashboard/models" : "/dashboard"
}

export async function enableDemoMode(scenario: DemoScenario = "blank") {
  const cookieStore = await cookies()

  // Always re-detect the real default space so entering demo mode from EXPE Room 126
  // or LGQ carries that space into demo mode instead of resetting to Peterson Loft.
  const supabase = await createClient()
  const { data: defaultSpace } = await supabase
    .from("spaces")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .single()
  if (defaultSpace?.id && DEMO_SPACE_IDS.has(defaultSpace.id)) {
    cookieStore.set("demo_space_id", defaultSpace.id, { path: "/", httpOnly: false })
  } else {
    // Real default is not a demo space — clear so it falls back to Peterson Loft
    cookieStore.delete("demo_space_id")
  }

  cookieStore.set("demo_mode", scenario, { path: "/", httpOnly: false })
  cookieStore.delete("review_mode")
  redirect(scenarioRedirect(scenario))
}

export async function disableDemoMode() {
  const cookieStore = await cookies()
  cookieStore.delete("demo_mode")
  redirect("/dashboard")
}

const DEMO_ORDER: DemoScenario[] = ["blank", "space-ready", "study-in-progress", "study-complete", "model-created"]

export async function advanceDemoScenario(current: DemoScenario) {
  const next = DEMO_ORDER[DEMO_ORDER.indexOf(current) + 1]
  if (!next) return
  const cookieStore = await cookies()
  cookieStore.set("demo_mode", next, { path: "/", httpOnly: false })
  redirect(scenarioRedirect(next))
}

export async function reverseDemoScenario(current: DemoScenario) {
  const prev = DEMO_ORDER[DEMO_ORDER.indexOf(current) - 1]
  if (!prev) return
  const cookieStore = await cookies()
  cookieStore.set("demo_mode", prev, { path: "/", httpOnly: false })
  redirect(scenarioRedirect(prev))
}

export async function setDemoSpaceId(spaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set("demo_space_id", spaceId, { path: "/", httpOnly: false })
  redirect("/dashboard")
}
