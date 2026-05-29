"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function setDefaultSpace(spaceId: string) {
  const supabase = await createClient()
  // Clear the current default (the unique partial index ensures only one can be true)
  await supabase.from("spaces").update({ is_default: false }).eq("is_default", true)
  await supabase.from("spaces").update({ is_default: true }).eq("id", spaceId)
  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard/space")
  revalidatePath("/dashboard/studies")
  revalidatePath("/dashboard/insights")
  revalidatePath("/dashboard/behaviors")
  revalidatePath("/dashboard/settings")
}
