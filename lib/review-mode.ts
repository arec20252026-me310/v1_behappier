import { cookies } from "next/headers"

export async function isReviewMode(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("review_mode")?.value === "1"
}
