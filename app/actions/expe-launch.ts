"use server"

import { createServerClient } from "@supabase/ssr"
import { isReviewMode } from "@/lib/review-mode"
import { revalidatePath } from "next/cache"

const EXPE_SPACE_ID = "99eab524-a616-450c-9aa4-892f3346b854"

const TARGET_METRIC_NAMES = ["Occupancy", "Collaboration Index"]

const STUDY_GOAL =
  "I want to know how many people are in the space at any given time and how collaborative they are."

const TEMPLATES = [
  {
    suffix: "q",
    study_name: "Quiet Zone Occupancy and Collaboration Study",
    zone_id: "816023aa-06f3-4446-9574-a7bb13c1c1de",
    camera_id: "camera_2",
    // ts + 1000 → 1 second newer → appears first in created_at DESC ordering (Study 1)
    tsOffset: 1000,
  },
  {
    suffix: "i",
    study_name: "Interaction Zone Occupancy and Collaboration Study",
    zone_id: "f0725c0e-5921-4fa9-824f-dc1e6313d5ac",
    camera_id: "camera_3",
    tsOffset: 0,
  },
]

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

type BehaviorTarget = {
  behavior_name: string
  behavior_description: string
  behavior_units: string
  behavior_rubric: string
}

async function startOneStudy(
  supabase: ReturnType<typeof getServiceClient>,
  n8nUrl: string,
  review_mode: boolean,
  ts: number,
  template: (typeof TEMPLATES)[number],
  behaviorTargets: BehaviorTarget[]
): Promise<{ error?: string }> {
  const study_id = `study_${ts}_${template.suffix}`

  const { error: insertError } = await supabase.from("BE_studies").insert({
    study_id,
    building_id: EXPE_SPACE_ID,
    user_id: "behappier-user",
    session_id: crypto.randomUUID(),
    status: "draft",
    current_stage: "draft",
    created_at: new Date(ts + template.tsOffset).toISOString(),
    study_goal: STUDY_GOAL,
    duration_seconds: 60,
    metadata: {
      study_name: template.study_name,
      study_goal: STUDY_GOAL,
      target_zones: [template.zone_id],
      target_metric_names: ["Occupancy", "Collaboration Index"],
      camera_id: template.camera_id,
    },
  })
  if (insertError) return { error: insertError.message }

  try {
    const res = await fetch(`${n8nUrl}/webhook/start-study`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        study_id,
        zone_ids: [template.zone_id],
        behavior_targets: behaviorTargets,
        setup_instructions: `Monitor the ${template.study_name.replace(" Occupancy and Collaboration Study", "")} for 1 minute. Track occupancy count and collaboration index.`,
        camera_id: template.camera_id,
        review_mode,
      }),
      signal: AbortSignal.timeout(55000),
    })
    if (!res.ok) {
      return { error: `n8n returned ${res.status} for ${template.study_name}` }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "n8n call failed" }
  }

  const { error: updateError } = await supabase
    .from("BE_studies")
    .update({ status: "running", current_stage: "monitoring_running", started_at: new Date().toISOString() })
    .eq("study_id", study_id)
  if (updateError) return { error: updateError.message }

  return {}
}

export async function launchExpeStudies(): Promise<{ error?: string }> {
  const n8nUrl = process.env.N8N_URL
  if (!n8nUrl) return { error: "N8N_URL is not configured" }

  const supabase = getServiceClient()
  const review_mode = await isReviewMode()
  const ts = Date.now()

  // Fetch current rubrics from the metrics table so UI edits are picked up
  const { data: metricsRows } = await supabase
    .from("metrics")
    .select("name, description, unit, rubric")
    .eq("space_id", EXPE_SPACE_ID)
    .in("name", TARGET_METRIC_NAMES)

  const behaviorTargets: BehaviorTarget[] = TARGET_METRIC_NAMES.map(metricName => {
    const row = metricsRows?.find((m: { name: string }) => m.name === metricName)
    return {
      behavior_name: metricName,
      behavior_description: (row as { description?: string | null } | undefined)?.description ?? "",
      behavior_units: (row as { unit?: string | null } | undefined)?.unit ?? "",
      behavior_rubric: (row as { rubric?: string | null } | undefined)?.rubric ?? "",
    }
  })

  const results: { error?: string }[] = []
  for (let i = 0; i < TEMPLATES.length; i++) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000))
    results.push(await startOneStudy(supabase, n8nUrl, review_mode, ts, TEMPLATES[i], behaviorTargets))
  }

  const failed = results.find((r) => r.error)
  if (failed) return failed

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/studies")

  return {}
}
