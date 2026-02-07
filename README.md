# Project Cerebro

## Goal
Project Cerebro is a comprehensive **agent runtime and execution control surface** for managing autonomous "Brains" (specialized AI agents). It provides a dynamic interface for overseeing an autonomous system that executes, recovers, and reports on its own work through a formal execution graph driven by heartbeats.

## Current Features

### 🧠 Brains
The system runs 7 Brains, each with its own scope, tools, and Discord channel:

| Brain | Channel | Description |
|-------|---------|-------------|
| **Nexus** | #general | Main system interface with highest scope and privileges |
| **Personal Life** | #personal-life | Personal routines, health, errands, relationships |
| **Schoolwork** | #schoolwork | Coursework, deadlines, study plans |
| **Research** | #research | Deep research, summaries, citations |
| **Money Making** | #money-making | Revenue ideas, business operations |
| **Job Application** | #job-application | Job search pipeline and tracking |
| **Daily Digest** | #daily-digest | Aggregates reports from all brains |

### 🎛️ Dashboard (Web UI)
The web interface provides real-time control over the system:

**Layout:**
```
┌─────────────────────────────────────┬─────────────────────┐
│ Nexus Brain (full width)            │ Recurring Tasks     │
│                                     │ (scrollable list)   │
├─────────────────────────────────────┤                     │
│ Specialized Brains (3x2 grid)       │                     │
│ ┌────────────┐ ┌────────────┐       │                     │
│ │ Personal   │ │ Schoolwork │       │                     │
│ ├────────────┼─┼────────────┤       │                     │
│ │ Research   │ │ Money      │       │                     │
│ ├────────────┼─┼────────────┤       │                     │
│ │ Job        │ │ Digest     │       │                     │
│ └────────────┘ └────────────┘       │                     │
└─────────────────────────────────────┴─────────────────────┘
│ Execution Stream                                          │
│ (tasks with play/trash buttons)                           │
└───────────────────────────────────────────────────────────┘
```

### 📋 Task System

**Task Statuses:**
- `READY` - Eligible for execution (default for new tasks)
- `EXECUTING` - Currently running
- `COMPLETED` - Finished successfully
- `FAILED` - Error occurred (details visible on click)

**Creating Tasks:**
- One-time tasks: Created immediately as READY
- Recurring tasks: Spawn READY task instances on schedule

**Task Controls:**
- ▶️ **Play button** - Execute a READY task immediately
- 🗑️ **Trash icon** - Delete task from the stream
- Auto Mode brains pick up READY tasks automatically

### 🔄 Recurring Tasks

Recurring tasks live in the side panel and spawn task instances on schedule.

**Schedule Types:**
- **Hourly** - "At :30 past each hour"
- **Daily** - "Daily at 7:00 AM"
- **Weekly** - "Weekly on Monday at 9:00 PM"
- **Interval** - "Every X minutes"

**Key Behavior:** Recurring task instances **always execute** regardless of the brain's Auto Mode setting.

### 🔌 API Backend (Port 3000)

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Real-time brain status |
| `GET /api/tasks` | All tasks in execution stream |
| `POST /api/tasks` | Create new one-time task |
| `POST /api/tasks/:id/execute` | Execute task immediately |
| `DELETE /api/tasks/:id` | Delete task |
| `GET /api/recurring` | All recurring tasks |
| `POST /api/recurring` | Create recurring task |
| `POST /api/recurring/:id/run` | Run recurring task now |
| `DELETE /api/recurring/:id` | Delete recurring task |
| `GET /api/config/models` | Available OpenClaw models |

### 💬 Discord Commands

**Global Commands (all channels):**
- `!task <title>` - Create a new READY task
- `!log <text>` - Append to brain's daily log
- `!read` - Read today's log
- `!context` - View brain's context
- `!context set <text>` - Update context

**Job Brain Commands:**
- `!job add <Company> <Position> [URL]` - Track application
- `!job list` - List recent applications
- `!job remove <ID>` - Remove application

**Digest Brain:**
- `!digest` - Generate aggregated daily report

## Architecture

### Task Lifecycle
```
READY → EXECUTING → COMPLETED
                → FAILED (error stored)
```

Tasks start as **READY** (no PENDING state). The heartbeat loop (60s) processes:
1. Creates recurring task instances when due
2. Auto-Mode brains pick up READY tasks
3. Recurring instances execute regardless of Auto Mode

### Brain Execution Flow
1. Brain finds READY tasks for itself
2. `TaskExecutorService` orchestrates execution
3. `OpenClawAdapter` calls `openclaw agent` CLI
4. Output is parsed (JSON → clean text, duplicates removed)
5. Result sent to brain's Discord channel

## Setup & Run

1. **Install:** `npm install`
2. **Configure:** Copy `.env.example` to `.env` and fill in:
   - `DISCORD_BOT_TOKEN`
   - `OPENCLAW_TOKEN` (from `openclaw gateway status`)
3. **Build:** `npx tsc && cd frontend && npm run build`
4. **Run:** `node dist/index.js`

## Configuration

### Brains (`config/brains.json`)
```json
{
  "brains": [
    {
      "id": "school",
      "name": "Schoolwork Brain",
      "channelKey": "schoolwork_brain",
      "type": "context",
      "description": "...",
      "openClawAgentId": "school"
    }
  ],
  "nexus": { ... },
  "digest": { ... }
}
```

### Models
Models are loaded dynamically from `~/.openclaw/openclaw.json`. The UI shows available models with their providers (google, anthropic, openai-codex, etc.).

## Debugging

```bash
# Check task counts by status
sqlite3 cerebro.db "SELECT status, COUNT(*) FROM tasks GROUP BY status;"

# View recent failed tasks
sqlite3 cerebro.db "SELECT id, title, error FROM tasks WHERE status='FAILED' ORDER BY updatedAt DESC LIMIT 5;"

# Check recurring task schedules
sqlite3 cerebro.db "SELECT title, datetime(nextExecutionAt/1000, 'unixepoch', 'localtime') FROM recurring_tasks;"

# Test OpenClaw agent manually
openclaw agent --agent school --message "test" --json
```

## Common Issues

**"Brain config not found"**
- Check `config/brains.json` has matching brain ID
- Verify brain is registered in `src/index.ts`

**Tasks not executing**
- Check task status is `READY`
- For non-recurring: ensure brain Auto Mode is ON or use Play button
- Check OpenClaw gateway is running: `openclaw gateway status`

**Duplicate messages in Discord**
- Fixed by deduplication logic in `OpenClawAdapter`
- Only unique text payloads are sent

**Light mode issues**
- Background now properly switches between dark/white gradients
- Theme preference saved to localStorage

## Known Issues & Architecture Notes

### Recurring Task Schema (Historical)
The database schema has dual columns due to migration history:
- **New columns**: `pattern` (string), `active` (boolean)
- **Legacy columns**: `scheduleType` (string), `enabled` (boolean)

**Implementation:** The API uses a transformation layer (`src/api/transforms/recurring.transform.ts`) that converts between:
- **API format**: `{ scheduleType, enabled, scheduleConfig }`
- **DB format**: `{ pattern, active, cronExpression }`

The repository updates BOTH columns on writes for backward compatibility, and reads use `(active === 1) || (enabled === 1)` to handle mixed states.

### Task Status Flow
- Tasks start as **READY** (PENDING was removed entirely)
- Only READY tasks are eligible for execution
- Recurring task instances bypass Auto Mode and always execute
- Failed tasks store error details accessible via task detail modal

## Development

```bash
# Backend hot reload
npm run dev

# Frontend dev server
cd frontend && npm run dev

# Build for production
npm run build
```
