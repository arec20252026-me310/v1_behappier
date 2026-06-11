# Looking Glass — v1

AI-powered camera behavior analysis dashboard.
Next.js frontend + n8n multi-agent backend, connected via Supabase.

---

## Repo Structure

```
/
├── app/                  # Next.js app router pages and API routes
│   ├── actions/          # Server actions (expe-launch, expe-stop, etc.)
│   ├── api/              # API routes (demo seed, file serving, n8n proxy)
│   └── dashboard/        # Dashboard pages (main, studies, insights, space, metrics)
├── components/           # React components
│   ├── dashboard/        # Core dashboard widgets (heatmap, occupancy chart, sidebar)
│   ├── insights/         # Time series chart
│   ├── space/            # Space builder and camera map
│   └── studies/          # Study forms and live detection feed
├── lib/                  # Shared utilities, types, Supabase client, demo seeds
├── n8n/                  # n8n workflow JSON files + implementation guides
├── public/               # Static assets (floor plans, zone images)
├── scripts/              # Utility scripts
├── .env.example          # Template for local environment variables
├── CLAUDE.md             # Instructions for Claude Code sessions
├── INTEGRATION.md        # Frontend ↔ n8n integration reference
└── README.md             # This file
```

---

## Getting Started

### 1. Clone the repo

Clone to a non-iCloud-synced location. The Desktop is iCloud-synced on Mac,
which corrupts git's internal files. Use `~/Developer/` instead.

```bash
mkdir -p ~/Developer
git clone https://github.com/arec20252026-me310/v1_behappier.git ~/Developer/v1_behappier
cd ~/Developer/v1_behappier
```

### 2. Set up your environment

```bash
cp .env.example .env.local
# Fill in values — see Environment Variables section below
```

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The first page load compiles on-demand and may take 10–30 seconds; subsequent navigations are instant.

---

## Demo Spaces

The dashboard supports three pre-configured demo spaces, selectable from the sidebar space switcher:

| Space | Description |
|---|---|
| **EXPE** | Stanford ME310 experiment room — two zones (Quiet Zone, Interaction Zone), two cameras. Primary demo space. |
| **Peterson Loft** | ME310 student lounge. |
| **Looking Glass HQ** | Looking Glass headquarters office — Conference Room, Hot Desks, Kitchen, Meditation Room. |

### EXPE Showcase Mode

The EXPE space has a **Showcase Mode** toggle in the sidebar. When enabled:

- Replaces the live data view with pre-seeded demo detections and charts
- Shows three demo states via the scenario selector: **Study Running**, **Study Complete**, and **Model Ready**
- Clicking the **Quiet Zone** or **Interaction Zone** in any active-study demo state opens a full-screen zone detail view showing occupancy count, collaboration index, and latest detection text
- A **Launch Studies** button appears that triggers two real studies (one per zone) with a **3-2-1 audio countdown** before launch
- Live studies run for **2 minutes** each

### Demo scenarios (Peterson Loft / LGQ)

The `/dashboard/demo` page seeds Peterson Loft demo data:

| Scenario | What's seeded |
|---|---|
| `blank` | All data wiped |
| `space-ready` | Space, zones, cameras |
| `study-in-progress` | + running study + live preview metrics |
| `study-complete` | + completed study + insight outputs |

Seed data lives in `lib/demo-seeds.ts`. All seed rows use fixed synthetic UUIDs so they can be cleanly removed without touching real data.

---

## Charts

The **Occupancy Chart** in the dashboard shows time-series data for active and completed studies.

- When a study tracks exactly **2 behavior metrics** (e.g. Occupancy + Collaboration Index), the chart automatically shows a **dual Y-axis layout**: Occupancy on the left (integer ticks, `[0, auto]` domain) and Collaboration Index on the right (decimal ticks, `[0, 1]` domain fixed).
- Axis labels are horizontal, bold, word-wrapped, and color-coded to their series.
- The Occupancy line always renders on top of the Collaboration Index line.

---

## n8n Backend

The 8 n8n workflows that power the AI pipeline are stored in `/n8n/` as JSON files.

**n8n instance:** self-hosted at `100.74.234.95` (Tailscale). Accessible only on the ME310 Tailscale network.

See `n8n/IMPLEMENTATION_GUIDE.md` for workflow-by-workflow documentation and `INTEGRATION.md` for how the frontend connects to it.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server-side only; required for demo seeding |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for floor plan storage |
| `N8N_URL` | n8n webhook base URL (e.g. `http://100.74.234.95:5678`) |

Never commit `.env.local` to GitHub.

---

## Collaboration Index

The Collaboration Index uses a **Tier 0/1/2 weighted formula**:

```
Score = (T2 × 1.0 + T1 × 0.5) / N, rounded to 2 decimals
N = visible persons

Tier 0 (withdrawn): headphones in use, back fully turned, alone at separate furniture
Tier 1 (co-present, not interacting): at shared furniture with others, no interaction signals
Tier 2 (engaged): visibly speaking, mutual orientation, shared screen/whiteboard, or gesturing
```

Score range: 0.00–1.00. Updated in the `metrics` Supabase table.
