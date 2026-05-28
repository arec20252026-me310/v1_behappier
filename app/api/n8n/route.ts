import { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { isReviewMode } from "@/lib/review-mode"

export const maxDuration = 60

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(req: NextRequest) {
  const n8nUrl = process.env.N8N_URL

  if (!n8nUrl || n8nUrl.includes("your-n8n")) {
    return Response.json(
      {
        assistant_response_text:
          "The n8n backend is not configured. Set N8N_URL in your environment and make sure n8n is running locally.",
        action_type: "clarify_request",
        study_id: null,
        study_readiness_status: null,
      },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const supabase = getServiceClient()
  const existingStudyId = body.existing_study_id as string | null
  const study_id = existingStudyId ?? `study_${Date.now()}`

  // Resolve camera_id early so it can be stored in study metadata
  const zone_ids_early = (body.target_zones as string[]) ?? []
  let camera_id_early: string | null = null
  if (zone_ids_early.length > 0) {
    const { data: zoneCameras } = await supabase
      .from("cameras")
      .select("id, metadata")
      .in("zone_id", zone_ids_early)
      .limit(1)
    const cam = (zoneCameras ?? [])[0] as { id: string; metadata?: Record<string, unknown> } | undefined
    if (cam) {
      const haEntityId = cam.metadata?.ha_entity_id
      camera_id_early = haEntityId ? String(haEntityId) : cam.id
    }
  }

  const studyFields = {
    study_goal: (body.study_goal as string) || (body.study_name as string) || "Untitled study",
    duration_seconds: (body.duration_seconds as number) ?? null,
    metadata: {
      study_name: body.study_name ?? null,
      study_goal: body.study_goal ?? null,
      target_zones: body.target_zones ?? [],
      target_metric_names: body.target_metric_names ?? [],
      ...(camera_id_early ? { camera_id: camera_id_early } : {}),
    },
  }

  if (existingStudyId) {
    // Editing a draft: update study goal fields only — status/stage managed by backend
    const { error: updateError } = await supabase
      .from("BE_studies")
      .update(studyFields)
      .eq("study_id", existingStudyId)

    if (updateError) {
      console.error("[supabase] Failed to update study row:", updateError)
      return Response.json(
        {
          assistant_response_text: "Failed to update study record. Please try again.",
          action_type: "clarify_request",
          study_id: null,
          study_readiness_status: null,
        },
        { status: 500 }
      )
    }
  } else {
    // New study: insert a draft row so n8n can find it by study_id
    const { error: insertError } = await supabase.from("BE_studies").insert({
      study_id,
      building_id: (body.building_id as string) ?? null,
      user_id: (body.user_id as string) ?? null,
      session_id: (body.session_id as string) ?? null,
      status: "draft",
      current_stage: "draft",
      created_at: new Date().toISOString(),
      ...studyFields,
    })

    if (insertError) {
      console.error("[supabase] Failed to create study row:", insertError)
      return Response.json(
        {
          assistant_response_text: "Failed to create study record. Please try again.",
          action_type: "clarify_request",
          study_id: null,
          study_readiness_status: null,
        },
        { status: 500 }
      )
    }
  }

  // Build the n8n webhook payload
  const zone_ids = zone_ids_early
  const camera_id = camera_id_early
  const behavior_targets = (body.behavior_targets as Array<{ behavior_name: string; behavior_description: string; behavior_units: string }>) ?? []
  const setup_instructions = (body.message_text as string) ?? ""
  const review_mode = await isReviewMode()

  const n8nPayload = { study_id, zone_ids, behavior_targets, setup_instructions, review_mode, ...(camera_id ? { camera_id } : {}) }

  try {
    const response = await fetch(`${n8nUrl}/webhook/start-study`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(55000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "(no body)")
      console.error(`[n8n] ${response.status} ${response.statusText}:`, errorText)
      return Response.json(
        {
          assistant_response_text: `The n8n backend returned an error (HTTP ${response.status}). Make sure all workflows are active and running.`,
          action_type: "clarify_request",
          study_id: null,
          study_readiness_status: null,
          debug_n8n_status: response.status,
          debug_n8n_body: errorText,
        },
        { status: 502 }
      )
    }

    await supabase
      .from("BE_studies")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("study_id", study_id)

    const data = await response.json().catch(() => ({}))
    return Response.json({
      assistant_response_text: "Study started successfully. Monitoring is now active.",
      action_type: "start_study",
      study_readiness_status: null,
      ...data,
      study_id,
    })
  } catch {
    return Response.json(
      {
        assistant_response_text:
          "Could not reach the n8n backend. Make sure n8n is running on the configured URL.",
        action_type: "clarify_request",
        study_id: null,
        study_readiness_status: null,
      },
      { status: 503 }
    )
  }
}
