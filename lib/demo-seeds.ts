/**
 * Demo scenario seed data — Peterson Loft space.
 *
 * Zone-to-insight linkage uses BE_studies.metadata.monitored_zone_id so
 * the heatmap can highlight the correct zone without any schema changes.
 */

import type { FitEntry } from "@/components/models/model-chart"
import type { FitResult } from "@/lib/model-fitting"

// ── Fixed IDs (real Supabase rows) ──────────────────────────────────────────
export const SPACE_ID   = "e8d9c195-0ae8-41ed-b03f-034ce91dd3c4"
export const LGQ_SPACE_ID = "754df673-391d-409c-9b5c-27618028aa25"
export const HA_MAP_ID  = "bf7ba38c-9bb5-43c9-b099-f3b293285efc"
export const CAMERA_ID  = "8a425334-aafb-4d8a-9bd2-737e73eed13b"
export const KITCHEN_ID = "4a1fd84a-8805-49c2-b6bc-6552519ad18b"
export const TEAM2_ID   = "57ba4211-be1f-49b5-bf1a-b70314aa6e25"
export const TEAM4_ID   = "0a3a375b-125a-4924-8d6b-a8a6325d9066"
export const STUDY_ID   = "study_1778019133385"

export const CAMERA_2_ID = "a5fcfe9d-4290-42ab-924b-9adcd0e0e950"
export const CAMERA_1_ID = "25707986-d989-45ec-9a92-409d7162832c"
export const CAMERA_3_ID = "d8651b9d-898d-4989-bb5f-e28a942e5647"

// Synthetic UUIDs for seed-created rows (deletable without touching real rows)
export const SEED_BE_STUDY_ID   = "00000000-0000-0000-0000-000000000001"
export const SEED_LIVE_ID       = "00000000-0000-0000-0000-000000000002"
export const SEED_INSIGHT_ID    = "00000000-0000-0000-0000-000000000003"

// ── Metrics ──────────────────────────────────────────────────────────────────
const _TS_M = { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }

export const DEMO_METRICS = [
  {
    id: "7e859061-3a9f-44b3-88f0-4a515a06d535", space_id: SPACE_ID,
    name: "Occupancy", description: "Number of people present within the observed area at a given instant",
    category: "utilization" as const, unit: "count", calculation_method: null,
    rubric: "Count every person visible within the observed area regardless of activity (seated, standing, walking). Include partially visible people if more than half their body is in frame. Score = total headcount. Score 0 if no people are present.",
    literature_reference: "Fruin, J.J. (1971). Pedestrian Planning and Design. Metropolitan Association of Urban Designers and Environmental Planners.",
    is_active: true, ..._TS_M,
  },
  {
    id: "78222152-f9ca-4433-b77b-f8af7f4532d3", space_id: SPACE_ID,
    name: "Collaboration Index", description: "Active collaborative clusters of 2 or more people within conversational distance, weighted by group size",
    category: "social_interaction" as const, unit: "score", calculation_method: null,
    rubric: "Score = (T2 × 1.0 + T1 × 0.5) / N, rounded to 2 decimals.\nN = visible persons. T2 = persons in Tier 2. T1 = persons in Tier 1.\nT0 contributes 0. If N = 0, score = 0.00.\n\nTIER 0 (withdrawn): headphones/earbuds in use, back fully turned to everyone else, alone at separate furniture, or single visible person.\nTIER 1 (co-present, not interacting): at shared furniture with others, no interaction signals.\nTIER 2 (engaged): visibly speaking, mutual orientation, shared screen/whiteboard with active interaction, or gesturing toward another person.",
    literature_reference: "Allen, T. (1977). Managing the Flow of Technology",
    is_active: true, ..._TS_M,
  },
  {
    id: "14328a8c-5689-4d9d-817d-7ec97139023c", space_id: SPACE_ID,
    name: "Slip/Fall Risk Index", description: "Detection of wet floors, obstacles, or hazardous conditions",
    category: "safety" as const, unit: "score", calculation_method: null,
    rubric: "Scan visible floor and walking surfaces for hazards: wet floor signs, spills or puddles, cords or cables across pathways, cluttered walkways, loose mats, or damaged flooring. Score: 0 = no hazards visible; 1-3 = minor hazards in low-traffic areas; 4-6 = moderate hazards in trafficked areas; 7-9 = significant hazards in main walkways; 10 = severe hazards creating immediate risk. Score = single whole number on this 0-10 scale.",
    literature_reference: "OSHA Walking-Working Surfaces Standard (2017)",
    is_active: true, ..._TS_M,
  },
  {
    id: "713b847b-ff24-48e9-a3bb-7223c358357c", space_id: SPACE_ID,
    name: "Seating Comfort Score", description: "Availability and usage patterns of seating areas",
    category: "comfort" as const, unit: "score", calculation_method: null,
    rubric: "Count total visible seats or seating surfaces (chairs, benches, stools, couches). Count how many are occupied. Note comfort workarounds: people perching on non-seat surfaces or standing near empty seats. Score = round((occupied seats / total seats) × 10) to the nearest whole number. If all seats are full and people are standing or perching nearby, score = 10. Score 0 if no seating is visible or all seating is blocked.",
    literature_reference: "Whyte, W. (1980). The Social Life of Small Urban Spaces",
    is_active: false, ..._TS_M,
  },
  {
    id: "b6d5e887-7645-48a8-89b1-3edbc6ac49e6", space_id: SPACE_ID,
    name: "Foot Traffic Count", description: "Number of people entering/exiting a zone",
    category: "traffic_flow" as const, unit: "count", calculation_method: null,
    rubric: "Count the number of people who appear to be actively walking, entering, or exiting the space. Do not count people who are seated, stationary, or clearly paused. Score = total count of people visibly in motion. Score 0 if no one is moving.",
    literature_reference: "Whyte, W. (1980). The Social Life of Small Urban Spaces",
    is_active: false, ..._TS_M,
  },
  {
    id: "27ddd347-8024-46eb-808a-ab1515a5b502", space_id: SPACE_ID,
    name: "Utilization Rate", description: "Percentage of capacity being used over time",
    category: "utilization" as const, unit: "percentage", calculation_method: null,
    rubric: "Count all people currently present in the observed area (seated, standing, or moving). Divide by the zone stated capacity and multiply by 100, then round to the nearest whole number. If capacity is unknown, estimate from the number of workstations or seats visible in frame. Score = round((headcount / zone capacity) × 100). Score 0 if no people are present.",
    literature_reference: "Duffy, F. (1997). The New Office",
    is_active: false, ..._TS_M,
  },
  {
    id: "a2f25409-e598-415a-93ae-f140d2998ef6", space_id: SPACE_ID,
    name: "Peak Occupancy", description: "Maximum number of occupants at any given time",
    category: "utilization" as const, unit: "count", calculation_method: null,
    rubric: "Count every visible person in the observed area (seated, standing, or moving). Include partially visible people if their presence can be reasonably confirmed. This snapshot value is recorded each interval; the peak is the maximum headcount observed across all snapshots in the study. Score = total headcount in this snapshot.",
    literature_reference: "Hillier, B. (2007). Space is the Machine",
    is_active: false, ..._TS_M,
  },
]

