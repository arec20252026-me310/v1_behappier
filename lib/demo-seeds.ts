/**
 * Demo scenario seed data — ME310 Loft space.
 * IDs match real Supabase rows so upserts are idempotent.
 *
 * Zone-to-insight linkage uses BE_studies.metadata.monitored_zone_id so
 * the heatmap can highlight the correct zone without any schema changes.
 */

// ── Fixed IDs (real Supabase rows) ──────────────────────────────────────────
export const SPACE_ID   = "e8d9c195-0ae8-41ed-b03f-034ce91dd3c4"
export const HA_MAP_ID  = "bf7ba38c-9bb5-43c9-b099-f3b293285efc"
export const CAMERA_ID  = "8a425334-aafb-4d8a-9bd2-737e73eed13b"
export const KITCHEN_ID = "4a1fd84a-8805-49c2-b6bc-6552519ad18b"
export const STUDY_ID   = "study_test_001"

// Synthetic UUIDs for seed-created rows (deletable without touching real rows)
export const SEED_BE_STUDY_ID   = "00000000-seed-0000-0000-be_study00001"
export const SEED_LIVE_ID       = "00000000-seed-0000-0000-livemetric001"
export const SEED_INSIGHT_ID    = "00000000-seed-0000-0000-insightout001"

// ── Zones ────────────────────────────────────────────────────────────────────
export const ZONES = [
  { id: "bc51d7f6-d81d-421a-9a82-11f96220ae4b", space_id: SPACE_ID, name: "Team 1",            zone_type: "workspace", grid_x: 3,  grid_y: 4,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {} },
  { id: "57ba4211-be1f-49b5-bf1a-b70314aa6e25", space_id: SPACE_ID, name: "Team 2",            zone_type: "workspace", grid_x: 3,  grid_y: 8,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {} },
  { id: "63f18aeb-6b63-4c0b-9db1-3c7b9a7f52f5", space_id: SPACE_ID, name: "Team 3",            zone_type: "workspace", grid_x: 3,  grid_y: 12, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {} },
  { id: "0a3a375b-125a-4924-8d6b-a8a6325d9066", space_id: SPACE_ID, name: "Team 4",            zone_type: "workspace", grid_x: 7,  grid_y: 13, grid_width: 2, grid_height: 2, color: "#10B981", capacity: 10, metadata: {} },
  { id: "d171a3bb-afab-4b81-8408-25b5cc53266d", space_id: SPACE_ID, name: "Team 5",            zone_type: "workspace", grid_x: 13, grid_y: 4,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {} },
  { id: "57ef901d-2f29-4d0e-ad43-d35439498ef4", space_id: SPACE_ID, name: "Team 6",            zone_type: "workspace", grid_x: 13, grid_y: 8,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {} },
  { id: "76a61a27-e7e3-4105-9f37-1b97d98b0b65", space_id: SPACE_ID, name: "Team 7",            zone_type: "workspace", grid_x: 10, grid_y: 13, grid_width: 2, grid_height: 2, color: "#10B981", capacity: 10, metadata: {} },
  { id: "a1e9f303-cdce-465d-bd02-0ecdb31d15bd", space_id: SPACE_ID, name: "Team 8",            zone_type: "workspace", grid_x: 13, grid_y: 12, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {} },
  { id: KITCHEN_ID,                              space_id: SPACE_ID, name: "Kitchen",           zone_type: "kitchen",   grid_x: 6,  grid_y: 1,  grid_width: 6, grid_height: 3, color: "#EC4899", capacity: 10, metadata: {} },
  { id: "7a42add1-dc7b-4aab-866b-55d69d7cdad6", space_id: SPACE_ID, name: "Electronics Space", zone_type: "workspace", grid_x: 7,  grid_y: 16, grid_width: 5, grid_height: 4, color: "#10B981", capacity: 10, metadata: {} },
]

