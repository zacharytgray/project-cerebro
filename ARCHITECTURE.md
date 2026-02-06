# Project Cerebro Architecture

## Overview

Cerebro is an autonomous agent runtime that manages "Brains" - specialized AI agents that execute tasks on a schedule. It provides a formal execution pipeline with heartbeat-driven scheduling, recurring task management, and Discord integration for notifications.

## Directory Structure

```
project-cerebro/
├── config/                  # Configuration files
│   ├── brains.json         # Brain definitions (id, name, channel, openClawAgentId)
│   └── discord_ids.json    # Discord server and channel IDs
├── src/
│   ├── api/                # REST API layer
│   │   ├── routes/         # API route handlers (tasks, brains, recurring, config)
│   │   ├── middleware/     # Request logging, error handling
│   │   └── server.ts       # Fastify server setup
│   ├── data/               # Data access layer
│   │   ├── database.ts     # SQLite connection management
│   │   └── repositories/   # Repository pattern implementations
│   │       ├── task.repository.ts
│   │       ├── recurring.repository.ts
│   │       ├── brain-config.repository.ts
│   │       └── job.repository.ts
│   ├── domain/             # Domain models and types
│   │   ├── types/          # TypeScript interfaces
│   │   │   ├── task.ts     # Task, TaskStatus (READY, EXECUTING, COMPLETED, FAILED)
│   │   │   ├── schedule.ts # RecurringTask with scheduleConfig
│   │   │   ├── brain.ts    # IBrain, BrainState, BrainStatus
│   │   │   └── job.ts      # Job-related types
│   │   └── events.ts       # Event bus for system events
│   ├── integrations/       # External service adapters
│   │   ├── openclaw.adapter.ts  # OpenClaw CLI wrapper with JSON parsing
│   │   ├── discord.adapter.ts   # Discord bot client
│   │   └── index.ts
│   ├── lib/                # Shared utilities
│   │   ├── config.ts       # Configuration loader (reads OpenClaw config)
│   │   ├── logger.ts       # Pino logger wrapper
│   │   └── errors.ts       # Custom error classes
│   ├── runtime/            # Core runtime components
│   │   ├── cerebro.ts      # Main runtime orchestrator
│   │   ├── heartbeat.ts    # Heartbeat loop (60s interval)
│   │   ├── base-brain.ts   # Abstract brain with processTasks()
│   │   ├── task-executor-impl.ts  # OpenClaw task executor
│   │   └── brains/         # Brain implementations
│   │       ├── context-brain.ts
│   │       ├── job-brain.ts
│   │       └── digest-brain.ts
│   ├── services/           # Business logic services
│   │   ├── brain.service.ts      # Brain registry and lifecycle
│   │   ├── scheduler.service.ts  # Recurring task scheduling
│   │   ├── task-executor.service.ts  # Task execution pipeline
│   │   ├── report.service.ts     # Report generation
│   │   └── digest.service.ts     # Daily digest aggregation
│   └── index.ts            # Application entry point
├── frontend/               # Web UI (Vite + React + TypeScript)
│   ├── src/
│   │   ├── components/     # UI components (BrainCard, TaskStream, etc.)
│   │   ├── pages/          # DashboardPage, BrainDetailPage
│   │   ├── hooks/          # useBrains, useTasks, useRecurring
│   │   └── api/            # API client and types
│   └── dist/               # Built frontend assets
└── dist/                   # Compiled JavaScript output
```

## Core Concepts

### Task Lifecycle (Simplified)

```
READY → EXECUTING → COMPLETED
                → FAILED (error stored, may retry)
```

**No PENDING state** - tasks are created as READY immediately. The `executeAt` field (optional) delays execution until that timestamp.

**Task Execution:**
1. Task created as `READY`
2. Brain's `processTasks()` finds READY tasks
3. If Auto Mode ON or task is recurring instance → execute
4. `TaskExecutorService.executeTask()` runs the task
5. Status updated to `EXECUTING` → `COMPLETED` or `FAILED`
6. Error details stored in `task.error` (visible on click in UI)

