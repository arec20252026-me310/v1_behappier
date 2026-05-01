# Integration Guide — BeHappier Frontend ↔ n8n Backend

## Overview

The frontend connects to an n8n multi-agent backend via a single webhook.
The backend owns the AI pipeline; the frontend owns space/zone layout and displays results.

---

## n8n Webhook Entry Point

| | Value |
|---|---|
| **Workflow** | `00 - Camera Behavior - Main Dashboard Entry` |
| **n8n instance** | `https://arec.app.n8n.cloud` (cloud, inactive — workflows must be active to respond) |
| **Production URL** | `POST {N8N_URL}/webhook/occupant-behavior-main` |
| **Test URL** | `POST {N8N_URL}/webhook-test/occupant-behavior-main` |
| **Auth** | None required on the webhook |
| **Local dev URL** | `http://localhost:5678` (set in `.env.local`) |

The frontend never calls n8n directly. It calls the Next.js proxy at `/api/n8n`,
which forwards to the webhook and handles errors gracefully when n8n is offline.

### Webhook Request Payload
```json
{
  "user_id": "behappier-user",
  "session_id": "<uuid generated per page session>",
  "message_text": "<formatted study description — see below>",
  "building_id": "<space.id from Supabase>",
  "study_id": "<BE_studies.study_id if continuing a study, else null>"
}
```

### `message_text` Format (Studies Page)
The study form fields are packaged into a structured natural language string so
the Chat Entry agent immediately classifies it as `ready` and forwards to Setup Agent.
Camera assignments are included so the behavior monitoring agent knows which cameras
cover which zones.

```
I want to start a study with the following details:

Study Name: {name}
Description: {description}
Hypothesis: {hypothesis}
Planned Duration: {duration}
Metrics to Track: {metric1}, {metric2}, ...
Camera Configuration:
  - {zone name}: {camera friendly name} ({ha_entity_id})
  - {zone name}: {camera friendly name} ({ha_entity_id})

Please design a complete study plan and start the full analysis pipeline.
Use my hypothesis and chosen metrics to guide what the behavior monitoring agent looks for
and what the actionable insights agent should prioritize in its outputs.
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

## Data Flow

```
User fills study form
  → POST /api/n8n (Next.js proxy)
    → POST {N8N_URL}/webhook/occupant-behavior-main
      → 01 Chat Entry (classifies intent, checks readiness)
        → 02 Setup Agent (builds study plan from form fields + camera config)
          → 03 Study Orchestrator
            → 04 Needfinding Agent (literature-backed behavior targets)
            → 05 Behavior Monitoring Agent (analyzes camera snapshots)
            → 07 Common Services (writes BE_live_preview_metrics)
            → 06 Actionable Insights Agent (writes BE_insight_outputs)

Frontend reads results directly from Supabase BE_* tables:
  - BE_studies          → Studies page list, Active Studies widget, Running Studies count
  - BE_insight_outputs  → Insights page, Recent Insights widget, New Insights count
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

### Assignment flow (ZonePanel → SpaceEditor → Supabase)

1. User picks an HA camera from the dropdown in the Zone Properties panel.
2. `handleAssignCamera(zoneId, haCamera)` in `space-editor.tsx`:
   - Deletes the existing `cameras` row for that zone (clears `ha_camera_mappings.camera_id` FK first).
   - Inserts a new `cameras` row with `zone_id`, `name`, `metadata: { ha_entity_id }`.
   - Updates `ha_camera_mappings.camera_id` to point at the new cameras row.
   - Syncs a `CameraPlacement` visual pin in the grid (stored in localStorage).
3. The Zone Properties panel shows the assigned camera name + entity ID with a remove (×) button.

### Removal flow

`handleRemoveCamera(zoneId)` clears `ha_camera_mappings.camera_id`, deletes the `cameras` row,
and removes the visual pin.

### Visual pins (ZoneGrid)

`CameraPlacement` objects live in `localStorage` under `camera-placements-{space.id}`.
They are rendered client-side only (gated behind a `mounted` state) to avoid hydration mismatches.
Drag to reposition; right-click to cycle facing direction (up/right/down/left).

---

## Database Tables

### Frontend tables (owned by frontend)
| Table | Purpose |
|---|---|
| `spaces` | Space configuration and floor plan URL |
| `zones` | Zone layout, grid position, color |
| `metrics` | Available metrics library |
| `cameras` | Camera records — one per zone, linked to `ha_camera_mappings` |
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

All `BE_*` tables have RLS enabled with an `anon SELECT` policy so the frontend can read them.