// ── Camera ───────────────────────────────────────────────────────────────────
export const CAMERA = {
  id: CAMERA_ID,
  zone_id: KITCHEN_ID,
  name: "Loft Camera Fluent (Motion)",
  stream_url: null,
  status: "active",
  field_of_view: {},
  metadata: { ha_entity_id: "camera.loft_camera_fluent" },
}

// ── BE_studies ───────────────────────────────────────────────────────────────
// metadata.monitored_zone_id tells the heatmap which zone to highlight
const BE_STUDY_BASE = {
  id: SEED_BE_STUDY_ID,
  study_id: STUDY_ID,
  building_id: SPACE_ID,
  user_id: "behappier-user",
  session_id: "demo-session",
  study_goal: "Measure occupant fluctuation over a 5-minute period in a monitored zone",
  study_plan: { study_goal: "Measure occupant fluctuation over a 5-minute period in a monitored zone" },
  task_graph: {},
  graph_plan: { charts: ["occupancy over time line chart", "average occupancy per phase bar chart", "hotspot heatmap"] },
  metadata: {
    name: "5-Minute Fluctuation Study",
    instructions: "Summarize occupancy trends across three phases: active fluctuation (0–2 min), empty period (2–3:30), and resumption of activity (3:30–5 min).",
    monitored_zone_id: KITCHEN_ID,
  },
  live_preview_status: null,
}

export const BE_STUDY_IN_PROGRESS = {
  ...BE_STUDY_BASE,
  status: "active",
  current_stage: "monitoring_running",
  live_preview_status: "Monitoring active — 10 snapshots analyzed",
}

export const BE_STUDY_COMPLETE = {
  ...BE_STUDY_BASE,
  status: "complete",
  current_stage: "complete",
}

// ── BE_live_preview_metrics ───────────────────────────────────────────────────
// Synthesized from real detection data: counts 2→5→3→9→7→2→9→9→9→8 avg ≈ 6.3/10.
export const BE_LIVE_METRICS = {
  id: SEED_LIVE_ID,
  study_id: STUDY_ID,
  status: "active",
  label: "Monitoring active — Kitchen zone at 63% capacity",
  metrics: {
    zone_metrics: {
      Kitchen:             { occupancy_pct: 63, count: 6 },
      "Team 1":            { occupancy_pct: 20, count: 2 },
      "Team 2":            { occupancy_pct: 30, count: 3 },
      "Team 5":            { occupancy_pct: 10, count: 1 },
      "Electronics Space": { occupancy_pct: 40, count: 4 },
    },
  },
}

// ── BE_insight_outputs ────────────────────────────────────────────────────────
// Real data from study_test_001 (id: 2f9b2dda-0e98-4a1c-b9ad-cfc677326c52).
// We seed a copy with a predictable ID so it can be cleanly removed.
// Charts are omitted here since the rendering error is still being fixed.
export const BE_INSIGHT_OUTPUT = {
  id: SEED_INSIGHT_ID,
  study_id: STUDY_ID,
  output_mode: "final_insights",
  status: "complete",
  dashboard_summary:
    "The study measured occupant fluctuation in the east lobby over a 5-minute period, " +
    "divided into three phases: active fluctuation (0–2 min), empty period (2–3:30), and " +
    "resumption of activity (3:30–5 min). The peak occupancy was observed at multiple points " +
    "with 10 occupants, while the zone was empty for a significant duration during the second phase.",
  charts: [],
  tables: [],
  insights: [
    "The peak occupancy was observed at multiple points with 10 occupants.",
    "The zone was empty for a significant duration during the second phase (2–3:30 min).",
    "Occupancy levels were highest during the resumption of activity phase (3:30–5 min).",
  ],
  recommendations: [
    "Consider optimizing space usage during peak occupancy times to improve flow and comfort.",
    "Investigate the reasons for the prolonged empty period to better understand usage patterns.",
    "Enhance monitoring during the resumption of activity phase to ensure safety and efficiency.",
  ],
}
