import { NextRequest } from "next/server"

export const maxDuration = 60

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

  try {
    const response = await fetch(`${n8nUrl}/webhook/occupant-behavior-main`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000),
    })

    if (!response.ok) {
      return Response.json(
        {
          assistant_response_text:
            "The n8n backend returned an error. Make sure all workflows are active and running.",
          action_type: "clarify_request",
          study_id: null,
          study_readiness_status: null,
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    return Response.json(data)
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
