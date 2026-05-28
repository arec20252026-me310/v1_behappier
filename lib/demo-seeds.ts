/**
 * Demo scenario seed data — ME310 Loft space.
 *
 * Zone-to-insight linkage uses BE_studies.metadata.monitored_zone_id so
 * the heatmap can highlight the correct zone without any schema changes.
 */

import type { FitEntry } from "@/components/models/model-chart"
import type { FitResult } from "@/lib/model-fitting"

// ── Fixed IDs (real Supabase rows) ──────────────────────────────────────────
export const SPACE_ID   = "e8d9c195-0ae8-41ed-b03f-034ce91dd3c4"
export const HA_MAP_ID  = "bf7ba38c-9bb5-43c9-b099-f3b293285efc"
export const CAMERA_ID  = "8a425334-aafb-4d8a-9bd2-737e73eed13b"
export const KITCHEN_ID = "4a1fd84a-8805-49c2-b6bc-6552519ad18b"
export const STUDY_ID   = "study_1778019133385"

// Synthetic UUIDs for seed-created rows (deletable without touching real rows)
export const SEED_BE_STUDY_ID   = "00000000-0000-0000-0000-000000000001"
export const SEED_LIVE_ID       = "00000000-0000-0000-0000-000000000002"
export const SEED_INSIGHT_ID    = "00000000-0000-0000-0000-000000000003"

