"use server"

import { createServerClient } from "@supabase/ssr"
import { isReviewMode } from "@/lib/review-mode"
import { revalidatePath } from "next/cache"

const EXPE_SPACE_ID = "99eab524-a616-450c-9aa4-892f3346b854"

const BEHAVIOR_TARGETS = [
  {
    behavior_name: "Occupancy",
    behavior_description: "Number of people present within the observed area at a given instant",
    behavior_units: "count",
    behavior_rubric:
      "Count every person visible within the observed area regardless of activity (seated, standing, walking). Include partially visible people if more than half their body is in frame. Score = total headcount. Score 0 if no people are present.",
  },
  {
    behavior_name: "Collaboration Index",
    behavior_description:
      "Active collaborative clusters of 2 or more people within conversational distance, weighted by group size",
    behavior_units: "score",
    behavior_rubric:
      "Identify distinct clusters of 2 or more people within approximately 2 meters of each other who are oriented toward one another (facing, in a circle, or side-by-side with shared attention). Score each cluster by the number of people in it minus 1: a group of 2 = 1 point, a group of 3 = 2 points, a group of 4 = 3 points, and so on. Do not count people who are physically close but clearly working independently (heads down, backs turned, no shared gaze or object). Score = sum of points across all clusters. Score 0 if no collaborative groups are visible.",
  },
]

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

async function startOneStudy(
  supabase: ReturnType<typeof getServiceClient>,
  n8nUrl: string,
  review_mode: boolean,
  ts: number,
  template: (typeof TEMPLATES)[number]
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
    duration_seconds: 300,
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
        behavior_targets: BEHAVIOR_TARGETS,
        setup_instructions: `Monitor the ${template.study_name.replace(" Occupancy and Collaboration Study", "")} for 5 minutes. Track occupancy count and collaboration index.`,
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
    .update({ status: "running", started_at: new Date().toISOString() })
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

  const results: { error?: string }[] = []
  for (let i = 0; i < TEMPLATES.length; i++) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 10000))
    results.push(await startOneStudy(supabase, n8nUrl, review_mode, ts, TEMPLATES[i]))
  }

  const failed = results.find((r) => r.error)
  if (failed) return failed

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/studies")

  return {}
}