// ── Space ────────────────────────────────────────────────────────────────────
export const DEMO_SPACE = {
  id: SPACE_ID,
  name: "Peterson Loft",
  description: "Stanford ME310 design studio space",
  address: null,
  total_area_sqft: null,
  building_type: "office",
  floor_plan_url: "/api/file?pathname=floor-plans%2F1776921523908.png",
  grid_resolution: 20,
  metadata: {},
  is_default: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

// ── Zones ────────────────────────────────────────────────────────────────────
const TS = { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }

export const ZONES = [
  { id: KITCHEN_ID,                              space_id: SPACE_ID, name: "Kitchen",           zone_type: "kitchen",   grid_x: 6,  grid_y: 1,  grid_width: 7, grid_height: 4, color: "#EC4899", capacity: 10, metadata: {}, ...TS },
  { id: "bc51d7f6-d81d-421a-9a82-11f96220ae4b", space_id: SPACE_ID, name: "Team 1",            zone_type: "workspace", grid_x: 2,  grid_y: 5,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "d171a3bb-afab-4b81-8408-25b5cc53266d", space_id: SPACE_ID, name: "Team 5",            zone_type: "workspace", grid_x: 14, grid_y: 5,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "57ba4211-be1f-49b5-bf1a-b70314aa6e25", space_id: SPACE_ID, name: "Team 2",            zone_type: "workspace", grid_x: 2,  grid_y: 10, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "57ef901d-2f29-4d0e-ad43-d35439498ef4", space_id: SPACE_ID, name: "Team 6",            zone_type: "workspace", grid_x: 14, grid_y: 10, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "63f18aeb-6b63-4c0b-9db1-3c7b9a7f52f5", space_id: SPACE_ID, name: "Team 3",            zone_type: "workspace", grid_x: 2,  grid_y: 15, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "a1e9f303-cdce-465d-bd02-0ecdb31d15bd", space_id: SPACE_ID, name: "Team 8",            zone_type: "workspace", grid_x: 14, grid_y: 15, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "0a3a375b-125a-4924-8d6b-a8a6325d9066", space_id: SPACE_ID, name: "Team 4",            zone_type: "workspace", grid_x: 6,  grid_y: 16, grid_width: 3, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "76a61a27-e7e3-4105-9f37-1b97d98b0b65", space_id: SPACE_ID, name: "Team 7",            zone_type: "workspace", grid_x: 10, grid_y: 16, grid_width: 3, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "7a42add1-dc7b-4aab-866b-55d69d7cdad6", space_id: SPACE_ID, name: "Electronics Space", zone_type: "workspace", grid_x: 7,  grid_y: 20, grid_width: 5, grid_height: 4, color: "#10B981", capacity: 10, metadata: {}, ...TS },
]

// ── Cameras — Peterson Loft ───────────────────────────────────────────────────
// Placements copied from cameras.metadata in Supabase (real DB rows).
export const CAMERA = {
  id: CAMERA_2_ID,
  zone_id: KITCHEN_ID,
  name: "camera_2",
  stream_url: null,
  status: "active" as const,
  field_of_view: {},
  metadata: { ha_entity_id: "camera_2", placement_x: 218, placement_y: 389, placement_frac_x: 0.47391304347826085, placement_frac_y: 0.6763434860110051, placement_direction: "up" },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

export const CAMERAS = [
  CAMERA,
  {
    id: CAMERA_1_ID,
    zone_id: TEAM2_ID,
    name: "camera_1",
    stream_url: null,
    status: "active" as const,
    field_of_view: {},
    metadata: { ha_entity_id: "camera_1", placement_x: 29, placement_y: 276, placement_frac_x: 0.06304347826086956, placement_frac_y: 0.4798217468805704, placement_direction: "right" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: CAMERA_3_ID,
    zone_id: TEAM4_ID,
    name: "camera_3",
    stream_url: null,
    status: "active" as const,
    field_of_view: {},
    metadata: { ha_entity_id: "camera_3", placement_x: 217, placement_y: 412, placement_frac_x: 0.4717391304347826, placement_frac_y: 0.7163434860110052, placement_direction: "left" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
]

type CameraDir = import("@/lib/types").CameraDirection
export const DEMO_CAMERA_PLACEMENTS: import("@/lib/types").CameraPlacement[] = [
  { id: `cam-${KITCHEN_ID}`, zoneId: KITCHEN_ID, x: 218, y: 389, fracX: 0.47391304347826085, fracY: 0.6763434860110051, direction: "up"    as CameraDir, label: "camera_2" },
  { id: `cam-${TEAM2_ID}`,   zoneId: TEAM2_ID,   x: 29,  y: 276, fracX: 0.06304347826086956, fracY: 0.4798217468805704, direction: "right" as CameraDir, label: "camera_1" },
  { id: `cam-${TEAM4_ID}`,   zoneId: TEAM4_ID,   x: 217, y: 412, fracX: 0.4717391304347826,  fracY: 0.7163434860110052, direction: "left"  as CameraDir, label: "camera_3" },
]

// ── Space — Looking Glass HQ ──────────────────────────────────────────────────
export const DEMO_LGQ_SPACE = {
  id: LGQ_SPACE_ID,
  name: "Looking Glass HQ",
  description: "Looking Glass headquarters office",
  address: null,
  total_area_sqft: null,
  building_type: "office",
  floor_plan_url: "/api/file?pathname=floor-plans%2F1780008266311.jpg",
  grid_resolution: 32,
  metadata: {},
  is_default: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

export const ZONES_LGQ = [
  { id: "56239f1a-4645-4ad2-adaf-8aaaf6b34e92", space_id: LGQ_SPACE_ID, name: "Conference Room", zone_type: "meeting_room", grid_x: 0,  grid_y: 2,  grid_width: 10, grid_height: 8, color: "#F59E0B", capacity: null, metadata: {}, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "ec740992-4f29-4f9a-92fc-ae103aaa676d", space_id: LGQ_SPACE_ID, name: "Hot Desks",       zone_type: "workspace",   grid_x: 20, grid_y: 3,  grid_width: 9,  grid_height: 9, color: "#10B981", capacity: null, metadata: {}, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "79c7a05a-5363-413d-a640-f2d74c5f524f", space_id: LGQ_SPACE_ID, name: "Kitchen",         zone_type: "kitchen",     grid_x: 12, grid_y: 14, grid_width: 6,  grid_height: 6, color: "#EC4899", capacity: null, metadata: {}, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "ce05b46a-4d3b-4619-a53f-4ce13a99ed0f", space_id: LGQ_SPACE_ID, name: "Meditation Room", zone_type: "break_room",  grid_x: 23, grid_y: 15, grid_width: 8,  grid_height: 5, color: "#EF4444", capacity: null, metadata: {}, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
]

export const CAMERAS_LGQ = [
  { id: "151bdb6f-f2ab-42f8-ac85-65078078cc9a", zone_id: "56239f1a-4645-4ad2-adaf-8aaaf6b34e92", name: "camera_1", stream_url: null, status: "active" as const, field_of_view: {}, metadata: { ha_entity_id: "camera_1", placement_x: 203, placement_y: 70,  placement_frac_x: 0.2564489009186352,  placement_frac_y: 0.14583333333333334, placement_direction: "down" }, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "c75b7af2-96a9-4e69-886b-ffbf96e92479", zone_id: "79c7a05a-5363-413d-a640-f2d74c5f524f", name: "camera_2", stream_url: null, status: "active" as const, field_of_view: {}, metadata: { ha_entity_id: "camera_2", placement_x: 414, placement_y: 460, placement_frac_x: 0.5311884842519685,  placement_frac_y: 0.9583333333333334,  placement_direction: "up"   }, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "ab88826c-49f5-416e-9315-1cc2e223340c", zone_id: "ec740992-4f29-4f9a-92fc-ae103aaa676d", name: "camera_3", stream_url: null, status: "active" as const, field_of_view: {}, metadata: { ha_entity_id: "camera_3", placement_x: 714, placement_y: 232, placement_frac_x: 0.9218134842519685,  placement_frac_y: 0.48333333333333334, placement_direction: "left" }, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
]

export const DEMO_CAMERA_PLACEMENTS_LGQ: import("@/lib/types").CameraPlacement[] = [
  { id: "cam-lgq-conf",    zoneId: "56239f1a-4645-4ad2-adaf-8aaaf6b34e92", x: 203, y: 70,  fracX: 0.2564489009186352,  fracY: 0.14583333333333334, direction: "down" as CameraDir, label: "camera_1" },
  { id: "cam-lgq-kitchen", zoneId: "79c7a05a-5363-413d-a640-f2d74c5f524f", x: 414, y: 460, fracX: 0.5311884842519685,  fracY: 0.9583333333333334,  direction: "up"   as CameraDir, label: "camera_2" },
  { id: "cam-lgq-desks",   zoneId: "ec740992-4f29-4f9a-92fc-ae103aaa676d", x: 714, y: 232, fracX: 0.9218134842519685,  fracY: 0.48333333333333334, direction: "left" as CameraDir, label: "camera_3" },
]

// ── LGQ study seed data ──────────────────────────────────────────────────────
export const LGQ_CONF_ROOM_ID = "56239f1a-4645-4ad2-adaf-8aaaf6b34e92"
export const LGQ_STUDY_ID = "study_lgq_001"
export const SEED_BE_STUDY_LGQ_ID = "00000000-0000-0000-0000-000000000011"
export const SEED_LGQ_INSIGHT_ID  = "00000000-0000-0000-0000-000000000013"

export const DEMO_METRICS_LGQ = [
  {
    id: "8db6e8a5-00a3-4df7-b618-48223d1551d9", space_id: LGQ_SPACE_ID,
    name: "Occupancy", description: "Number of people present within the observed area at a given instant",
    category: "utilization" as const, unit: "count", calculation_method: null,
    rubric: "Count every person visible within the observed area regardless of activity. Score = total headcount. Score 0 if no people are present.",
    literature_reference: "Fruin, J.J. (1971). Pedestrian Planning and Design. Metropolitan Association of Urban Designers and Environmental Planners.",
    is_active: true, ..._TS_M,
  },
]

const BE_STUDY_BASE_LGQ = {
  id: SEED_BE_STUDY_LGQ_ID,
  study_id: LGQ_STUDY_ID,
  building_id: LGQ_SPACE_ID,
  user_id: null,
  session_id: null,
  study_goal: "Monitor the Conference Room for occupancy during a working session.",
  study_plan: {},
  task_graph: {},
  graph_plan: {},
  metadata: {
    study_name: "LGQ Conference Room Study",
    monitored_zone_id: LGQ_CONF_ROOM_ID,
    target_zones: [LGQ_CONF_ROOM_ID],
  },
  live_preview_status: null,
  started_at: "2026-05-28T14:00:00.000000+00:00",
  duration_seconds: 480,
  created_at: "2026-05-28T13:59:45.000000+00:00",
  updated_at: "2026-05-28T14:08:00.000000+00:00",
}

export const BE_STUDY_IN_PROGRESS_LGQ = {
  ...BE_STUDY_BASE_LGQ,
  status: "running",
  current_stage: "monitoring_running" as const,
  live_preview_status: "Monitoring running — 1 snapshot analyzed",
}

export const BE_STUDY_COMPLETE_LGQ = {
  ...BE_STUDY_BASE_LGQ,
  status: "complete",
  current_stage: "complete" as const,
}

export const DEMO_DETECTIONS_LGQ = [
  { timestamp_pt: "2026-05-28 14:00:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 1, unit: "count" }], notes: "One person seated at the conference table, working on a laptop." },
  { timestamp_pt: "2026-05-28 14:01:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }], notes: "Second person enters and takes a seat across the table." },
  { timestamp_pt: "2026-05-28 14:02:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }], notes: "There are three people sitting at the table calmly working on laptops." },
  { timestamp_pt: "2026-05-28 14:03:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }], notes: "Three occupants present, focused work session in progress." },
  { timestamp_pt: "2026-05-28 14:04:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }], notes: "All three seated, minimal movement observed." },
  { timestamp_pt: "2026-05-28 14:05:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }], notes: "Fourth person enters and pulls up a chair to join the group." },
  { timestamp_pt: "2026-05-28 14:06:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }], notes: "Four people present, brief group discussion visible around laptop screens." },
  { timestamp_pt: "2026-05-28 14:07:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }], notes: "One person has stepped out. Three people remain, still working." },
  { timestamp_pt: "2026-05-28 14:08:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }], notes: "There are three people sitting at the table calmly working on laptops." },
]

export const BE_LIVE_METRICS_LGQ = {
  id: "00000000-0000-0000-0000-000000000012",
  study_id: LGQ_STUDY_ID,
  status: "running",
  label: "Monitoring running — 1 snapshot analyzed",
  updated_at: "2026-05-28T14:01:00.000Z",
  metrics: {
    zone_metrics: {
      "Conference Room": { occupancy_pct: 60, count: 3 },
    },
  },
}

// ── LGQ insight output ───────────────────────────────────────────────────────
const _LGQ_OCC_LABELS = ["14:00:00","14:01:00","14:02:00","14:03:00","14:04:00","14:05:00","14:06:00","14:07:00","14:08:00"]
const _LGQ_OCC_VALS   = [1, 2, 3, 3, 3, 4, 4, 3, 3]

export const BE_INSIGHT_OUTPUT_LGQ = {
  id: SEED_LGQ_INSIGHT_ID,
  study_id: LGQ_STUDY_ID,
  output_mode: "final_insights" as const,
  status: "complete",
  created_at: "2026-05-28T14:12:00.000Z",
  dashboard_summary:
    "The LGQ Conference Room Study monitored occupancy over 8 minutes. " +
    "The room started with a single occupant and grew to a peak of 4 people at 14:05–14:06 before tapering back to 2 by session end. " +
    "Average occupancy was approximately 3 people — consistent with focused small-group work. " +
    "No safety events were detected. The room operated below its full capacity throughout the session.",
  charts: [
    {
      chart_id: "lgq_chart_1",
      chart_type: "line",
      title: "Occupancy Over Time",
      data: { labels: _LGQ_OCC_LABELS, values: _LGQ_OCC_VALS },
    },
  ],
  tables: [
    {
      table_id: "lgq_table_1",
      title: "Detection Log",
      columns: ["Timestamp", "Occupancy", "Notes"],
      rows: DEMO_DETECTIONS_LGQ.map(d => [
        d.timestamp_pt.split(" ")[1],
        String(d.detected_behaviors.find(b => b.name === "Occupancy")?.value ?? ""),
        d.notes,
      ]),
    },
  ],
  insights: [
    "Occupancy peaked at 4 people between 14:05 and 14:06, indicating the Conference Room serves as a gathering point for small collaborative sessions.",
    "The room was consistently occupied throughout the 8-minute study, suggesting high demand during the observed window.",
    "Average occupancy of approximately 3 people is below the room's capacity, indicating the space is underutilized relative to its size.",
    "The natural ramp-up (arrivals 14:00–14:05) and ramp-down (departures 14:07–14:08) suggest structured, bounded work sessions rather than ad-hoc drop-ins.",
  ],
  recommendations: [
    "Consider offering the Conference Room in shorter booking slots to increase availability for back-to-back small meetings.",
    "Install a real-time occupancy indicator outside the Conference Room so teams can quickly see availability without opening the door.",
    "Track occupancy across multiple sessions to identify peak-demand windows and optimize scheduling policies.",
    "If 3–4 person groups are the typical use case, evaluate whether a smaller breakout room would better serve this team size and free the Conference Room for larger groups.",
  ],
}

// ── Space — EXPE Room 126 (real Supabase IDs) ─────────────────────────────────
export const EXPE_SPACE_ID       = "99eab524-a616-450c-9aa4-892f3346b854"
export const EXPE_QUIET_ZONE_ID  = "816023aa-06f3-4446-9574-a7bb13c1c1de"
export const EXPE_ROOM_ID        = "f0725c0e-5921-4fa9-824f-dc1e6313d5ac" // Interaction Zone (monitored)
export const EXPE_OBS_AREA_ID    = "1e0c5c9b-b49c-4afe-a999-0b354b9b903a"
export const EXPE_STUDY_Q_ID        = "study_1780382193242"
export const EXPE_STUDY_I_ID        = "study_1780382887677"
export const SEED_EXPE_Q_INSIGHT_ID = "37816e0c-c837-4be7-bbd7-b9994a171001"
export const SEED_EXPE_I_INSIGHT_ID = "29100e93-5e21-4505-b889-4cc45dd86111"
export const SEED_EXPE_MODEL_DATASET_ID = "00000000-0000-0001-0000-000000000010"

export const DEMO_EXPE_SPACE = {
  id: EXPE_SPACE_ID,
  name: "EXPE Room 126",
  description: "Stanford ME310 experiment room",
  address: null,
  total_area_sqft: null,
  building_type: "office",
  floor_plan_url: "/api/file?pathname=floor-plans%2F1780254532724.jpg",
  grid_resolution: 32,
  metadata: {},
  is_default: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

const _TS_EXPE = { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
export const ZONES_EXPE = [
  { id: EXPE_QUIET_ZONE_ID, space_id: EXPE_SPACE_ID, name: "Quiet Zone",       zone_type: "workspace", grid_x: 1,  grid_y: 2,  grid_width: 10, grid_height: 10, color: "#10B981", capacity: null, metadata: {}, ..._TS_EXPE },
  { id: EXPE_ROOM_ID,       space_id: EXPE_SPACE_ID, name: "Interaction Zone", zone_type: "workspace", grid_x: 11, grid_y: 2,  grid_width: 10, grid_height: 10, color: "#10B981", capacity: null, metadata: {}, ..._TS_EXPE },
  { id: EXPE_OBS_AREA_ID,   space_id: EXPE_SPACE_ID, name: "Observation Area", zone_type: "workspace", grid_x: 1,  grid_y: 13, grid_width: 20, grid_height: 3,  color: "#10B981", capacity: null, metadata: {}, ..._TS_EXPE },
]

export const CAMERAS_EXPE = [
  { id: "ef83a572-e62e-403e-824e-0fb52e64fca5", zone_id: EXPE_ROOM_ID,       name: "camera_2", stream_url: null, status: "active" as const, field_of_view: {}, metadata: { ha_entity_id: "camera_2", placement_x: 284, placement_y: 279, placement_frac_x: 0.3682961532070455, placement_frac_y: 0.58125, placement_direction: "up-right" }, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "1a0af4da-ba24-4710-b74e-903f7840fe9e", zone_id: EXPE_QUIET_ZONE_ID, name: "camera_1", stream_url: null, status: "active" as const, field_of_view: {}, metadata: { ha_entity_id: "camera_1", placement_x: 244, placement_y: 279, placement_frac_x: 0.3162128198737122, placement_frac_y: 0.58125, placement_direction: "up-left"  }, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
]

export const DEMO_CAMERA_PLACEMENTS_EXPE: import("@/lib/types").CameraPlacement[] = [
  { id: "cam-expe-interact", zoneId: EXPE_ROOM_ID,       x: 284, y: 279, fracX: 0.3682961532070455, fracY: 0.58125, direction: "up-right" as CameraDir, label: "camera_2" },
  { id: "cam-expe-quiet",    zoneId: EXPE_QUIET_ZONE_ID, x: 244, y: 279, fracX: 0.3162128198737122, fracY: 0.58125, direction: "up-left"  as CameraDir, label: "camera_1" },
]

export const DEMO_METRICS_EXPE = [
  {
    id: "00000000-0001-0000-0000-000000000001", space_id: EXPE_SPACE_ID,
    name: "Occupancy", description: "Number of people present within the observed area at a given instant",
    category: "utilization" as const, unit: "count", calculation_method: null,
    rubric: "Count every person visible within the observed area regardless of activity. Score = total headcount. Score 0 if no people are present.",
    literature_reference: "Fruin, J.J. (1971). Pedestrian Planning and Design. Metropolitan Association of Urban Designers and Environmental Planners.",
    is_active: true, ..._TS_M,
  },
]

// ── EXPE detections (real data) ───────────────────────────────────────────────
export const DEMO_DETECTIONS_EXPE_Q = [
  { timestamp_pt: "2026-06-01 23:36:34 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, facing curtain, not interacting, T0. P2 front-right, sitting, wearing headphones, T0." },
  { timestamp_pt: "2026-06-01 23:36:46 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, sitting, facing curtain, T0. P2 front-right, wearing headphones, looking at device, T0. Both seated separately, no interaction." },
  { timestamp_pt: "2026-06-01 23:37:11 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, facing curtain, not interacting, T0. P2 front-right, sitting, using phone, wearing headphones, T0. Both are seated at separate chairs with no visible interaction or shared surface." },
  { timestamp_pt: "2026-06-01 23:37:24 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, seated facing curtain, no interaction, T0. P2 front-right, seated with headphones, looking at phone, T0. Both are alone at separate chairs with no visible collaboration." },
  { timestamp_pt: "2026-06-01 23:37:35 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, seated facing curtain, not interacting, T0. P2 front-right, wearing headphones, looking at device, T0. Both are alone at separate chairs, no shared workspace or interaction." },
  { timestamp_pt: "2026-06-01 23:37:48 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, seated facing curtain, not interacting, T0. P2 front-right, seated, looking at phone, wearing headphones, T0. Both are seated separately with no shared surface or visible interaction." },
  { timestamp_pt: "2026-06-01 23:38:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=2, T1=0, T2=0, N=2, score=0. P1 center-back, seated with headphones, facing curtain, no interaction, T0. P2 front-right, seated, looking at device, headphones on, not interacting, T0. Both individuals are sitting separately with no shared workspace." },
  { timestamp_pt: "2026-06-01 23:38:12 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 center-back, seated in white, facing curtain, headphones, not interacting, T0. P2 center, seated in green, facing curtain, no interaction, T0. P3 front-right, seated, looking at device, headphones on, T0. Occupancy has increased (was 2), still no collaboration." },
  { timestamp_pt: "2026-06-01 23:38:24 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, seated, wearing headphones, facing curtain, T0. P2 center-back, seated, facing curtain, not interacting, T0. P3 front-right, seated, looking at phone/device, headphones on, T0. All seated at separate chairs, no visible interaction." },
  { timestamp_pt: "2026-06-01 23:38:37 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, white shirt, headphones, facing curtain, T0. P2 center-back, green shirt, facing curtain, no interaction, T0. P3 front-right, white/pink shirt, headphones, looking at device, T0. Solo pattern consistent with previous detections." },
  { timestamp_pt: "2026-06-01 23:38:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, headphones on, facing curtain, not interacting, T0. P2 center-back, seated, facing curtain, not engaging others, T0. P3 front-right, looking at device with headphones, T0. Pattern remains unchanged." },
  { timestamp_pt: "2026-06-01 23:39:02 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, headphones on, facing curtain, solo, T0. P2 center-back, hands on head, headphones, solo, T0. P3 front-right, using phone/device, headphones, solo, T0. Occupancy and collaboration pattern unchanged." },
  { timestamp_pt: "2026-06-01 23:39:14 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, white shirt, headphones, turned to curtain, T0. P2 center-back, green shirt, head down, not interacting, T0. P3 front-right, white/pink shirt, headphones, looking at phone, T0. Pattern unchanged from previous detections." },
  { timestamp_pt: "2026-06-01 23:39:26 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, head down, hand by face, headphones, T0. P2 center-back, seated facing curtain, focused forward, T0. P3 front-right, headphones, looking at phone, T0. Continued solo behavior, no collaboration or group formation." },
  { timestamp_pt: "2026-06-01 23:39:38 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, white shirt, headphones, seated alone, facing curtain, T0. P2 center-back, green/grey shirt, seated, facing curtain, solo, T0. P3 front-right, pale pink shirt, headphones, using phone, seated solo, T0. Occupancy and solo behavior stable." },
  { timestamp_pt: "2026-06-01 23:39:53 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-back, white shirt, headphones, hand to face, T0. P2 center-back, green/grey shirt, looking forward, T0. P3 front-right, white/pink shirt, headphones, looking at phone, T0. All solo at separate chairs, no visible interaction or shared workspace." },
  { timestamp_pt: "2026-06-01 23:40:06 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=3, T1=0, T2=0, N=3, score=0. P1 left-foreground, standing, adjusting face/neck, mostly turned away, T0. P2 center-back, seated, facing curtain, T0. P3 front-right, headphones, looking at phone, T0. Consistent solo occupancy continues, no sign of collaboration." },
  { timestamp_pt: "2026-06-01 23:40:18 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=4, T1=0, T2=0, N=4, score=0. P1 far left, white/tan shirt, headphones, looking at phone, T0. P2 center-left, white shirt, headphones, back to camera, T0. P3 center-right, green shirt, back to camera, T0. P4 far right, pale pink shirt, headphones, T0. Occupancy has increased to 4; solo behavior persists." },
  { timestamp_pt: "2026-06-01 23:40:32 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=4, T1=0, T2=0, N=4, score=0. P1 far left, headphones, looking at phone, T0. P2 center-left, headphones, back to camera, T0. P3 center-right, green shirt, facing away, T0. P4 far right, headphones, pink shirt, looking at phone, T0. Solo occupancy trend continues, no collaboration observed." },
  { timestamp_pt: "2026-06-01 23:40:45 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=4, T1=0, T2=0, N=4, score=0. P1 far left, headphones, looking left, T0. P2 center-left, headphones, looking down, T0. P3 center-right, facing curtain, no interaction, T0. P4 far right, headphones, smiling at phone, T0. Persistent solo pattern from previous detections." },
  { timestamp_pt: "2026-06-01 23:40:56 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=4, T1=0, T2=0, N=4, score=0. P1 far left, tan pants, white t-shirt, headphones, looking at camera, T0. P2 center-left, white shirt, headphones, facing curtain, T0. P3 center-right, green shirt, facing curtain, T0. P4 far right, pale pink shirt, holding phone, smiling, T0. Persistent solo pattern." },
  { timestamp_pt: "2026-06-01 23:41:10 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=4, T1=0, T2=0, N=4, score=0. P1 far left, headphones, looking at phone, T0. P2 center-left, headphones, facing curtain, T0. P3 center-right, facing curtain, T0. P4 far right, headphones, looking at phone, T0. Occupancy and solo pattern remain unchanged." },
  { timestamp_pt: "2026-06-01 23:41:22 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 0, unit: "score" }], notes: "T0=4, T1=0, T2=0, N=4, score=0. P1 far left, headphones, looking left at camera, T0. P2 center-left, white shirt, headphones, seated back to back, T0. P3 center-right, green shirt, facing curtain, T0. P4 far right, pale pink shirt, holding phone and smiling, T0. Persistent solo pattern." },
]

export const DEMO_DETECTIONS_EXPE_I = [
  { timestamp_pt: "2026-06-01 23:48:09 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 0.5, unit: "score" }], notes: "T0=0, T1=2, T2=0, N=2, score=0.50. P1 left, sitting at table, no visible interaction, T1. P2 right, facing table, hand at chin, T1." },
  { timestamp_pt: "2026-06-01 23:48:20 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=2, N=2, score=1.00. P1 left, turned toward right, speaking, gesturing with hands, T2. P2 right, leaning toward left, engaging directly, T2. Both at same table, active conversation visible." },
  { timestamp_pt: "2026-06-01 23:48:32 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=2, N=2, score=1.00. P1 left, leaning in, visibly engaged with right, T2. P2 right, facing left, direct eye contact, active engagement, T2. Both at same table, mutual focus, collaborative interaction clearly visible." },
  { timestamp_pt: "2026-06-01 23:48:44 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=2, N=2, score=1.00. P1 left, facing right, gesturing, speaking, T2. P2 right, leaning in toward left, direct engagement, T2. Both seated at same table, actively collaborating." },
  { timestamp_pt: "2026-06-01 23:48:56 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=3, N=3, score=1.00. P1 left, seated, facing table, engaged, T2. P2 far center, standing/leaning in, talking, eye contact, T2. P3 right, seated, gesturing animatedly toward group, T2. All at same table, direct multi-way interaction." },
  { timestamp_pt: "2026-06-01 23:49:10 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=3, N=3, score=1.00. P1 left, hands together, actively facing group, T2. P2 center, leaning in, eye contact with others, T2. P3 right, facing table, speaking or engaged with others, T2. Strong collaborative interaction." },
  { timestamp_pt: "2026-06-01 23:49:21 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=3, N=3, score=1.00. P1 left, turned toward tablemates, eye contact, gesturing, T2. P2 center, smiling, animated posture, facing others, T2. P3 right, gesturing and speaking toward group, T2. All at same table, active visible engagement." },
  { timestamp_pt: "2026-06-01 23:49:33 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 far left, gesturing, direct eye contact, T2. P2 center left, engaged, facing others, T2. P3 center right, leaning in, speaking, T2. P4 far right, hands mid-gesture, facing group, T2. Active direct engagement among all group members." },
  { timestamp_pt: "2026-06-01 23:49:45 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 far left, turned toward tablemates, speaking, T2. P2 center left, smiling, leaning forward, T2. P3 center right, hands gesturing, facing into group, T2. P4 far right, animated posture, hands open mid-conversation, T2." },
  { timestamp_pt: "2026-06-01 23:49:56 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 far left, gesturing and turned toward group, T2. P2 center left, hands raised, appears mid-speech, T2. P3 center right, hands visible, engaged posture, T2. P4 far right, animated, gesturing, direct eye contact, T2." },
  { timestamp_pt: "2026-06-01 23:50:08 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=2, N=2, score=1.00. P1 left, seated, leaning in, facing tablemate, T2. P2 right, seated, gesturing, speaking to other, T2. Both share table, direct engaged conversation." },
  { timestamp_pt: "2026-06-01 23:50:20 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=2, N=2, score=1.00. P1 left, seated, facing tablemate, active conversation, T2. P2 right, seated, leaned in, looking at other, T2. Both at same table, direct visible engagement." },
  { timestamp_pt: "2026-06-01 23:50:33 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=2, N=2, score=1.00. P1 left, leaning forward, gesturing at tablemate, T2. P2 right, seated upright, facing and conversing with other, T2. Both at same table, visible direct engagement." },
  { timestamp_pt: "2026-06-01 23:50:45 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=3, N=3, score=1.00. P1 left, speaking, smiling, gesturing at others, T2. P2 center, seated, facing group, attentive, T2. P3 right (back to camera), gesturing with hands toward tablemates, T2." },
  { timestamp_pt: "2026-06-01 23:50:57 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=3, N=3, score=1.00. P1 left, gesturing, speaking toward other tablemates, T2. P2 center, gesturing and engaging with P1 and P3, T2. P3 right, smiling, turned toward others, T2. All seated at one table, directly interacting." },
  { timestamp_pt: "2026-06-01 23:51:09 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, gesturing, smiling, facing others, T2. P2 center-left, smiling, pointing at center-right, T2. P3 center-right, hands raised, engaged in discussion, T2. P4 right (back to camera), gesturing toward group, T2." },
  { timestamp_pt: "2026-06-01 23:51:21 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, looking at center group, talking, T2. P2 center-left, smiling, leaning in, speaking, T2. P3 center-right, attentive posture, looking at others, T2. P4 right, gesturing hands, facing table, T2." },
  { timestamp_pt: "2026-06-01 23:51:33 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, seated, facing group, listening, T2. P2 center-left, head turned to speaker, attentive, T2. P3 center-right, gesturing, speaking to tablemates, T2. P4 right, watching P3, hands together, T2." },
  { timestamp_pt: "2026-06-01 23:51:45 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, gesturing and talking to group, T2. P2 center-left, hands clasped, looking at group, T2. P3 center-right, leaning forward, engaged with others, T2. P4 right, facing group, attentive, T2. All directly interacting through conversation and gestures." },
  { timestamp_pt: "2026-06-01 23:51:59 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, turned toward center, engaged, T2. P2 center-left, smiling, leaning in, T2. P3 center-right, gesturing, talking, T2. P4 right, attentive posture, facing others, T2. Visibly interacting and engaged in group discussion." },
  { timestamp_pt: "2026-06-01 23:52:12 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, hands raised to head, focused on group, T2. P2 center-left, gesturing upward, engaged with tablemates, T2. P3 center-right, looking at others, attentive, T2. P4 right, arms raised, engaging with group, T2." },
  { timestamp_pt: "2026-06-01 23:52:24 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, hands preparing to gesture, facing group, T2. P2 center-left, mouth open mid-speech, gesturing at group, T2. P3 center-right, talking, arms moving in animated way, T2. P4 right, arms raised energetically, T2." },
  { timestamp_pt: "2026-06-01 23:52:37 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, gesturing mid-discussion, facing group, T2. P2 center-left, smiling, listening, turned toward table, T2. P3 center-right, relaxed, hand at head, watching others, T2. P4 right, leaning forward, focused on conversation, T2." },
  { timestamp_pt: "2026-06-01 23:52:49 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, hand to chin, listening to group, T2. P2 center-left, speaking and gesturing to others, T2. P3 center-right, talking, hand raised to gesture, T2. P4 right, looking at speaker, interacting with tablemates, T2." },
  { timestamp_pt: "2026-06-01 23:53:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }], notes: "T0=0, T1=0, T2=4, N=4, score=1.00. P1 left, smiling and gesturing toward group, T2. P2 center-left, laughing, facing group, T2. P3 center-right, talking with mouth open, hand on table, T2. P4 right, relaxed, hand to face, engaged in group, T2. All actively collaborating." },
]

// ── EXPE study objects ────────────────────────────────────────────────────────
const BE_STUDY_BASE_EXPE_Q = {
  id: "00000000-0000-0001-0000-000000000011",
  study_id: EXPE_STUDY_Q_ID,
  building_id: EXPE_SPACE_ID,
  user_id: null, session_id: null,
  study_goal: "I want to know how many people are in the space at any given time and how collaborative they are.",
  study_plan: {}, task_graph: {}, graph_plan: {},
  metadata: {
    study_name: "Quiet Zone Occupancy and Collaboration Study",
    monitored_zone_id: EXPE_QUIET_ZONE_ID,
    target_zones: [EXPE_QUIET_ZONE_ID],
    camera_id: "camera_2",
  },
  live_preview_status: null,
  started_at: "2026-06-02T06:36:33Z",
  duration_seconds: 300,
  created_at: "2026-06-02T06:36:34Z",
  updated_at: "2026-06-02T06:41:22Z",
}

export const BE_STUDY_IN_PROGRESS_EXPE_Q = {
  ...BE_STUDY_BASE_EXPE_Q,
  status: "running",
  current_stage: "monitoring_running" as const,
  live_preview_status: "Monitoring running — 8 snapshots analyzed",
}

export const BE_STUDY_COMPLETE_EXPE_Q = {
  ...BE_STUDY_BASE_EXPE_Q,
  status: "complete",
  current_stage: "complete" as const,
}

const BE_STUDY_BASE_EXPE_I = {
  id: "00000000-0000-0001-0000-000000000012",
  study_id: EXPE_STUDY_I_ID,
  building_id: EXPE_SPACE_ID,
  user_id: null, session_id: null,
  study_goal: "I want to know how many people are in the space at any given time and how collaborative they are.",
  study_plan: {}, task_graph: {}, graph_plan: {},
  metadata: {
    study_name: "Interaction Zone Occupancy and Collaboration Study",
    monitored_zone_id: EXPE_ROOM_ID,
    target_zones: [EXPE_ROOM_ID],
    camera_id: "camera_3",
  },
  live_preview_status: null,
  started_at: "2026-06-02T06:48:09Z",
  duration_seconds: 300,
  created_at: "2026-06-02T06:48:09Z",
  updated_at: "2026-06-02T06:53:00Z",
}

export const BE_STUDY_IN_PROGRESS_EXPE_I = {
  ...BE_STUDY_BASE_EXPE_I,
  status: "running",
  current_stage: "monitoring_running" as const,
  live_preview_status: "Monitoring running — 8 snapshots analyzed",
}

export const BE_STUDY_COMPLETE_EXPE_I = {
  ...BE_STUDY_BASE_EXPE_I,
  status: "complete",
  current_stage: "complete" as const,
}

// ── EXPE insight outputs ──────────────────────────────────────────────────────
const _EXPE_Q_LABELS = ["2026-06-01 23:36:34 PDT","2026-06-01 23:36:46 PDT","2026-06-01 23:37:11 PDT","2026-06-01 23:37:24 PDT","2026-06-01 23:37:35 PDT","2026-06-01 23:37:48 PDT","2026-06-01 23:38:00 PDT","2026-06-01 23:38:12 PDT","2026-06-01 23:38:24 PDT","2026-06-01 23:38:37 PDT","2026-06-01 23:38:50 PDT","2026-06-01 23:39:02 PDT","2026-06-01 23:39:14 PDT","2026-06-01 23:39:26 PDT","2026-06-01 23:39:38 PDT","2026-06-01 23:39:53 PDT","2026-06-01 23:40:06 PDT","2026-06-01 23:40:18 PDT","2026-06-01 23:40:32 PDT","2026-06-01 23:40:45 PDT","2026-06-01 23:40:56 PDT","2026-06-01 23:41:10 PDT","2026-06-01 23:41:22 PDT"]
const _EXPE_Q_OCC    = [2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4]
const _EXPE_Q_COLLAB = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]

export const BE_INSIGHT_OUTPUT_EXPE_Q = {
  id: SEED_EXPE_Q_INSIGHT_ID,
  study_id: EXPE_STUDY_Q_ID,
  output_mode: "final_insights" as const,
  status: "complete",
  created_at: "2026-06-02T07:00:00Z",
  dashboard_summary: "In this 5-minute snapshot with 23 detections, occupancy varied between 2 and 4 individuals and the collaboration index remained at 0 throughout.",
  charts: [
    { chart_id: "chart_occupancy_0",          chart_type: "line", title: "Occupancy (count)",          data: { labels: _EXPE_Q_LABELS, values: _EXPE_Q_OCC    } },
    { chart_id: "chart_collaboration_index_1", chart_type: "line", title: "Collaboration Index (score)", data: { labels: _EXPE_Q_LABELS, values: _EXPE_Q_COLLAB } },
  ],
  tables: [
    {
      table_id: "table_detection_log",
      title: "Detection Log",
      columns: ["Timestamp", "Occupancy", "Collaboration Index", "Notes"],
      rows: DEMO_DETECTIONS_EXPE_Q.map(d => [
        d.timestamp_pt,
        String(d.detected_behaviors.find(b => b.name === "Occupancy")?.value ?? ""),
        String(d.detected_behaviors.find(b => b.name === "Collaboration Index")?.value ?? ""),
        d.notes,
      ]),
    },
  ],
  insights: [
    "During this snapshot, occupancy appeared to range steadily from two to four individuals.",
    "The collaboration index remained at zero, suggesting no visible interaction between participants.",
    "Behavior appears to be primarily solo-focused, with individuals engaging separately on devices.",
    "This brief recording suggests a stable pattern of solitary activity during this snapshot.",
  ],
  recommendations: [
    "Extend the observation duration to capture a more representative sample of behaviors.",
    "Observe the area again at different times to assess variability in occupancy and interaction patterns.",
    "Combine this brief study with additional data collection before drawing firm conclusions.",
  ],
}

const _EXPE_I_LABELS = ["2026-06-01 23:48:09 PDT","2026-06-01 23:48:20 PDT","2026-06-01 23:48:32 PDT","2026-06-01 23:48:44 PDT","2026-06-01 23:48:56 PDT","2026-06-01 23:49:10 PDT","2026-06-01 23:49:21 PDT","2026-06-01 23:49:33 PDT","2026-06-01 23:49:45 PDT","2026-06-01 23:49:56 PDT","2026-06-01 23:50:08 PDT","2026-06-01 23:50:20 PDT","2026-06-01 23:50:33 PDT","2026-06-01 23:50:45 PDT","2026-06-01 23:50:57 PDT","2026-06-01 23:51:09 PDT","2026-06-01 23:51:21 PDT","2026-06-01 23:51:33 PDT","2026-06-01 23:51:45 PDT","2026-06-01 23:51:59 PDT","2026-06-01 23:52:12 PDT","2026-06-01 23:52:24 PDT","2026-06-01 23:52:37 PDT","2026-06-01 23:52:49 PDT","2026-06-01 23:53:00 PDT"]
const _EXPE_I_OCC    = [2,2,2,2,3,3,3,4,4,4,2,2,2,3,3,4,4,4,4,4,4,4,4,4,4]
const _EXPE_I_COLLAB = [0.5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]

export const BE_INSIGHT_OUTPUT_EXPE_I = {
  id: SEED_EXPE_I_INSIGHT_ID,
  study_id: EXPE_STUDY_I_ID,
  output_mode: "final_insights" as const,
  status: "complete",
  created_at: "2026-06-02T07:10:00Z",
  dashboard_summary: "During this 5-minute snapshot with 25 data points, participants appear to engage in active collaborative interactions most of the time, with occupancy varying between 2 and 4 and a high collaboration index in the majority of detections.",
  charts: [
    { chart_id: "chart_occupancy_0",          chart_type: "line", title: "Occupancy (count)",          data: { labels: _EXPE_I_LABELS, values: _EXPE_I_OCC    } },
    { chart_id: "chart_collaboration_index_1", chart_type: "line", title: "Collaboration Index (score)", data: { labels: _EXPE_I_LABELS, values: _EXPE_I_COLLAB } },
  ],
  tables: [
    {
      table_id: "table_detection_log",
      title: "Detection Log",
      columns: ["Timestamp", "Occupancy", "Collaboration Index", "Notes"],
      rows: DEMO_DETECTIONS_EXPE_I.map(d => [
        d.timestamp_pt,
        String(d.detected_behaviors.find(b => b.name === "Occupancy")?.value ?? ""),
        String(d.detected_behaviors.find(b => b.name === "Collaboration Index")?.value ?? ""),
        d.notes,
      ]),
    },
  ],
  insights: [
    "During this snapshot, the group appears to engage in active collaboration in most detections, indicated by a collaboration index of 1.0.",
    "Early observations suggest a brief period of lower engagement, with a collaboration index of 0.5 when two participants were present.",
    "The data appears to show occupancy fluctuating between 2 and 4 participants while maintaining consistent visible interaction during this short observation.",
  ],
  recommendations: [
    "Suggest extending the observation period to gather a more comprehensive view of interaction patterns.",
    "Consider conducting additional observations at different times to verify if these tentative trends persist.",
    "Recommend repeating the study to confirm the initial insights before making any changes based on this brief snapshot.",
  ],
}

// ── BE_studies ───────────────────────────────────────────────────────────────
// metadata.monitored_zone_id tells the heatmap which zone to highlight
const BE_STUDY_BASE = {
  id: SEED_BE_STUDY_ID,
  study_id: STUDY_ID,
  building_id: SPACE_ID,
  user_id: null,
  session_id: null,
  study_goal: "Monitor the Kitchen zone for occupancy patterns, collaboration activity, and slip/fall risk during a morning session. Camera faces the kitchen work counter and seating area.",
  study_plan: {},
  task_graph: {},
  graph_plan: {},
  metadata: {
    study_name: "Peterson Building Occupancy Study",
    monitored_zone_id: KITCHEN_ID,
    target_zones: [KITCHEN_ID],
  },
  live_preview_status: null,
  started_at: "2026-05-05T10:00:00.000000+00:00",
  duration_seconds: 720,
  created_at: "2026-05-05T09:59:45.000000+00:00",
  updated_at: "2026-05-05T10:12:00.000000+00:00",
}

export const BE_STUDY_IN_PROGRESS = {
  ...BE_STUDY_BASE,
  status: "running",
  current_stage: "monitoring_running" as const,
  live_preview_status: "Monitoring running — 17 snapshots analyzed",
}

export const BE_STUDY_COMPLETE = {
  ...BE_STUDY_BASE,
  status: "complete",
  current_stage: "complete" as const,
}

// ── BE_live_preview_metrics ───────────────────────────────────────────────────
export const BE_LIVE_METRICS = {
  id: SEED_LIVE_ID,
  study_id: STUDY_ID,
  status: "running",
  label: "Monitoring running — 17 snapshots analyzed",
  updated_at: "2026-05-05T22:15:03.000Z",
  metrics: {
    zone_metrics: {
      Kitchen:             { occupancy_pct: 90, count: 2 },
      "Team 1":            { occupancy_pct: 20, count: 2 },
      "Team 2":            { occupancy_pct: 30, count: 3 },
      "Team 5":            { occupancy_pct: 10, count: 1 },
      "Electronics Space": { occupancy_pct: 40, count: 4 },
    },
  },
}

// ── BE_behavior_detections (demo) ────────────────────────────────────────────
// Occupancy builds up, Collaboration Index follows, Slip/Fall Risk spikes at the end.
export const DEMO_DETECTIONS = [
  { timestamp_pt: "2026-05-05 10:00:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "Two people working quietly at the counter." },
  { timestamp_pt: "2026-05-05 10:00:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 2, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "Light conversation, both occupants engaged." },
  { timestamp_pt: "2026-05-05 10:01:40 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 4, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "Third person enters, joins the counter area." },
  { timestamp_pt: "2026-05-05 10:02:30 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 5, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "Group discussion forming around shared materials." },
  { timestamp_pt: "2026-05-05 10:03:20 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 6, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "Fourth person joins. Active whiteboard session visible." },
  { timestamp_pt: "2026-05-05 10:04:10 PDT", detected_behaviors: [{ name: "Occupancy", value: 5, unit: "count" }, { name: "Collaboration Index", value: 7, unit: "score" }, { name: "Slip/Fall Risk Index", value: 2, unit: "score" }], notes: "Fifth person arrives. Zone at peak activity." },
  { timestamp_pt: "2026-05-05 10:05:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 5, unit: "count" }, { name: "Collaboration Index", value: 8, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "High collaboration — all five occupants interacting." },
  { timestamp_pt: "2026-05-05 10:05:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 5, unit: "count" }, { name: "Collaboration Index", value: 7, unit: "score" }, { name: "Slip/Fall Risk Index", value: 2, unit: "score" }], notes: "Still busy. One person moving toward the sink area." },
  { timestamp_pt: "2026-05-05 10:06:40 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 6, unit: "score" }, { name: "Slip/Fall Risk Index", value: 1, unit: "score" }], notes: "One person has left. Remaining group winding down." },
  { timestamp_pt: "2026-05-05 10:07:30 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 4, unit: "score" }, { name: "Slip/Fall Risk Index", value: 2, unit: "score" }], notes: "Three people remain. Activity decreasing." },
  { timestamp_pt: "2026-05-05 10:08:20 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 3, unit: "score" }, { name: "Slip/Fall Risk Index", value: 2, unit: "score" }], notes: "Quieter — two seated, one standing near counter." },
  { timestamp_pt: "2026-05-05 10:09:10 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 2, unit: "score" }, { name: "Slip/Fall Risk Index", value: 3, unit: "score" }], notes: "Two occupants. Slight floor anomaly detected near sink." },
  { timestamp_pt: "2026-05-05 10:10:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk Index", value: 3, unit: "score" }], notes: "Two people still present. Risk signal persisting." },
  { timestamp_pt: "2026-05-05 10:10:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk Index", value: 8, unit: "score" }], notes: "2 persons present. Left: person standing at counter near sink, body facing away, picking up items. Right: person moving toward exit, back to camera. Wet surface visible on floor near sink base — approximately 0.5m² coverage, consistent with liquid spill. Neither occupant visibly oriented to the hazard. Slip/fall risk elevated — occupant path crosses wet zone." },
  { timestamp_pt: "2026-05-05 10:11:40 PDT", detected_behaviors: [{ name: "Occupancy", value: 1, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk Index", value: 9, unit: "score" }], notes: "1 person remaining in kitchen zone. Second occupant has exited frame. Remaining person standing at counter, body oriented away from sink, unaware of floor hazard. Wet surface now covers approximately 0.8m² near sink and adjacent walkway — visible sheen on floor consistent with water spillage. Person's likely exit path crosses the wet zone directly. No slip-resistant mat present. Slip/fall risk: critical — immediate cleanup and area alert required." },
]

// ── BE_insight_outputs ────────────────────────────────────────────────────────
const _DET_LABELS = ["10:00:00","10:00:50","10:01:40","10:02:30","10:03:20","10:04:10","10:05:00","10:05:50","10:06:40","10:07:30","10:08:20","10:09:10","10:10:00","10:10:50","10:11:40"]
const _OCC_VALS   = [2,2,3,3,4,5,5,5,4,3,3,2,2,2,1]
const _COLLAB_VALS= [1,2,4,5,6,7,8,7,6,4,3,2,1,1,1]
const _RISK_VALS  = [1,1,1,1,1,2,1,2,1,2,2,3,3,8,9]

export const BE_INSIGHT_OUTPUT = {
  id: SEED_INSIGHT_ID,
  study_id: STUDY_ID,
  output_mode: "final_insights" as const,
  status: "complete",
  created_at: "2026-05-05T10:17:29.098Z",
  dashboard_summary:
    "The Peterson Building Occupancy Study monitored occupancy, collaboration, and slip/fall risk over 12 minutes. " +
    "The space saw peak activity mid-session (up to 5 occupants, collaboration index 8) before winding down. " +
    "A critical safety event was detected at 10:10–10:11: slip/fall risk spiked to 9, consistent with a liquid spill on the kitchen floor. " +
    "Immediate corrective action was recommended.",
  charts: [
    {
      chart_id: "chart_1",
      chart_type: "line",
      title: "Occupancy Over Time",
      data: { labels: _DET_LABELS, values: _OCC_VALS },
    },
    {
      chart_id: "chart_2",
      chart_type: "line",
      title: "Collaboration Index Over Time",
      data: { labels: _DET_LABELS, values: _COLLAB_VALS },
    },
    {
      chart_id: "chart_3",
      chart_type: "line",
      title: "Slip/Fall Risk Index Over Time",
      data: { labels: _DET_LABELS, values: _RISK_VALS },
    },
  ],
  tables: [
    {
      table_id: "table_1",
      title: "Detection Log",
      columns: ["Timestamp", "Occupancy", "Collaboration Index", "Slip/Fall Risk Index", "Notes"],
      rows: DEMO_DETECTIONS.map(d => [
        d.timestamp_pt.split(" ")[1],
        String(d.detected_behaviors.find(b => b.name === "Occupancy")?.value ?? ""),
        String(d.detected_behaviors.find(b => b.name === "Collaboration Index")?.value ?? ""),
        String(d.detected_behaviors.find(b => b.name === "Slip/Fall Risk")?.value ?? ""),
        d.notes,
      ]),
    },
  ],
  insights: [
    "Occupancy peaked at 5 people between 10:04 and 10:06, indicating the kitchen is a high-demand gathering point during the morning session.",
    "Collaboration Index tracked closely with occupancy, reaching a maximum score of 8 — suggesting the kitchen drives spontaneous group interactions.",
    "Slip/Fall Risk remained low (1–3) for the first 10 minutes but spiked sharply to 8–9 in the final two readings, indicating an acute hazard event.",
    "The combination of declining occupancy and rising slip/fall risk in the final minutes suggests occupants may have caused or noticed a spill and begun vacating the area.",
  ],
  recommendations: [
    "Post a floor hazard alert protocol near the kitchen and ensure cleaning supplies are accessible within the zone.",
    "Install a floor moisture sensor or floor-level camera angle to enable earlier detection of liquid spills.",
    "Consider adding a slip-resistant mat in front of the sink and counter areas, which were the most active zones during peak occupancy.",
    "Schedule a mid-morning cleaning check (around 10:00–10:15) to coincide with peak kitchen activity identified in this study.",
  ],
}

// ── Models demo (model-created scenario) ─────────────────────────────────────

export const SEED_MODEL_DATASET_ID     = "00000000-0000-0000-0000-000000000010"
export const SEED_LGQ_MODEL_DATASET_ID = "00000000-0000-0000-0000-000000000014"

// CO2 is randomly scattered (noisy). Occupancy is a realistic step function over time
// (people arrive and stay; CO2 lags behind, so the scatter plot looks naturally noisy).
const _CO2  = [418, 452, 431, 598, 512, 743, 489, 681, 775, 534, 862, 647, 791, 710, 923, 688, 847, 952, 731, 875, 814, 968, 743, 891, 812, 654, 738, 571, 623, 487]
const _OCC  = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3, 2, 1, 0]
const _TEMP = [21.1, 21.4, 21.2, 22.3, 21.8, 22.9, 21.7, 22.5, 23.1, 22.0, 23.4, 22.6, 23.0, 22.8, 23.6, 22.7, 23.2, 23.7, 22.9, 23.3, 23.1, 23.8, 22.9, 23.4, 23.1, 22.5, 22.8, 22.2, 22.4, 21.8]
const _TS   = Array.from({ length: 30 }, (_, i) => `10:${String(i).padStart(2, "0")}:00`)

// Split views for showing individual table previews in the demo
export const DEMO_BEHAVIOR_DATASET = {
  filename: "behavior_data.csv",
  columns: ["Timestamp", "Occupancy (count)"],
  rows: _OCC.map((occ, i) => ({ "Timestamp": _TS[i], "Occupancy (count)": occ })),
}

export const DEMO_SENSOR_DATASET = {
  filename: "demo_co2_data.xlsx",
  columns: ["Timestamp", "CO2 (ppm)", "Temperature (°C)"],
  rows: _CO2.map((co2, i) => ({ "Timestamp": _TS[i], "CO2 (ppm)": co2, "Temperature (°C)": _TEMP[i] })),
}

export const DEMO_MERGED_DATASET = {
  filename: "demo_co2_data × behavior",
  columns: ["Timestamp", "CO2 (ppm)", "Temperature (°C)", "Occupancy (count)"],
  rows: _CO2.map((co2, i) => ({
    "Timestamp": _TS[i],
    "CO2 (ppm)": co2,
    "Temperature (°C)": _TEMP[i],
    "Occupancy (count)": _OCC[i],
  })),
}

export const DEMO_MODEL_DATASET = {
  id: SEED_MODEL_DATASET_ID,
  name: "demo_co2_data × behavior",
  study_id: STUDY_ID,
  columns: ["Timestamp", "CO2 (ppm)", "Temperature (°C)", "Occupancy (count)"],
  data: _CO2.map((co2, i) => ({
    "Timestamp": _TS[i],
    "CO2 (ppm)": co2,
    "Temperature (°C)": _TEMP[i],
    "Occupancy (count)": _OCC[i],
  })),
  metadata: { rowCount: 30, merged: true },
  created_at: "2026-05-05T22:00:00Z",
}

// OLS fit for step-function OCC vs scattered CO2: slope=0.00666, intercept=-2.687 (R²≈0.59)
const _LINEAR_PRED = _CO2.map(x => parseFloat((0.00666 * x - 2.687).toFixed(4)))

// LSTM predictions: tracks the step-function OCC closely using temporal context (R²≈0.997)
const _LSTM_PRED = [0.05, 0.02, 0.08, 0.15, 0.10, 0.92, 0.95, 1.05, 0.88, 1.02, 1.85, 2.10, 1.95, 2.05, 1.90, 2.95, 3.05, 2.92, 3.08, 3.02, 3.88, 4.05, 3.92, 4.08, 3.95, 2.95, 3.05, 1.92, 0.95, 0.08]

const _LSTM_LOSS = Array.from({ length: 100 }, (_, i) =>
  parseFloat((0.72 * Math.exp(-i / 18) + 0.07).toFixed(4))
)

export const DEMO_FIT_ENTRIES: FitEntry[] = [
  {
    id: "demo-linear",
    label: "Linear: CO2 (ppm) → Occupancy (count)",
    color: "#f59e0b",
    visible: true,
    xValues: _CO2,
    yValues: _OCC,
    fitResult: {
      modelType: "linear",
      parameters: { slope: 0.00666, intercept: -2.687 },
      metrics: { r2: 0.585, rmse: 0.888, mse: 0.789 },
      predictedY: _LINEAR_PRED,
    } as FitResult,
    inputCount: 1,
    inputCols: ["CO2 (ppm)"],
    outputCol: "Occupancy (count)",
    inputValues: { "CO2 (ppm)": _CO2 },
  },
  {
    id: "demo-lstm",
    label: "LSTM: CO2 (ppm) → Occupancy (count)",
    color: "#8b5cf6",
    visible: true,
    xValues: _CO2,
    yValues: _OCC,
    fitResult: {
      modelType: "lstm",
      parameters: { architecture: "LSTM: Input([8,1]) → LSTM(32) → Dense(16) → Dense(1)" },
      metrics: { r2: 0.997, rmse: 0.079, mse: 0.006 },
      predictedY: _LSTM_PRED,
      trainingLoss: _LSTM_LOSS,
    } as FitResult,
    inputCount: 1,
    inputCols: ["CO2 (ppm)"],
    outputCol: "Occupancy (count)",
    inputValues: { "CO2 (ppm)": _CO2 },
  },
]

// ── LGQ Models demo (model-created scenario) ──────────────────────────────────
const _LGQ_TS_SHORT = ["14:00","14:01","14:02","14:03","14:04","14:05","14:06","14:07","14:08"]
const _LGQ_TIME_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const _LGQ_OCC_MODEL = [1, 2, 3, 3, 3, 4, 4, 3, 3]

// LSTM closely tracks the occupancy ramp-up and plateau (R²≈0.998)
const _LGQ_LSTM_PRED = [0.92, 2.05, 2.98, 3.01, 2.99, 3.96, 4.03, 2.97, 3.04]

const _LGQ_LSTM_LOSS = Array.from({ length: 80 }, (_, i) =>
  parseFloat((0.85 * Math.exp(-i / 14) + 0.03).toFixed(4))
)

export const DEMO_BEHAVIOR_DATASET_LGQ = {
  filename: "lgq_conference_room_behavior.csv",
  columns: ["Timestamp", "Occupancy (count)"],
  rows: _LGQ_OCC_MODEL.map((occ, i) => ({ "Timestamp": _LGQ_TS_SHORT[i], "Occupancy (count)": occ })),
}

export const DEMO_MERGED_DATASET_LGQ = {
  filename: "lgq_conference_room_behavior",
  columns: ["Timestamp", "Time Step", "Occupancy (count)"],
  rows: _LGQ_TIME_IDX.map((idx, i) => ({
    "Timestamp": _LGQ_TS_SHORT[i],
    "Time Step": idx,
    "Occupancy (count)": _LGQ_OCC_MODEL[i],
  })),
}

export const DEMO_MODEL_DATASET_LGQ = {
  id: SEED_LGQ_MODEL_DATASET_ID,
  name: "lgq_conference_room_behavior",
  study_id: LGQ_STUDY_ID,
  columns: ["Timestamp", "Time Step", "Occupancy (count)"],
  data: _LGQ_TIME_IDX.map((idx, i) => ({
    "Timestamp": _LGQ_TS_SHORT[i],
    "Time Step": idx,
    "Occupancy (count)": _LGQ_OCC_MODEL[i],
  })),
  metadata: { rowCount: 9, merged: true },
  created_at: "2026-05-28T14:10:00Z",
}

export const DEMO_FIT_ENTRIES_LGQ: FitEntry[] = [
  {
    id: "demo-lgq-lstm",
    label: "LSTM: Time Series → Occupancy (count)",
    color: "#8b5cf6",
    visible: true,
    xValues: _LGQ_TIME_IDX,
    yValues: _LGQ_OCC_MODEL,
    fitResult: {
      modelType: "lstm",
      parameters: { architecture: "LSTM: Input([4,1]) → LSTM(16) → Dense(8) → Dense(1)" },
      metrics: { r2: 0.998, rmse: 0.063, mse: 0.004 },
      predictedY: _LGQ_LSTM_PRED,
      trainingLoss: _LGQ_LSTM_LOSS,
    } as FitResult,
    inputCount: 1,
    inputCols: ["Time Step"],
    outputCol: "Occupancy (count)",
    inputValues: { "Time Step": _LGQ_TIME_IDX },
  },
]

// ── EXPE Models demo (model-created scenario) ─────────────────────────────────
const _EXPE_I_TS_SHORT = ["23:48","23:48","23:48","23:48","23:48","23:49","23:49","23:49","23:49","23:49","23:50","23:50","23:50","23:50","23:50","23:51","23:51","23:51","23:51","23:51","23:52","23:52","23:52","23:52","23:53"]
const _EXPE_I_TIME_IDX = Array.from({ length: 25 }, (_, i) => i)
const _EXPE_I_OCC_MODEL = [2,2,2,2,3,3,3,4,4,4,2,2,2,3,3,4,4,4,4,4,4,4,4,4,4]

const _EXPE_I_LSTM_PRED = [2.02,2.01,2.00,2.38,2.89,2.99,3.44,3.91,3.98,3.57,2.42,1.97,2.09,2.81,3.11,3.84,3.96,3.99,4.00,3.99,3.98,3.99,4.00,3.99,3.97]

const _EXPE_I_LSTM_LOSS = Array.from({ length: 80 }, (_, i) =>
  parseFloat((0.85 * Math.exp(-i / 14) + 0.03).toFixed(4))
)

export const DEMO_BEHAVIOR_DATASET_EXPE = {
  filename: "expe_interaction_zone_behavior.csv",
  columns: ["Timestamp", "Occupancy (count)"],
  rows: _EXPE_I_OCC_MODEL.map((occ, i) => ({ "Timestamp": _EXPE_I_TS_SHORT[i], "Occupancy (count)": occ })),
}

export const DEMO_MERGED_DATASET_EXPE = {
  filename: "expe_interaction_zone_behavior",
  columns: ["Timestamp", "Time Step", "Occupancy (count)"],
  rows: _EXPE_I_TIME_IDX.map((idx, i) => ({
    "Timestamp": _EXPE_I_TS_SHORT[i],
    "Time Step": idx,
    "Occupancy (count)": _EXPE_I_OCC_MODEL[i],
  })),
}

export const DEMO_MODEL_DATASET_EXPE = {
  id: SEED_EXPE_MODEL_DATASET_ID,
  name: "expe_interaction_zone_behavior",
  study_id: EXPE_STUDY_I_ID,
  columns: ["Timestamp", "Time Step", "Occupancy (count)"],
  data: _EXPE_I_TIME_IDX.map((idx, i) => ({
    "Timestamp": _EXPE_I_TS_SHORT[i],
    "Time Step": idx,
    "Occupancy (count)": _EXPE_I_OCC_MODEL[i],
  })),
  metadata: { rowCount: 25, merged: true },
  created_at: "2026-06-02T06:53:19Z",
}

export const DEMO_FIT_ENTRIES_EXPE: FitEntry[] = [
  {
    id: "demo-expe-lstm",
    label: "LSTM: Time Series → Occupancy (count)",
    color: "#8b5cf6",
    visible: true,
    xValues: _EXPE_I_TIME_IDX,
    yValues: _EXPE_I_OCC_MODEL,
    fitResult: {
      modelType: "lstm",
      parameters: { architecture: "LSTM: Input([4,1]) → LSTM(16) → Dense(8) → Dense(1)" },
      metrics: { r2: 0.964, rmse: 0.187, mse: 0.035 },
      predictedY: _EXPE_I_LSTM_PRED,
      trainingLoss: _EXPE_I_LSTM_LOSS,
    } as FitResult,
    inputCount: 1,
    inputCols: ["Time Step"],
    outputCol: "Occupancy (count)",
    inputValues: { "Time Step": _EXPE_I_TIME_IDX },
  },
]