### `BE_studies` key fields
| Field | Type | Notes |
|---|---|---|
| `study_id` | text (unique) | The logical study identifier used across all BE tables |
| `study_goal` | text | The full `message_text` sent to n8n |
| `current_stage` | text | Pipeline stage (see states below) |
| `status` | text | Overall status |
| `live_preview_status` | text | Preview label from Common Services |
| `start_date_time` | timestamptz | **Pending** — partner migration |
| `duration_minutes` | integer | **Pending** — partner migration |

### Study pipeline stages
| Stage | Meaning |
|---|---|
| `draft` | Intake started, not yet ready |
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
- **Occupancy Heatmap** → `BE_live_preview_metrics` for `monitoring_running` studies (live colored zones);
  falls back to completed-study zone glow (yellow) when `BE_studies.status = complete` and
  `BE_insight_outputs` exists; falls back to static green when no data

#### Heatmap zone-highlight logic
The heatmap highlights zones from completed studies via `BE_studies.metadata.monitored_zone_id`.
When a user clicks a glowing zone, a dialog shows the study's insight strings, recommendations,
and dashboard summary with a "View Full Report →" link to `/dashboard/insights`.
The `monitored_zone_id` field is set by the seed script; n8n should set it when it writes
`BE_studies` rows so real studies also highlight correctly.

### `/dashboard/studies`
- **Study list** → `BE_studies` (all, newest first)
- **New study form** → packages form fields + camera config into `message_text` → `/api/n8n` → n8n webhook
- Camera assignments from the `cameras` table are automatically included in the payload
- After submission, page auto-refreshes after 2s to show the new `BE_studies` row

### `/dashboard/insights`
- **Insights list** → `BE_insight_outputs` (newest first)
- Shows: output mode (Final / Milestone), dashboard summary, key findings, recommendations

### `/dashboard/space`
- Reads/writes frontend `spaces`, `zones`, `cameras`, and `ha_camera_mappings` tables
- Camera assignment UI in Zone Properties panel: select from active HA cameras, remove button
- Visual camera pins on the grid are draggable and direction-rotatable (right-click)

### `/dashboard/metrics`
- Unchanged — reads/writes frontend `metrics` table only

### `/dashboard/demo`
- Demo scenario switcher — loads preset Supabase states for demos and user interviews
- Four scenarios: **Blank**, **Space Configured**, **Study Running**, **Study Complete**
- Each button POSTs to `/api/demo/seed` which uses the service role key to wipe + reseed
- Terminal alternative: `npm run seed -- <scenario>` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`)
- Accessible via the **Demo** link at the bottom of the sidebar nav

---

## Demo Scenarios

| Scenario | What's seeded | What you'll see |
|---|---|---|
| `blank` | Nothing — all data wiped | Empty space setup prompts |
| `space-ready` | ME310 Loft zones + Kitchen camera | Floor plan, zones, camera pin |
| `study-in-progress` | + `BE_studies` at `monitoring_running` + `BE_live_preview_metrics` | Live heatmap colors, active study badge |
| `study-complete` | + `BE_studies` at `complete` + `BE_insight_outputs` | Yellow pulsing Kitchen zone, click for insights |

Seed data lives in `lib/demo-seeds.ts`. All seed rows use fixed synthetic UUIDs
(`00000000-seed-...`) so they can be cleanly removed without touching real data.
The Kitchen zone is linked via `BE_studies.metadata.monitored_zone_id`.

---

## Environment Variables

| Variable | Local dev value | Production |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | set | set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | set | set |
| `N8N_URL` | `http://localhost:5678` | self-hosted URL when ready |
| `N8N_API_KEY` | unused (webhook has no auth) | unused |
| `BLOB_READ_WRITE_TOKEN` | set | set |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase dashboard → Settings → API | required for `/api/demo/seed` and `npm run seed` |

---

## Activating n8n Workflows

All 8 workflows are currently **inactive** on n8n.cloud (no paid plan).
To run locally:

1. Install n8n: `npm install -g n8n` or use Docker
2. Import workflows in this order (from `n8n/` folder):
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
3. Set n8n environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `OPENAI_API_KEY`, `TAVILY_API_KEY`
4. Activate all workflows (toggle in n8n UI)
5. `.env.local` already points to `http://localhost:5678`

---

## Pending Items

- [ ] Partner migration: `start_date_time` and `duration_minutes` columns on `BE_studies`
      → frontend already handles these as optional nullable fields
- [ ] Activate n8n workflows locally (self-hosted setup)
- [ ] Verify `BE_live_preview_metrics.metrics` JSON shape once Common Services runs,
      then refine zone color mapping in `space-heatmap.tsx` if needed
- [ ] Consider Supabase Realtime subscription on `BE_studies` for live stage updates
      without manual page refresh
