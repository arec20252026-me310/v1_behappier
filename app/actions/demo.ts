"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function enableDemoMode() {
  const cookieStore = await cookies()
  cookieStore.set("demo_mode", "1", { path: "/", httpOnly: false })
  redirect("/dashboard")
}

export async function disableDemoMode() {
  const cookieStore = await cookies()
  cookieStore.delete("demo_mode")
  redirect("/dashboard")
}
