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
  { id: "713b847b-ff24-48e9-a3bb-7223c358357c", space_id: SPACE_ID, name: "Seating Comfort Score",  description: "Availability and usage patterns of seating areas",          category: "comfort"            as const, unit: "score",      calculation_method: null, literature_reference: "Whyte, W. (1980). The Social Life of Small Urban Spaces", is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "a5aa0843-aae4-4609-a5d2-282971fad5c4", space_id: SPACE_ID, name: "Collaboration Index",    description: "Frequency and duration of group formations",               category: "social_interaction" as const, unit: "score",      calculation_method: null, literature_reference: "Allen, T. (1977). Managing the Flow of Technology",          is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "b6d5e887-7645-48a8-89b1-3edbc6ac49e6", space_id: SPACE_ID, name: "Foot Traffic Count",     description: "Number of people entering/exiting a zone",                 category: "traffic_flow"       as const, unit: "count",      calculation_method: null, literature_reference: "Whyte, W. (1980). The Social Life of Small Urban Spaces", is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "a2f25409-e598-415a-93ae-f140d2998ef6", space_id: SPACE_ID, name: "Peak Occupancy",         description: "Maximum number of occupants at any given time",             category: "utilization"        as const, unit: "count",      calculation_method: null, literature_reference: "Hillier, B. (2007). Space is the Machine",                   is_active: false, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "27ddd347-8024-46eb-808a-ab1515a5b502", space_id: SPACE_ID, name: "Utilization Rate",       description: "Percentage of capacity being used over time",              category: "utilization"        as const, unit: "percentage", calculation_method: null, literature_reference: "Duffy, F. (1997). The New Office",                          is_active: true,  ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
  { id: "7e859061-3a9f-44b3-88f0-4a515a06d535", space_id: SPACE_ID, name: "Occupancy",              description: "Number of people present within the observed area at a given instant", category: "utilization" as const, unit: "count",      calculation_method: null, literature_reference: "Fruin, J.J. (1971). Pedestrian Planning and Design. Metropolitan Association of Urban Designers and Environmental Planners.", is_active: true, ...{ created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } },
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
export const CAMERA = {
  id: CAMERA_ID,
  zone_id: KITCHEN_ID,
  name: "Loft Camera Fluent (Motion)",
  stream_url: null,
  status: "active" as const,
  field_of_view: {},
  metadata: { ha_entity_id: "camera.loft_camera_fluent" },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

// ── BE_studies ───────────────────────────────────────────────────────────────
// metadata.monitored_zone_id tells the heatmap which zone to highlight
const BE_STUDY_BASE = {
  id: SEED_BE_STUDY_ID,
  study_id: STUDY_ID,
  building_id: SPACE_ID,
  user_id: null,
  session_id: null,
  study_goal: "There is not much entry and exit in the loft. I expect a few people to be working together in the space. I want to track the number of occupants in the space over time. Camera will be facing one work station in the loft work area",
  study_plan: {},
  task_graph: {},
  graph_plan: {},
  metadata: {
    monitored_zone_id: KITCHEN_ID,
  },
  live_preview_status: null,
  started_at: "2026-05-05T22:12:13.530645+00:00",
  duration_seconds: 300,
  created_at: "2026-05-06T05:49:34.949181+00:00",
  updated_at: "2026-05-06T05:49:34.949181+00:00",
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

// ── BE_insight_outputs ────────────────────────────────────────────────────────
// Real data from study_1778019133385 (Supabase id: 9ecd5e0f-83bc-4e73-8f4e-55d55dbc6be3).
export const BE_INSIGHT_OUTPUT = {
  id: SEED_INSIGHT_ID,
  study_id: STUDY_ID,
  output_mode: "final_insights" as const,
  status: "complete",
  created_at: "2026-05-05T22:17:29.098Z",
  dashboard_summary:
    "The study focused on monitoring utilization rates and foot traffic in a workspace environment. " +
    "The data indicates consistent utilization with occasional foot traffic, suggesting the space is " +
    "actively used for work or study purposes.",
  charts: [
    {
      chart_id: "chart_1",
      chart_type: "line",
      title: "Utilization Rate Over Time",
      data: {
        labels: ["22:12:13","22:12:36","22:12:54","22:13:08","22:13:22","22:13:37","22:13:49","22:14:03","22:14:18","22:14:35","22:14:48","22:15:03","22:16:03","22:16:19","22:16:35","22:16:49","22:17:03"],
        values: [0.95,0.9,0.9,0.95,0.9,0.9,0.9,0.9,0.9,0.9,0.95,0.9,0.85,0.9,0.9,null,0.9],
      },
    },
    {
      chart_id: "chart_2",
      chart_type: "line",
      title: "Foot Traffic Count Over Time",
      data: {
        labels: ["22:12:13","22:12:36","22:12:54","22:13:08","22:13:22","22:13:37","22:13:49","22:14:03","22:14:18","22:14:35","22:14:48","22:15:03","22:16:03","22:16:19","22:16:35","22:16:49","22:17:03"],
        values: [0.1,0.8,0.8,0.7,0.1,0.8,0.6,0.1,0.1,0,0.3,0.9,0.75,0.9,0.85,null,0.7],
      },
    },
  ],
  tables: [
    {
      table_id: "table_1",
      title: "Detection Log Summary",
      columns: ["Timestamp", "Utilization Rate", "Foot Traffic Count", "Notes"],
      rows: [
        ["22:12:13","0.95","0.1","Two occupants seated using laptops."],
        ["22:12:36","0.9","0.8","Two individuals seated, active utilization."],
        ["22:12:54","0.9","0.8","Two people seated using a laptop and conversing."],
        ["22:13:08","0.95","0.7","Two occupants engaged with a laptop."],
        ["22:13:22","0.9","0.1","Two occupants working on a laptop."],
        ["22:13:37","0.9","0.8","Two people interacting around a laptop."],
        ["22:13:49","0.9","0.6","Two people engaged in work-related activity."],
        ["22:14:03","0.9","0.1","Two individuals actively engaged with a laptop."],
        ["22:14:18","0.9","0.1","Two occupants engaged with a laptop."],
        ["22:14:35","0.9","0","Two individuals in workspace, conversing."],
        ["22:14:48","0.95","0.3","Two occupants seated in a study or meeting room."],
        ["22:15:03","0.9","0.9","Room appears empty, no occupants."],
        ["22:16:03","0.85","0.75","One person standing near the table."],
        ["22:16:19","0.9","0.9","One person present, engaged at the table."],
        ["22:16:35","0.9","0.85","Two occupants with laptops, one arriving."],
        ["22:16:49",null,null,"parse_failed"],
        ["22:17:03","0.9","0.7","Two occupants seated, actively using laptops."],
      ],
    },
  ],
  insights:
    "The workspace is consistently utilized with a high utilization rate, often above 0.9. " +
    "Foot traffic is less frequent but noticeable at certain times, indicating periods of higher activity.",
  recommendations:
    "Consider optimizing the workspace layout to accommodate peak utilization and foot traffic times. " +
    "Implement scheduling or booking systems to manage space usage effectively during high-demand periods.",
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
