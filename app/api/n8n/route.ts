import { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

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

  const studyFields = {
    study_goal: (body.study_goal as string) || (body.study_name as string) || "Untitled study",
    duration_seconds: (body.duration_seconds as number) ?? null,
    metadata: {
      study_name: body.study_name ?? null,
      study_goal: body.study_goal ?? null,
      target_zones: body.target_zones ?? [],
      target_metric_names: body.target_metric_names ?? [],
    },
  }

  if (existingStudyId) {
    // Editing a draft: update the existing row and advance to planned
    const { error: updateError } = await supabase
      .from("BE_studies")
      .update({ ...studyFields, current_stage: "planned", status: "planned" })
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
  const zone_ids = (body.target_zones as string[]) ?? []
  const behavior_targets = ((body.target_metric_names as string[]) ?? []).map(
    (name) => ({ behavior_name: name })
  )
  const setup_instructions = (body.message_text as string) ?? ""

  const n8nPayload = { study_id, zone_ids, behavior_targets, setup_instructions }

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

    // n8n accepted the study — mark it active in Supabase
    await supabase
      .from("BE_studies")
      .update({ status: "active" })
      .eq("study_id", study_id)

    const data = await response.json()
    return Response.json({ ...data, study_id })
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
