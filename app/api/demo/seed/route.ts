import { NextRequest, NextResponse } from "next/server"
import {
  SPACE_ID, HA_MAP_ID, CAMERA_ID,
  ZONES, CAMERA,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE,
  BE_LIVE_METRICS, BE_INSIGHT_OUTPUT,
  SEED_BE_STUDY_ID, SEED_LIVE_ID, SEED_INSIGHT_ID,
} from "@/lib/demo-seeds"

const VALID = ["blank", "space-ready", "study-in-progress", "study-complete"] as const
type Scenario = typeof VALID[number]

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured in .env.local")
  const base = `${url}/rest/v1`
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  }

  const del = (table: string, filter: string) =>
    fetch(`${base}/${table}?${filter}`, { method: "DELETE", headers })

  const upsert = (table: string, rows: object[]) =>
    fetch(`${base}/${table}`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    })

  const patch = (table: string, filter: string, data: object) =>
    fetch(`${base}/${table}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) })

  return { del, upsert, patch }
}

export async function POST(req: NextRequest) {
  const { scenario } = await req.json() as { scenario: Scenario }
  if (!VALID.includes(scenario)) {
    return NextResponse.json({ error: "Invalid scenario" }, { status: 400 })
  }

  try {
    const db = makeClient()
    const zoneIds = ZONES.map(z => z.id).join(",")

    // Wipe BE data
    await db.del("BE_live_preview_metrics", `id=eq.${SEED_LIVE_ID}`)
    await db.del("BE_insight_outputs",      `id=eq.${SEED_INSIGHT_ID}`)
    await db.del("BE_studies",              `id=eq.${SEED_BE_STUDY_ID}`)
    await db.del("BE_live_preview_metrics", `study_id=eq.study_test_001`)
    await db.del("BE_insight_outputs",      `study_id=eq.study_test_001`)
    await db.del("BE_studies",              `study_id=eq.study_test_001`)

    // Wipe space data
    await db.patch("ha_camera_mappings", `id=eq.${HA_MAP_ID}`, { camera_id: null })
    await db.del("cameras", `zone_id=in.(${zoneIds})`)
    await db.del("zones",   `space_id=eq.${SPACE_ID}`)

    if (scenario === "blank") {
      return NextResponse.json({ ok: true, scenario })
    }

    // Restore space
    await db.upsert("zones",   ZONES)
    await db.upsert("cameras", [CAMERA])
    await db.patch("ha_camera_mappings", `id=eq.${HA_MAP_ID}`, { camera_id: CAMERA_ID })

    if (scenario === "space-ready") {
      return NextResponse.json({ ok: true, scenario })
    }

    if (scenario === "study-in-progress") {
      await db.upsert("BE_studies",             [BE_STUDY_IN_PROGRESS])
      await db.upsert("BE_live_preview_metrics", [BE_LIVE_METRICS])
      return NextResponse.json({ ok: true, scenario })
    }

    if (scenario === "study-complete") {
      await db.upsert("BE_studies",        [BE_STUDY_COMPLETE])
      await db.upsert("BE_insight_outputs", [BE_INSIGHT_OUTPUT])
      return NextResponse.json({ ok: true, scenario })
    }

    return NextResponse.json({ error: "Unhandled scenario" }, { status: 500 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