// ── Metrics ──────────────────────────────────────────────────────────────────
export const DEMO_METRICS = [
  { id: "713b847b-ff24-48e9-a3bb-7223c358357c", space_id: SPACE_ID, name: "Seating Comfort Score",  description: "Availability and usage patterns of seating areas",          category: "comfort"            as const, unit: "score",      calculation_method: null, rubric: null, literature_reference: "Whyte, W. (1980). The Social Life of Small Urban Spaces", is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "a5aa0843-aae4-4609-a5d2-282971fad5c4", space_id: SPACE_ID, name: "Collaboration Index",    description: "Frequency and duration of group formations",               category: "social_interaction" as const, unit: "score",      calculation_method: null, rubric: null, literature_reference: "Allen, T. (1977). Managing the Flow of Technology",          is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "b6d5e887-7645-48a8-89b1-3edbc6ac49e6", space_id: SPACE_ID, name: "Foot Traffic Count",     description: "Number of people entering/exiting a zone",                 category: "traffic_flow"       as const, unit: "count",      calculation_method: null, rubric: null, literature_reference: "Whyte, W. (1980). The Social Life of Small Urban Spaces", is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "a2f25409-e598-415a-93ae-f140d2998ef6", space_id: SPACE_ID, name: "Peak Occupancy",         description: "Maximum number of occupants at any given time",             category: "utilization"        as const, unit: "count",      calculation_method: null, rubric: null, literature_reference: "Hillier, B. (2007). Space is the Machine",                   is_active: false, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "27ddd347-8024-46eb-808a-ab1515a5b502", space_id: SPACE_ID, name: "Utilization Rate",       description: "Percentage of capacity being used over time",              category: "utilization"        as const, unit: "percentage", calculation_method: null, rubric: null, literature_reference: "Duffy, F. (1997). The New Office",                          is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "7e859061-3a9f-44b3-88f0-4a515a06d535", space_id: SPACE_ID, name: "Occupancy",              description: "Number of people present within the observed area at a given instant", category: "utilization" as const, unit: "count",      calculation_method: null, rubric: null, literature_reference: "Fruin, J.J. (1971). Pedestrian Planning and Design. Metropolitan Association of Urban Designers and Environmental Planners.", is_active: true, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
]

// ── Space ────────────────────────────────────────────────────────────────────
export const DEMO_SPACE = {
  id: SPACE_ID,
  name: "ME310 Loft",
  description: "Stanford ME310 design studio space",
  address: null,
  total_area_sqft: null,
  building_type: "office",
  floor_plan_url: "/api/file?pathname=floor-plans%2F1776921523908.png",
  grid_resolution: 20,
  metadata: {},
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

// ── Zones ────────────────────────────────────────────────────────────────────
const TS = { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }

export const ZONES = [
  { id: "bc51d7f6-d81d-421a-9a82-11f96220ae4b", space_id: SPACE_ID, name: "Team 1",            zone_type: "workspace", grid_x: 3,  grid_y: 4,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "57ba4211-be1f-49b5-bf1a-b70314aa6e25", space_id: SPACE_ID, name: "Team 2",            zone_type: "workspace", grid_x: 3,  grid_y: 8,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "63f18aeb-6b63-4c0b-9db1-3c7b9a7f52f5", space_id: SPACE_ID, name: "Team 3",            zone_type: "workspace", grid_x: 3,  grid_y: 12, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "0a3a375b-125a-4924-8d6b-a8a6325d9066", space_id: SPACE_ID, name: "Team 4",            zone_type: "workspace", grid_x: 7,  grid_y: 13, grid_width: 2, grid_height: 2, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "d171a3bb-afab-4b81-8408-25b5cc53266d", space_id: SPACE_ID, name: "Team 5",            zone_type: "workspace", grid_x: 13, grid_y: 4,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "57ef901d-2f29-4d0e-ad43-d35439498ef4", space_id: SPACE_ID, name: "Team 6",            zone_type: "workspace", grid_x: 13, grid_y: 8,  grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "76a61a27-e7e3-4105-9f37-1b97d98b0b65", space_id: SPACE_ID, name: "Team 7",            zone_type: "workspace", grid_x: 10, grid_y: 13, grid_width: 2, grid_height: 2, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: "a1e9f303-cdce-465d-bd02-0ecdb31d15bd", space_id: SPACE_ID, name: "Team 8",            zone_type: "workspace", grid_x: 13, grid_y: 12, grid_width: 4, grid_height: 3, color: "#10B981", capacity: 10, metadata: {}, ...TS },
  { id: KITCHEN_ID,                              space_id: SPACE_ID, name: "Kitchen",           zone_type: "kitchen",   grid_x: 6,  grid_y: 1,  grid_width: 6, grid_height: 3, color: "#EC4899", capacity: 10, metadata: {}, ...TS },
  { id: "7a42add1-dc7b-4aab-866b-55d69d7cdad6", space_id: SPACE_ID, name: "Electronics Space", zone_type: "workspace", grid_x: 7,  grid_y: 16, grid_width: 5, grid_height: 4, color: "#10B981", capacity: 10, metadata: {}, ...TS },
]

// ── Camera ───────────────────────────────────────────────────────────────────
// Kitchen zone (grid_x:6, grid_y:1, grid_width:6, grid_height:3) at cellSize=30 (res=20)
// center: x=(6+3)*30=270, y=(1+1.5)*30=75
export const CAMERA = {
  id: CAMERA_ID,
  zone_id: KITCHEN_ID,
  name: "Loft Camera Fluent (Motion)",
  stream_url: null,
  status: "active" as const,
  field_of_view: {},
  metadata: { ha_entity_id: "camera.loft_camera_fluent", placement_x: 270, placement_y: 75, placement_direction: "down" },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

export const DEMO_CAMERA_PLACEMENT = {
  id: `cam-${KITCHEN_ID}`,
  zoneId: KITCHEN_ID,
  x: 270,
  y: 75,
  direction: "down" as import("@/lib/types").CameraDirection,
  label: "Loft Camera Fluent (Motion)",
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
    study_name: "Kitchen Morning Safety & Usage",
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
  { timestamp_pt: "2026-05-05 10:00:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "Two people working quietly at the counter." },
  { timestamp_pt: "2026-05-05 10:00:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 2, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "Light conversation, both occupants engaged." },
  { timestamp_pt: "2026-05-05 10:01:40 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 4, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "Third person enters, joins the counter area." },
  { timestamp_pt: "2026-05-05 10:02:30 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 5, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "Group discussion forming around shared materials." },
  { timestamp_pt: "2026-05-05 10:03:20 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 6, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "Fourth person joins. Active whiteboard session visible." },
  { timestamp_pt: "2026-05-05 10:04:10 PDT", detected_behaviors: [{ name: "Occupancy", value: 5, unit: "count" }, { name: "Collaboration Index", value: 7, unit: "score" }, { name: "Slip/Fall Risk", value: 2, unit: "score" }], notes: "Fifth person arrives. Zone at peak activity." },
  { timestamp_pt: "2026-05-05 10:05:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 5, unit: "count" }, { name: "Collaboration Index", value: 8, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "High collaboration — all five occupants interacting." },
  { timestamp_pt: "2026-05-05 10:05:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 5, unit: "count" }, { name: "Collaboration Index", value: 7, unit: "score" }, { name: "Slip/Fall Risk", value: 2, unit: "score" }], notes: "Still busy. One person moving toward the sink area." },
  { timestamp_pt: "2026-05-05 10:06:40 PDT", detected_behaviors: [{ name: "Occupancy", value: 4, unit: "count" }, { name: "Collaboration Index", value: 6, unit: "score" }, { name: "Slip/Fall Risk", value: 1, unit: "score" }], notes: "One person has left. Remaining group winding down." },
  { timestamp_pt: "2026-05-05 10:07:30 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 4, unit: "score" }, { name: "Slip/Fall Risk", value: 2, unit: "score" }], notes: "Three people remain. Activity decreasing." },
  { timestamp_pt: "2026-05-05 10:08:20 PDT", detected_behaviors: [{ name: "Occupancy", value: 3, unit: "count" }, { name: "Collaboration Index", value: 3, unit: "score" }, { name: "Slip/Fall Risk", value: 2, unit: "score" }], notes: "Quieter — two seated, one standing near counter." },
  { timestamp_pt: "2026-05-05 10:09:10 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 2, unit: "score" }, { name: "Slip/Fall Risk", value: 3, unit: "score" }], notes: "Two occupants. Slight floor anomaly detected near sink." },
  { timestamp_pt: "2026-05-05 10:10:00 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk", value: 3, unit: "score" }], notes: "Two people still present. Risk signal persisting." },
  { timestamp_pt: "2026-05-05 10:10:50 PDT", detected_behaviors: [{ name: "Occupancy", value: 2, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk", value: 8, unit: "score" }], notes: "Slip/fall risk rising sharply — possible liquid on floor." },
  { timestamp_pt: "2026-05-05 10:11:40 PDT", detected_behaviors: [{ name: "Occupancy", value: 1, unit: "count" }, { name: "Collaboration Index", value: 1, unit: "score" }, { name: "Slip/Fall Risk", value: 9, unit: "score" }], notes: "Critical: water spillage on kitchen floor. Immediate cleanup required." },
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
    "The Kitchen Morning Safety & Usage study monitored occupancy, collaboration, and slip/fall risk over 12 minutes. " +
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
      title: "Slip/Fall Risk Over Time",
      data: { labels: _DET_LABELS, values: _RISK_VALS },
    },
  ],
  tables: [
    {
      table_id: "table_1",
      title: "Detection Log",
      columns: ["Timestamp", "Occupancy", "Collaboration Index", "Slip/Fall Risk", "Notes"],
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

export const SEED_MODEL_DATASET_ID = "00000000-0000-0000-0000-000000000010"

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
