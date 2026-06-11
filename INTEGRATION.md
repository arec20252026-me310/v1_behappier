# Integration Guide — Frontend ↔ n8n Backend

## Overview

The frontend connects to a self-hosted n8n multi-agent backend via a single webhook.
The backend owns the AI pipeline; the frontend owns space/zone layout and displays results.

---

## n8n Webhook Entry Point

| | Value |
|---|---|
| **Workflow** | `00 - Camera Behavior - Main Dashboard Entry` |
| **n8n instance** | Self-hosted at `100.74.234.95` (Tailscale — must be on ME310 network) |
| **Production URL** | `POST {N8N_URL}/webhook/occupant-behavior-main` |
| **Test URL** | `POST {N8N_URL}/webhook-test/occupant-behavior-main` |
| **Auth** | None required on the webhook |

The frontend never calls n8n directly. It calls the Next.js proxy at `/api/n8n`,
which forwards to the webhook and handles errors gracefully when n8n is offline.

### Webhook Request Payload
```json
{
  "user_id": "behappier-user",
  "session_id": "<uuid generated per browser session>",
  "message_text": "<formatted study description — see below>",
  "building_id": "<space.id from Supabase>",
  "study_id": "<BE_studies.study_id if continuing a study, else null>"
}
```

### `message_text` Format (Studies Page)
```
I want to start a study with the following details:

Study Name: {name}
Description: {description}
Hypothesis: {hypothesis}
Planned Duration: {duration}
Metrics to Track: {metric1}, {metric2}, ...
Camera Configuration:
  - {zone name}: {camera friendly name} ({ha_entity_id})
  ...

Please design a complete study plan and start the full analysis pipeline.
```

The `Camera Configuration` block is omitted when no cameras are assigned to any zone.

### Webhook Response
```json
{
  "assistant_response_text": "...",
  "action_type": "start_study | clarify_request | check_study_status | get_results | answer_question",
  "study_id": "<string or null>",
  "study_readiness_status": "ready | needs_followup | preset_recommended | null"
}
```

---

## EXPE Showcase Mode

The EXPE space (`lib/demo-seeds.ts → EXPE_SPACE_ID`) has a **Showcase Mode** that bypasses live Supabase reads and drives the UI from pre-seeded demo data.

### Activation
Toggle in the sidebar nav. State stored in `localStorage` under `behappier_showcase_mode`.

### Demo states
| State | What's shown |
|---|---|
| `study-in-progress` | Two running studies (Quiet Zone + Interaction Zone), live occupancy charts with detection feed |
| `study-complete` | Both studies completed, charts with full time series, zone glows |
| `model-ready` | LSTM model prediction overlay |

### Launch Studies button
Appears when showcase mode is on and no study is currently running. Clicking it:
1. Shows "Launching…" state immediately
2. Plays a **3-2-1 audio countdown** (3 short 880 Hz ticks + 1 longer 1046 Hz "go" tone via Web Audio API)
3. Calls `launchExpeStudies()` server action — creates two `BE_studies` rows and POSTs to the n8n webhook at `/webhook/start-study`
4. Studies run for **2 minutes** (`duration_seconds: 60 × 2`)

### Zone detail dialog
Clicking a zone in the heatmap while a demo study is running opens a full-screen dialog showing:
- Zone image (from `/public/expe/`)
- Live/demo occupancy count and collaboration index
- Latest detection text

