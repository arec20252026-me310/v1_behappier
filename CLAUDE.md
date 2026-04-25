# CLAUDE.md

This file is read automatically by Claude Code at the start of every session.
Follow all instructions here before doing anything else.

---

## ⚡ Session Protocol (MANDATORY)

### At the start of EVERY session, run this first:
```bash
bash scripts/session-start.sh
```
This will:
1. Pull the latest workflow JSONs from n8n into `n8n/workflows/`

Wait for it to complete before making any changes. Do not skip this step.

### At the end of EVERY session, run this last:
```bash
bash scripts/session-end.sh
```
This will:
1. Push all local workflow JSONs from `n8n/workflows/` back to n8n

Do not close the session without running this. If any push fails, fix the
error before closing. GitHub syncing is handled manually via GitHub Desktop.

---

## Repo Structure

```
/
├── frontend/             # Frontend application
├── n8n/
│   ├── workflows/        # n8n workflow JSON files — source of truth
│   └── docs/
│       └── IMPLEMENTATION_GUIDE.md
├── scripts/
│   ├── session-start.sh  # Run at session start
│   ├── session-end.sh    # Run at session end
│   └── README.md         # Setup instructions for new contributors
├── .env                  # Local secrets — never commit this
├── .env.example          # Template for .env
├── .gitignore
├── CLAUDE.md             # This file
└── README.md             # Project overview and onboarding
```

---

## Rules

- Always run `session-start.sh` before touching any files
- Always run `session-end.sh` before ending the session
- Never commit `.env` to GitHub
- Never hardcode API keys or URLs anywhere in the repo
- All n8n workflow changes must go through the local JSON files — not the n8n UI directly
- If any workflow push fails during `session-end.sh`, fix the error before closing
- GitHub syncing is done manually via GitHub Desktop — do not run git push in scripts

---

## Environment Variables (stored in `.env`, never committed)

```
N8N_URL=https://your-n8n-instance-url
N8N_API_KEY=your-n8n-api-key
```

---

## Project Context

This is the BeHappier project. The n8n backend is a multi-agent camera behavior
analysis system. The workflows are numbered 00–07 and must be imported and
modified in the order defined in `n8n/docs/IMPLEMENTATION_GUIDE.md`.
