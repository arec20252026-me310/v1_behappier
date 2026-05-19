import { cookies } from "next/headers"

export type DemoScenario = "blank" | "space-ready" | "study-in-progress" | "study-complete" | "model-created"

export async function getDemoScenario(): Promise<DemoScenario | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get("demo_mode")?.value
  if (!value) return null
  // Legacy cookie value "1" maps to blank
  if (value === "1") return "blank"
  return value as DemoScenario
}

export async function isDemoMode(): Promise<boolean> {
  return (await getDemoScenario()) !== null
}