The dialog reads from `demoDetectionsPerStudy[study_id][7]` (index 7 = the 8th detection row, matching the chart's latest point).

---

## Data Flow

```
User fills study form
  → POST /api/n8n (Next.js proxy)
    → POST {N8N_URL}/webhook/occupant-behavior-main
      → 01 Chat Entry (classifies intent, checks readiness)
        → 02 Setup Agent (builds study plan)
          → 03 Study Orchestrator
            → 04 Needfinding Agent (literature-backed behavior targets)
            → 05 Behavior Monitoring Agent (analyzes camera snapshots)
            → 07 Common Services (writes BE_live_preview_metrics)
            → 06 Actionable Insights Agent (writes BE_insight_outputs)

Frontend reads results directly from Supabase:
  - BE_studies              → Studies page, Active Studies widget, Running Studies count
  - BE_behavior_detections  → Occupancy Chart live feed, Zone Detail dialog
  - BE_insight_outputs      → Insights page, Recent Insights widget, completed charts
  - BE_live_preview_metrics → Occupancy Heatmap (live zone coloring)
```

---

## Camera Configuration (Space Builder)

HA cameras are linked to zones through a two-table chain:

```
ha_camera_mappings          cameras (frontend)
─────────────────           ─────────────────
id                          id
ha_entity_id   ──────────── metadata.ha_entity_id
ha_friendly_name            name  (= ha_friendly_name)
camera_id ──────────────→   id
is_active                   zone_id ──────────→ zones.id
```

Camera placements (x/y position and facing direction) are stored in `localStorage` under `camera-placements-{space.id}`.

---

## Database Tables

### Frontend tables (owned by frontend)
| Table | Purpose |
|---|---|
| `spaces` | Space configuration and floor plan URL |
| `zones` | Zone layout, grid position, color |
| `metrics` | Available metrics library (name, description, rubric, literature_reference) |
| `cameras` | Camera records — one per zone |
| `ha_camera_mappings` | Maps HA entity IDs to frontend camera records |

### Backend tables (owned by n8n, read-only from frontend)
| Table | Purpose |
|---|---|
| `BE_studies` | One row per study; tracks pipeline stage and status |
| `BE_study_tasks` | Task graph nodes for a study |
| `BE_needfinding_outputs` | Literature-backed behavior targets from agent 04 |
| `BE_behavior_detections` | Per-image detection records from agent 05 |
| `BE_live_preview_metrics` | Rolling preview metrics during monitoring |
| `BE_insight_outputs` | Final/milestone charts, insights, recommendations |
| `BE_workflow_logs` | Observability log per workflow step |
| `BE_workflow_errors` | Error records per workflow step |

All `BE_*` tables have RLS enabled with an `anon SELECT` policy.

### Study pipeline stages
| Stage | Meaning |
|---|---|
| `draft` | Created, not yet sent to n8n |
| `planned` | Setup Agent completed; study plan stored |
| `needfinding_running` | Agent 04 searching literature |
| `needfinding_complete` | Behavior targets identified |
| `monitoring_running` | Agent 05 analyzing camera snapshots |
| `monitoring_paused` | Monitoring intentionally paused |
| `milestone_review` | Interim insight generation in progress |
| `monitoring_complete` | Data collection finished |
| `insights_running` | Agent 06 generating final insights |
| `complete` | All outputs stored; study done |
| `failed` | Unrecoverable error |

---

## Page-by-Page Integration

### `/dashboard` (main dashboard)
- **Running Studies count** → `BE_studies` filtered to active stages
- **New Insights count** → total insight strings across recent `BE_insight_outputs`
- **Active Studies widget** → `BE_studies` (active stages, latest 5)
- **Recent Insights widget** → insight strings from latest `BE_insight_outputs`
- **Occupancy Heatmap** → `BE_behavior_detections` for running studies; falls back to completed-study zone glow when `BE_studies.status = complete`
- **Occupancy Chart** → `BE_behavior_detections` (live) or `BE_insight_outputs` charts (completed). Automatically switches to dual Y-axis when exactly 2 series are present.

### `/dashboard/studies`
- **Study list** → `BE_studies` (all, newest first)
- **New study form** → packages fields + camera config → `/api/n8n` → n8n webhook

### `/dashboard/insights`
- **Insights list** → `BE_insight_outputs` (newest first)
- Shows: output mode (Final / Milestone), dashboard summary, key findings, recommendations, time series charts

### `/dashboard/space`
- Reads/writes frontend `spaces`, `zones`, `cameras`, `ha_camera_mappings` tables

### `/dashboard/metrics`
- Reads/writes frontend `metrics` table only
- Rubric edits here are used by n8n when launching EXPE studies (fetched in `expe-launch.ts`)

### `/dashboard/demo`
- Seeds Peterson Loft demo data via `/api/demo/seed`
- Four scenarios: blank, space-ready, study-in-progress, study-complete

---

## Activating n8n Workflows

n8n is self-hosted at `100.74.234.95` on the ME310 Tailscale network.

To re-import workflows:
1. Import JSON files from `/n8n/` in this order:
   ```
   07-common-services.json
   04-needfinding-agent.json
   05-behavior-monitoring-agent.json
   06-actionable-insights-agent.json
   03-study-orchestrator.json
   02-setup-agent.json
   01-chat-entry.json
   00-main-dashboard-entry.json
   ```
2. Set n8n environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TAVILY_API_KEY`
3. Activate all workflows

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for demo seeding and file serving |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — floor plan storage |
| `N8N_URL` | `http://100.74.234.95:5678` |
