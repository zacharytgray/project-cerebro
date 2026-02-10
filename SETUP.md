# Cerebro Setup Guide

This guide walks you through setting up **Project Cerebro** — an autonomous AI brain control center.

## Prerequisites

1. **OpenClaw** installed and running (`openclaw status`)
2. **Node.js** v18+ (`node --version`)
3. **Discord bot token** (if using Discord integration)
4. Optional: **Google Calendar access** via `gog` CLI (for calendar-based planning)

## Installation

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/project-cerebro.git
cd project-cerebro
npm install
cd frontend && npm install && npm run build && cd ..
```

### 2. Configure Environment

Copy the example `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set:

**Required:**
```bash
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_TOKEN=YOUR_GATEWAY_TOKEN  # Get from: openclaw devices list
# Messaging is handled by OpenClaw. Ensure your desired channel plugin is configured in OpenClaw.
```

**Optional (for calendar integration):**
```bash
GOG_ACCOUNT=you@example.com
CEREBRO_CALENDAR_IDS=primary,OTHER_CALENDAR_ID
CEREBRO_CALENDAR_NAMES=Primary,Classes
```

### 3. Configure Brains & Channels

Copy template config files:

```bash
cp config/brains.template.json config/brains.json
cp config/discord_ids.template.json config/discord_ids.json
```

Edit `config/discord_ids.json` and replace placeholders with your Discord guild/channel IDs:

```json
{
  "server": "YOUR_DISCORD_GUILD_ID",
  "channels": {
    "general": "1234567890",
    "daily_digest": "1234567891",
    ...
  }
}
```

You can customize brain definitions in `config/brains.json` (name, description, openClawAgentId), but the defaults work out of the box.

### 4. Build & Run

```bash
npm run build
npm start
```

Or run as a systemd service (see `project-cerebro.service`).

## Dashboard

Navigate to: `http://localhost:3030`

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3030` | Dashboard HTTP port |
| `DB_PATH` | No | `./cerebro.db` | SQLite database path |
| `OPENCLAW_GATEWAY_URL` | **Yes** | — | OpenClaw Gateway WebSocket URL |
| `OPENCLAW_TOKEN` | **Yes** | — | OpenClaw Gateway auth token |
| (messaging) | — | — | Configure your messaging channels in OpenClaw |
| `TZ` | No | `America/Chicago` | Timezone for scheduling |
| `GOG_ACCOUNT` | No | — | Google account for calendar access (via `gog` CLI) |
| `CEREBRO_CALENDAR_IDS` | No | `primary` | Comma-separated calendar IDs |
| `CEREBRO_CALENDAR_NAMES` | No | — | Optional: calendar display names (matches IDs order) |
| `CEREBRO_MANAGE_SYSTEM_RECURRING` | No | `false` | Enable backend auto-creation of report/planning tasks |

## Security Notes

- **Never commit** `.env`, `config/brains.json`, or `config/discord_ids.json` with real values.
- Keep `cerebro.db` local (gitignored by default).
- Restrict Control UI access (bind to `127.0.0.1` or use auth).
- For Discord: use per-guild/channel allowlists (see OpenClaw docs).

## Troubleshooting

- **"Required environment variable X is not set"**: Check `.env`.
- **"Brains config file not found"**: Run `cp config/brains.template.json config/brains.json`.
- **Calendar scripts fail**: Ensure `GOG_ACCOUNT` is set and `gog` CLI is configured.

## License

[Include your license here]