### Recurring Tasks

Recurring tasks define schedules that generate one-time task instances:

**Schedule Types:**
- `HOURLY` - Every hour at specific minute (`scheduleConfig.minute`)
- `DAILY` - Every day at specific time (`scheduleConfig.hour`, `minute`)
- `WEEKLY` - Specific day and time (`scheduleConfig.day`, `hour`, `minute`)
- `INTERVAL` - Every N minutes (`intervalMs`)

**Key Behavior:** Recurring task instances **always execute** regardless of the brain's Auto Mode setting. This ensures scheduled tasks run even when Auto Mode is off.

### Heartbeat Loop

Runs every 60 seconds (`src/runtime/heartbeat.ts`):

1. **processRecurringTasks()** - Find due recurring tasks, create task instances
2. **brainService.heartbeatAll()** - Each brain processes its READY tasks

### Brain Auto Mode

- **Auto Mode ON** - Brain automatically picks up and executes READY tasks
- **Auto Mode OFF** - Brain only executes tasks when manually triggered (Force Run or Play button)
- **Exception** - Recurring task instances always execute (ignore Auto Mode)

### OpenClaw Integration

Each brain has an `openClawAgentId` mapping to an OpenClaw agent:

1. `OpenClawAdapter.executeTask()` builds CLI command
2. Calls `openclaw agent --agent <id> --message <prompt> --json`
3. Parses JSON response, extracts text from `result.payloads`
4. **Deduplication** - Removes duplicate/substring text payloads
5. Joins unique texts with double newlines
6. Returns clean text (no JSON metadata)

### Dashboard Layout

```
┌─────────────────────────────────────┬─────────────────────┐
│ Nexus Brain (full width)            │ Recurring Tasks     │
│                                     │ (scrollable panel)  │
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
│ Execution Stream (with play/trash buttons)                  │
└─────────────────────────────────────────────────────────────┘
```

**Nexus Brain:** Registered from `config.brains.nexus` with ID `nexus`. Has highest scope and privileges.

**Recurring Tasks Panel:** Moved from separate page to side panel. Shows all recurring tasks with run/delete controls.

**Specialized Brains:** 6 context/job brains displayed in 3 rows × 2 columns grid.

## Database Schema

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (task_timestamp_random) |
| brainId | TEXT | Which brain owns this task |
| status | TEXT | READY, EXECUTING, COMPLETED, FAILED |
| title | TEXT | Human-readable task name |
| description | TEXT | Task details |
| payload | TEXT | JSON payload (includes `recurringTaskId` if spawned from recurring) |
| error | TEXT | Error message if FAILED |
| executeAt | INTEGER | Unix timestamp for delayed execution (optional) |
| createdAt | INTEGER | Creation timestamp |
| updatedAt | INTEGER | Last update timestamp |
| attempts | INTEGER | Number of execution attempts |
| output | TEXT | Task output (if any) |

### recurring_tasks
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| brainId | TEXT | Which brain owns this recurring task |
| title | TEXT | Task title |
| scheduleType | TEXT | HOURLY, DAILY, WEEKLY, INTERVAL |
| scheduleConfig | TEXT | JSON with `hour`, `minute`, `day` |
| intervalMs | INTEGER | For INTERVAL type (milliseconds) |
| enabled | INTEGER | 1 = active, 0 = disabled |
| nextExecutionAt | INTEGER | When next instance should be created |
| lastExecutedAt | INTEGER | When last instance was created |

## API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create one-time task
- `POST /api/tasks/:id/execute` - Execute task immediately
- `DELETE /api/tasks/:id` - Delete task

