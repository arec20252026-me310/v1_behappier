# Scripts

These scripts keep your local repo, n8n instance, and GitHub in sync.
Run them at the start and end of every Claude Code session.

---

## Setup (do this once after cloning)

1. Copy the env template to a local `.env` file in the repo root:
```bash
cp .env.example .env
```

2. Open `.env` and fill in your values:
```
N8N_URL=https://your-n8n-instance-url
N8N_API_KEY=your-n8n-api-key
```
To get your API key: open your n8n instance → Settings → API → Create API Key

3. Make the scripts executable (only needed once):
```bash
chmod +x scripts/session-start.sh
chmod +x scripts/session-end.sh
```

---

## session-start.sh

Run at the start of every Claude Code session:
```bash
bash scripts/session-start.sh
```

What it does:
1. Pulls the latest code and workflow JSONs from GitHub
2. Pulls the latest workflow JSONs from your n8n instance
3. Commits and pushes any UI edits made in n8n since the last session

Always wait for this to complete before making any changes.

---

## session-end.sh

Run at the end of every Claude Code session:
```bash
bash scripts/session-end.sh
```

What it does:
1. Pushes all updated workflow JSONs from local to your n8n instance
2. Commits and pushes all file changes to GitHub

Do not close a session without running this. If any workflow fails
to push to n8n, fix the error before closing.

---

## Sync Flow

```
Session Start                        Session End

GitHub ──pull──► local               local ──push──► n8n
n8n    ──pull──► local               local ──push──► GitHub
local  ──push──► GitHub (if changed)
```

GitHub is always the source of truth.
n8n is the deployment target.
