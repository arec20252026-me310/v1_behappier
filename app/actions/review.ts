"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function enableReviewMode() {
  const cookieStore = await cookies()
  cookieStore.set("review_mode", "1", { path: "/", httpOnly: false })
  redirect("/dashboard/settings")
}

export async function disableReviewMode() {
  const cookieStore = await cookies()
  cookieStore.delete("review_mode")
  redirect("/dashboard/settings")
}
