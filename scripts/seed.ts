#!/usr/bin/env tsx
/**
 * Demo scenario seed script — uses Supabase REST API directly.
 *
 * Usage:
 *   npm run seed -- blank
 *   npm run seed -- space-ready
 *   npm run seed -- study-in-progress
 *   npm run seed -- study-complete
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import {
  SPACE_ID, HA_MAP_ID, CAMERA_ID,
  ZONES, CAMERA,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE,
  BE_LIVE_METRICS, BE_INSIGHT_OUTPUT,
  SEED_BE_STUDY_ID, SEED_LIVE_ID, SEED_INSIGHT_ID,
} from "../lib/demo-seeds"

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = val
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("\nMissing env vars. Add to .env.local:")
  console.error("  NEXT_PUBLIC_SUPABASE_URL=...")
  console.error("  SUPABASE_SERVICE_ROLE_KEY=...\n")
  process.exit(1)
}

const BASE = `${SUPABASE_URL}/rest/v1`
const HEADERS: Record<string, string> = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
}

async function del(table: string, filter: string) {
  const res = await fetch(`${BASE}/${table}?${filter}`, { method: "DELETE", headers: HEADERS })
  if (!res.ok) throw new Error(`DELETE ${table}: ${await res.text()}`)
}

async function upsert(table: string, rows: object[]) {
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`UPSERT ${table}: ${await res.text()}`)
}

async function patch(table: string, filter: string, data: object) {
  const res = await fetch(`${BASE}/${table}?${filter}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PATCH ${table}: ${await res.text()}`)
}

// ── Scenario steps ───────────────────────────────────────────────────────────
async function wipeBE() {
  await del("BE_live_preview_metrics", `id=eq.${SEED_LIVE_ID}`)
  await del("BE_insight_outputs",      `id=eq.${SEED_INSIGHT_ID}`)
  await del("BE_studies",              `id=eq.${SEED_BE_STUDY_ID}`)
  await del("BE_live_preview_metrics", `study_id=eq.study_test_001`)
  await del("BE_insight_outputs",      `study_id=eq.study_test_001`)
  await del("BE_studies",              `study_id=eq.study_test_001`)
}

async function wipeSpace() {
  await patch("ha_camera_mappings", `id=eq.${HA_MAP_ID}`, { camera_id: null })
  const zoneIds = ZONES.map(z => z.id).join(",")
  await del("cameras", `zone_id=in.(${zoneIds})`)
  await del("zones",   `space_id=eq.${SPACE_ID}`)
}

async function seedSpace() {
  await upsert("zones",   ZONES)
  await upsert("cameras", [CAMERA])
  await patch("ha_camera_mappings", `id=eq.${HA_MAP_ID}`, { camera_id: CAMERA_ID })
}

// ── Main ─────────────────────────────────────────────────────────────────────
const VALID = ["blank", "space-ready", "study-in-progress", "study-complete"] as const
type Scenario = typeof VALID[number]
const scenario = process.argv[2] as Scenario

if (!VALID.includes(scenario)) {
  console.error(`\nUsage: npm run seed -- <scenario>`)
  console.error(`Scenarios: ${VALID.join(" | ")}\n`)
  process.exit(1)
}

async function run() {
  console.log(`\n▶ Loading scenario: ${scenario}…\n`)
  await wipeBE()

  if (scenario === "blank") {
    await wipeSpace()
    console.log("✓  Blank — all zone, camera, and study data cleared")
    console.log("   What you'll see: empty space setup, no heatmap, no studies\n")
    return
  }

  await wipeSpace()
  await seedSpace()

  if (scenario === "space-ready") {
    console.log("✓  Space ready — ME310 Loft zones and Kitchen camera restored")
    console.log("   What you'll see: full floor plan, 10 zones, camera pin, no active study\n")
    return
  }

  if (scenario === "study-in-progress") {
    await upsert("BE_studies",             [BE_STUDY_IN_PROGRESS])
    await upsert("BE_live_preview_metrics", [BE_LIVE_METRICS])
    console.log("✓  Study in progress — monitoring_running + live preview metrics")
    console.log("   What you'll see: live heatmap (Kitchen ~63%), active study badge\n")
    return
  }

  if (scenario === "study-complete") {
    await upsert("BE_studies",        [BE_STUDY_COMPLETE])
    await upsert("BE_insight_outputs", [BE_INSIGHT_OUTPUT])
    console.log("✓  Study complete — insights loaded, Kitchen zone glows on heatmap")
    console.log("   What you'll see: yellow pulsing Kitchen zone, click for insight summary\n")
  }
}

run()
  .then(() => console.log("Done. Refresh your browser.\n"))
  .catch(err => { console.error("Seed failed:", err.message); process.exit(1) })