### Recurring
- `GET /api/recurring` - List all recurring tasks
- `POST /api/recurring` - Create recurring task
- `POST /api/recurring/:id/run` - Run recurring task now (spawns instance)
- `DELETE /api/recurring/:id` - Delete recurring task

### Brains
- `GET /api/status` - Get all brain statuses
- `POST /api/brains/:id/toggle` - Toggle Auto Mode
- `POST /api/brains/:id/force-run` - Force run all READY tasks

### Config
- `GET /api/config/models` - Get available OpenClaw models

## Configuration

### Environment Variables (.env)
```
DISCORD_BOT_TOKEN=...       # Discord bot token
OPENCLAW_TOKEN=...          # OpenClaw gateway token
PORT=3000                   # API server port (optional)
DB_PATH=./cerebro.db        # SQLite database path (optional)
LOG_LEVEL=info              # debug, info, warn, error
```

### OpenClaw Config (~/.openclaw/openclaw.json)
Models are loaded dynamically from `agents.defaults.models`. The UI displays:
- `alias` - Short name (e.g., "gemini-flash")
- `id` - Full model ID (e.g., "openrouter/google/gemini-3-flash-preview")
- `provider` - Extracted from ID (google, anthropic, openai-codex, etc.)

### Brain Registration
Brains are registered in `src/index.ts`:
1. Load brain configs from `config/brains.json`
2. Register specialized brains (Personal, School, etc.)
3. Register Nexus brain (from `config.brains.nexus`)
4. Register Digest brain (from `config.brains.digest`)

## Debugging

### Check System Health
```bash
# API health
curl http://localhost:3000/api/health

# Brain statuses
curl http://localhost:3000/api/status | jq

# Available models
curl http://localhost:3000/api/config/models | jq
```

### Database Queries
```bash
# Task counts by status
sqlite3 cerebro.db "SELECT status, COUNT(*) FROM tasks GROUP BY status;"

# Recent failed tasks with errors
sqlite3 cerebro.db "SELECT id, brainId, title, error FROM tasks WHERE status='FAILED' ORDER BY updatedAt DESC LIMIT 5;"

# Recurring tasks with next run times
sqlite3 cerebro.db "SELECT title, datetime(nextExecutionAt/1000, 'unixepoch', 'localtime') FROM recurring_tasks WHERE enabled=1;"

# Tasks for specific brain
sqlite3 cerebro.db "SELECT id, status, title FROM tasks WHERE brainId='school' ORDER BY createdAt DESC LIMIT 10;"
```

### Test OpenClaw Agent
```bash
# Test agent directly
openclaw agent --agent school --message "Test: respond with OK" --json

# Check gateway status
openclaw gateway status
```

### View Logs
```bash
# Backend logs
tail -f cerebro.log

# OpenClaw logs
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

## Common Issues

### "Brain config not found for nexus"
- Check `config/brains.json` has `nexus` entry
- Verify brain is registered in `src/index.ts`
- Restart Cerebro after config changes

### Tasks stuck in READY
- Check brain's Auto Mode is ON (toggle in UI)
- Or manually execute with Play button
- Verify heartbeat is running (check logs)

### Duplicate Discord messages
- Fixed by deduplication in `OpenClawAdapter`
- Checks for substring matches between payloads
- Only unique texts are sent

### Recurring tasks not spawning
- Check task is enabled (badge shows "On")
- Verify `nextExecutionAt` is in the past
- Check scheduler logs in cerebro.log

### Light mode not working
- Fixed: conditional gradient based on theme
- Preference saved to localStorage
- Refresh page after switching

## Frontend Development

```bash
# Dev server with hot reload
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Type checking
cd frontend && npx tsc --noEmit
```

### Key Components

**BrainCard** - Displays brain status, Auto Mode toggle, Force Run button
**TaskStream** - Scrollable list of tasks with filters and action buttons
**Recurring Tasks Panel** - Side panel with recurring task management
**AddTaskModal** - Create one-time or recurring tasks with model selection
