"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"

const EXPE_SPACE_ID = "99eab524-a616-450c-9aa4-892f3346b854"

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

async function stopOneStudy(
  supabase: ReturnType<typeof getServiceClient>,
  n8nUrl: string,
  study_id: string
): Promise<{ error?: string }> {
  // Step 1: mark analyzing so agent 05's loop exits on its next cycle
  const { error: updateError } = await supabase
    .from("BE_studies")
    .update({ status: "analyzing", updated_at: new Date().toISOString() })
    .eq("study_id", study_id)
  if (updateError) return { error: updateError.message }

  // Step 2: trigger agent 06 to generate final insights
  try {
    const res = await fetch(`${n8nUrl}/webhook/agent-06-trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ study_id, output_mode: "final_insights" }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return { error: `agent-06 returned ${res.status} for ${study_id}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "agent-06 webhook failed" }
  }

  return {}
}

export async function stopExpeStudies(): Promise<{ error?: string }> {
  const n8nUrl = process.env.N8N_URL
  if (!n8nUrl) return { error: "N8N_URL is not configured" }

  const supabase = getServiceClient()

  const { data: running, error: queryError } = await supabase
    .from("BE_studies")
    .select("study_id")
    .eq("building_id", EXPE_SPACE_ID)
    .eq("status", "running")

  if (queryError) return { error: queryError.message }
  if (!running?.length) return {}

  const results = await Promise.all(
    running.map(({ study_id }: { study_id: string }) =>
      stopOneStudy(supabase, n8nUrl, study_id)
    )
  )

  const failed = results.find(r => r.error)
  if (failed) return failed

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/studies")

  return {}
}
