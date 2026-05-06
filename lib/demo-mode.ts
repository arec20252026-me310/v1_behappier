import { cookies } from "next/headers"

export async function isDemoMode(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("demo_mode")?.value === "1"
}
