# BeHappier — v1

Multi-agent camera behavior analysis system.
n8n backend + frontend, managed through a synced local repo.

---

## Repo Structure

```
/
├── frontend/             # Frontend application
├── n8n/
│   ├── workflows/        # n8n workflow JSON files — source of truth
│   └── docs/
│       └── IMPLEMENTATION_GUIDE.md
├── scripts/              # Sync scripts — see scripts/README.md
├── .env.example          # Template for local environment variables
├── CLAUDE.md             # Instructions for Claude Code sessions
└── README.md             # This file
```

---

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-org/v1_behappier
cd v1_behappier
```

### 2. Set up your environment
```bash
cp .env.example .env
# Open .env and fill in N8N_URL and N8N_API_KEY
```

### 3. Make scripts executable
```bash
chmod +x scripts/session-start.sh
chmod +x scripts/session-end.sh
```

### 4. Start a Claude Code session
Open Claude Code in this repo. It will automatically read `CLAUDE.md`
and run `session-start.sh` before doing anything else.

---

## n8n Workflows

The 8 workflows that make up the backend are stored in `/n8n/workflows/`
as JSON files. Full import instructions and node-by-node documentation
are in `/n8n/docs/IMPLEMENTATION_GUIDE.md`.

See `scripts/README.md` for how syncing between n8n and GitHub works.

---

## Environment Variables

| Variable | Description |
|---|---|
| `N8N_URL` | Your n8n instance URL |
| `N8N_API_KEY` | Your n8n API key (Settings → API in n8n) |

Never commit `.env` to GitHub.
