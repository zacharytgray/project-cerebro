# Project Cerebro

**Autonomous AI Brain Control Center** — A multi-agent task orchestration system built on OpenClaw.

---

## Overview

Cerebro manages multiple specialized AI "brains" (agents), each responsible for a domain (personal life, schoolwork, job search, etc.). Tasks are assigned to brains, which execute them autonomously using OpenClaw. A web dashboard provides visibility and control.

**Key Features:**
- Multi-brain orchestration with specialized agents
- Recurring tasks & scheduled automation
- Discord integration for notifications
- Drag-and-drop job application tracking (Kanban board)
- Responsive web UI with dark mode
- Reports & daily digest
- Safe: personal config lives in local env/config files (not committed)

---

## Quick Start

See **[SETUP.md](./SETUP.md)** for detailed installation and configuration.

**TL;DR:**
```bash
git clone https://github.com/YOUR_USERNAME/project-cerebro.git
cd project-cerebro
npm install
cp .env.example .env
# Edit .env with your OpenClaw token, Discord token, etc.
cp config/brains.template.json config/brains.json
cp config/discord_ids.template.json config/discord_ids.json
# Edit config/*.json with your Discord guild/channel IDs
npm run build
npm start
# Dashboard: http://localhost:3030
```

---

## Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for detailed design.

**High-level:**
- **Backend:** TypeScript + Fastify + SQLite
- **Frontend:** React + Vite + Tailwind
- **Integration:** OpenClaw Gateway (WebSocket/HTTP API)
- **Channels:** Discord (notifications + brain routing)

---

## Brains

Each brain is a specialized OpenClaw agent with its own workspace, tools, and Discord channel. Examples:

- **Nexus:** Main orchestrator / command routing
- **Personal Life Brain:** Calendar, routines, health
- **Schoolwork Brain:** Study planning, deadlines
- **Research Brain:** Deep research, citations
- **Money Making Brain:** Revenue ideas, outreach
- **Job Application Brain:** Job search + auto-apply
- **Daily Digest:** Aggregates reports from all brains

Configure in `config/brains.json` (copy from template).

---

## Security & Privacy

- **No secrets in repo:** All tokens, personal IDs, and config are `.gitignore`d.
- **Templates provided:** `.env.example`, `config/*.template.json`.
- **Local-only by default:** Dashboard binds to `127.0.0.1`.
- **OpenClaw hardening:** Run `openclaw security audit --deep` on the host.

---

## Development

```bash
npm run dev        # Backend dev server (hot reload)
cd frontend && npm run dev  # Frontend dev server
npm run build      # Build both backend + frontend
npm test           # (not yet implemented)
```

---

## Deployment

### Systemd Service (Linux)

```bash
sudo cp project-cerebro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable project-cerebro
sudo systemctl start project-cerebro
```

### Docker (future)

Not yet packaged. PRs welcome.

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make changes (no personal info!)
4. Submit a PR

---

## License

MIT (or your preferred license)

---

## Credits

Built with [OpenClaw](https://openclaw.ai) — the AI assistant framework.
