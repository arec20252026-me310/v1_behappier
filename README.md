# Looking Glass — v1

**Looking Glass** is an AI-powered occupant behavior analysis platform built for the Stanford ME310 program. It uses a network of cameras to continuously observe how people use physical spaces, runs that data through a multi-agent AI pipeline, and surfaces behavior insights directly in a web dashboard. The system is designed to answer questions like: How occupied is this space throughout the day? How collaboratively are people working? Where are the behavioral hotspots?

The platform has two main components:
- **Frontend**: A Next.js web dashboard where researchers configure spaces, launch micro-studies, and explore behavior insights.
- **Backend**: A self-hosted n8n multi-agent system (8 workflows) that processes camera snapshots, runs literature-backed analysis, and writes results to a shared Supabase database.

---

## Repo Structure

```
/
├── app/                    # Next.js app router pages and API routes
│   ├── actions/            # Server actions (launch/stop EXPE studies)
│   ├── api/                # API routes (n8n proxy, demo seeding, file serving)
│   └── dashboard/          # Dashboard pages
│       ├── page.tsx         #   Main dashboard (heatmap, charts, widgets)
│       ├── studies/         #   Micro-studies list and new study form
│       ├── insights/        #   Insight output viewer
│       ├── space/           #   Space builder and camera map
│       ├── behaviors/       #   Behavior metrics library
│       ├── models/          #   ML model viewer
│       ├── settings/        #   Space configuration
│       └── demo/            #   Demo data seeder
├── components/             # React components
│   ├── dashboard/           #   Core dashboard widgets (heatmap, chart, sidebar)
│   ├── insights/            #   Time-series chart
│   ├── metrics/             #   Behavior metrics library UI
│   ├── models/              #   ML model viewer
│   ├── settings/            #   Settings page components
│   ├── space/               #   Space builder and camera map editor
│   ├── studies/             #   Study forms and live detection feed
│   └── ui/                  #   Shared UI primitives (shadcn/ui)
├── lib/                    # Shared utilities, types, Supabase client, demo seeds
├── n8n/                    # n8n workflow JSON files and documentation
│   ├── *.json               #   One JSON per workflow (version control)
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── REVIEW_MODE_GUIDE.md
│   └── System Architecture Description.md
├── public/                 # Static assets (floor plans, zone images)
├── scripts/                # Utility scripts
├── .env.example            # Template for local environment variables
├── CLAUDE.md               # Instructions for Claude Code sessions
├── INTEGRATION.md          # Frontend ↔ n8n integration reference
└── README.md               # This file
```

---

## Getting Started

### 1. Clone the repo

Clone to a non-iCloud-synced location. The Desktop on Mac is iCloud-synced by default, which corrupts git's internal files over time. Use `~/Developer/` instead.

```bash
mkdir -p ~/Developer
git clone https://github.com/arec20252026-me310/v1_behappier.git ~/Developer/v1_behappier
cd ~/Developer/v1_behappier
```

### 2. Set up your environment

```bash
cp .env.example .env.local
# Fill in all values — see Environment Variables section below
```

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The first page load compiles on-demand and may take 10–30 seconds; subsequent navigations are fast.

---

## Dashboard Pages

### Main Dashboard (`/dashboard`)

The primary view for monitoring space activity in real time.

- **Running Studies count** — number of currently active studies
- **New Insights count** — unread insights since last visit
- **Occupancy Heatmap** — floor plan overlay showing zone activity levels, colored by live detection data. When a study is complete, zones glow based on final insight outputs.
- **Occupancy Chart** — time-series chart of behavior metrics for running or completed studies. When a study tracks exactly two metrics, the chart automatically switches to a dual Y-axis layout with separate scales and axis labels for each series.
- **Active Studies widget** — compact list of the five most recently active studies
- **Recent Insights widget** — latest insight strings from completed studies

### Space Builder (`/dashboard/space`)

Drag-and-drop interface for defining floor plan zones and assigning cameras to them. Zone layout, grid position, and color are saved to Supabase. Camera placements (position, facing direction) are saved to `localStorage`.

### Behaviors (`/dashboard/behaviors`)

Library of behavior metrics available for studies. Each metric has a name, description, unit, rubric, and literature reference. Rubric edits here are picked up live when launching EXPE studies.

