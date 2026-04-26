# CLAUDE.md

This file is read automatically by Claude Code at the start of every session.

---

## Project Context

BeHappier is a camera behavior analysis platform. The n8n backend is a
multi-agent system (workflows 00–07) that processes occupant behavior data
from camera snapshots and surfaces insights through a web dashboard.

---

## Repo Structure

```
/
├── frontend/          # Frontend application
├── n8n/
│   ├── *.json         # Workflow JSON files for version control
│   └── docs/
│       └── IMPLEMENTATION_GUIDE.md
├── .gitignore
├── CLAUDE.md
└── README.md
```

---

## n8n Workflow Editing

Use the n8n MCP integration to make workflow changes directly. The MCP
is already authenticated — no credentials needed.

At the end of a session, tell the user which workflows were modified so
they know which JSON files to re-download from n8n and drop into
`n8n/` before committing via GitHub Desktop.

---

## Rules

- Never hardcode API keys or secrets anywhere in the repo
- Never commit `.env` files
- GitHub syncing is done manually via GitHub Desktop
