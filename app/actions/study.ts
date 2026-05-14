"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function deleteStudy(studyId: string): Promise<{ error?: string }> {
  if (!studyId) return { error: "No study ID" }
  const supabase = getServiceClient()

  const { error: detErr } = await supabase
    .from("BE_behavior_detections")
    .delete()
    .eq("study_id", studyId)
  if (detErr) return { error: detErr.message }

  const { error: outErr } = await supabase
    .from("BE_insight_outputs")
    .delete()
    .eq("study_id", studyId)
  if (outErr) return { error: outErr.message }

  const { error: studyErr } = await supabase
    .from("BE_studies")
    .delete()
    .eq("study_id", studyId)
  if (studyErr) return { error: studyErr.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/studies")
  revalidatePath("/dashboard/insights")
  return {}
}