### Micro-Studies (`/dashboard/studies`)

List of all past and active studies for the current space. The new study form packages study name, description, hypothesis, duration, metrics, and camera configuration into a structured message that is sent to the n8n pipeline via the `/api/n8n` proxy.

### Insights (`/dashboard/insights`)

Full viewer for study outputs. Each insight record shows: output mode (Final or Milestone), dashboard summary, key findings, recommendations, and any time-series charts generated by the Actionable Insights Agent.

### Models (`/dashboard/models`)

Viewer for ML model outputs associated with completed studies. Shows fitted model predictions and training loss curves alongside the raw detection data.

---

## Demo Spaces

The dashboard supports three pre-configured demo spaces, selectable from the sidebar space switcher:

| Space | Description |
|---|---|
| **EXPE** | Stanford ME310 experiment room (Room 126) — two zones (Quiet Zone, Interaction Zone), two cameras. Primary demo and development space. |
| **Peterson Loft** | ME310 student lounge. Used for seeded scenario demos. |
| **Looking Glass HQ** | Looking Glass headquarters office — Conference Room, Hot Desks, Kitchen, Meditation Room. |

---

## EXPE Showcase Mode

The EXPE space has a **Showcase Mode** toggle in the sidebar. Showcase Mode is designed for live demonstrations — it replaces live Supabase reads with pre-seeded demo data and enters fullscreen automatically.

### Activating Showcase Mode

Click the **Showcase Mode** button at the bottom of the sidebar. State is stored in `localStorage` under `behappier_showcase_mode`. The sidebar collapses and the browser enters fullscreen.

### Demo States

Showcase Mode has three selectable states, shown via a scenario selector on the dashboard:

| State | What's shown |
|---|---|
| **Study Running** | Two active studies (Quiet Zone + Interaction Zone). Live-style occupancy chart with detection feed. Zone heatmap colored by live preview metrics. |
| **Study Complete** | Both studies finished. Occupancy chart shows full time series for both zones. Zone glow reflects final insight outputs. |
| **Model Ready** | LSTM model prediction overlay on top of the completed occupancy data. Shows predicted vs. actual occupancy with training loss curve. |

### Launch Studies Button

When Showcase Mode is on and no study is currently running, a **Launch Studies** button appears in the sidebar. Clicking it:

1. Shows "Launching…" state immediately
2. Plays a **3-2-1 audio countdown** (three short 880 Hz ticks, then one longer 1046 Hz go tone via the Web Audio API)
3. Creates two `BE_studies` rows in Supabase and POSTs to the n8n webhook at `/webhook/start-study`
4. Studies run for **2 minutes** each (`duration_seconds: 120`)

A **Stop Studies** button appears while studies are running.

### Zone Detail Dialog

Clicking a zone in the heatmap while a demo study is running opens a full-screen dialog showing:
- Zone image (from `/public/expe/`)
- Live/demo occupancy count and behavior scores
- Latest detection text from the pre-seeded detection feed

---

## Peterson Loft / LGQ Demo Scenarios

The `/dashboard/demo` page seeds scenario data for the Peterson Loft space:

| Scenario | What's seeded |
|---|---|
| `blank` | All data wiped |
| `space-ready` | Space, zones, cameras |
| `study-in-progress` | + running study + live preview metrics |
| `study-complete` | + completed study + insight outputs |

All seed rows use fixed synthetic UUIDs so they can be cleanly removed without touching real data. Seed data lives in `lib/demo-seeds.ts`.

---

## n8n Backend — Multi-Agent Pipeline

The AI pipeline is implemented as 8 n8n workflows. The frontend never calls individual workflows directly — it calls the Next.js proxy at `/api/n8n`, which forwards to workflow `00` (the main entry point). Workflow `00` delegates all logic downstream.

### Workflow Overview

| # | Workflow | Role |
|---|---|---|
| 00 | Main Dashboard Entry | Thin public webhook entrypoint. Receives all requests from the frontend and delegates to Chat Entry. |
| 01 | Chat Entry | Classifies user intent (start study, check status, get results, answer question). Routes ready studies to Setup Agent or returns stored data. |
| 02 | Setup Agent | Converts the user's study goal into a structured study plan and task graph. Stores the plan and hands off execution to the Orchestrator. |
| 03 | Study Orchestrator | Owns the full study lifecycle. Manages state transitions and calls Needfinding, Monitoring, Common Services, and Insights agents in sequence. |
| 04 | Needfinding Agent | Literature-backed behavior targeting. Uses a search tool to find evidence-based behavioral indicators relevant to the study goal. Returns structured behavior targets. |
| 05 | Behavior Monitoring Agent | The only workflow that reads camera images. Fetches the latest snapshots from Home Assistant, analyzes each image with a vision model, and writes structured detections to `BE_behavior_detections`. |
| 06 | Actionable Insights Agent | Generates the final dashboard output: summaries, key findings, recommendations, and time-series chart data. Writes to `BE_insight_outputs`. |
| 07 | Common Services | Shared utilities: logging, error capture, and live preview metric aggregation. Called periodically by the Orchestrator to update `BE_live_preview_metrics` during active monitoring. |

### Pipeline Flow

```
Frontend (study form)
  → POST /api/n8n (Next.js proxy)
    → POST {N8N_URL}/webhook/occupant-behavior-main
      → 00 Main Entry
        → 01 Chat Entry (classifies intent, checks readiness)
          → 02 Setup Agent (builds study plan, stores study row)
            → 03 Study Orchestrator (manages lifecycle)
              → 04 Needfinding Agent (literature search → behavior targets)
              → 05 Behavior Monitoring Agent (camera snapshots → detections)
              → 07 Common Services (live preview metric aggregation)
              → 06 Actionable Insights Agent (final insights + charts)
```

### Study Pipeline Stages

| Stage | Meaning |
|---|---|
| `draft` | Created, not yet sent to n8n |
| `planned` | Setup Agent completed; study plan stored |
| `needfinding_running` | Needfinding Agent searching literature |
| `needfinding_complete` | Behavior targets identified |
| `monitoring_running` | Monitoring Agent analyzing snapshots |
| `monitoring_paused` | Monitoring intentionally paused |
| `milestone_review` | Interim insight generation in progress |
| `monitoring_complete` | Data collection finished |
| `insights_running` | Actionable Insights Agent generating final outputs |
| `complete` | All outputs stored; study done |
| `failed` | Unrecoverable error |

### Re-importing Workflows

Workflow JSON files are stored in `/n8n/`. Import them in this order to satisfy dependencies:

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

After importing, open each `Execute Workflow` node and wire it to the correct imported workflow. See `n8n/IMPLEMENTATION_GUIDE.md` for the complete wiring map.

---

## Database Tables

### Frontend tables (owned by frontend)

| Table | Purpose |
|---|---|
| `spaces` | Space configuration and floor plan URL |
| `zones` | Zone layout, grid position, color |
| `metrics` | Behavior metrics library (name, description, unit, rubric, literature reference) |
| `cameras` | Camera records — one per zone |
| `ha_camera_mappings` | Maps Home Assistant entity IDs to frontend camera records |

### Backend tables (owned by n8n, read-only from frontend)

| Table | Purpose |
|---|---|
| `BE_studies` | One row per study; tracks pipeline stage and status |
| `BE_study_tasks` | Task graph nodes for a study |
| `BE_needfinding_outputs` | Literature-backed behavior targets from Needfinding Agent |
| `BE_behavior_detections` | Per-image detection records from Monitoring Agent |
| `BE_live_preview_metrics` | Rolling preview metrics updated during active monitoring |
| `BE_insight_outputs` | Final and milestone charts, insights, and recommendations |
| `BE_workflow_logs` | Per-step observability log |
| `BE_workflow_errors` | Per-step error records |

All `BE_*` tables have RLS enabled with an `anon SELECT` policy so the frontend can read without elevated credentials.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server-side only; required for demo seeding and EXPE study launch |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for floor plan image storage |
| `N8N_URL` | n8n webhook base URL (e.g. `http://100.74.234.95:5678`) |

The n8n instance is self-hosted at `100.74.234.95` on the ME310 Tailscale network. Access requires being connected to the Tailscale VPN.

Never commit `.env.local` to GitHub.

---

## Review Mode

n8n workflows support a **Review Mode** flag that can be toggled to run the pipeline in a controlled review state without sending live data to production tables. See `n8n/REVIEW_MODE_GUIDE.md` for details.
