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
│   │   ├── routes/         # API route handlers
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
│   │   │   ├── task.ts     # Task, TaskStatus, CreateTaskInput
│   │   │   ├── schedule.ts # RecurringTask, RecurrencePattern
│   │   │   ├── brain.ts    # IBrain, BrainState, BrainStatus
│   │   │   └── job.ts      # Job-related types
│   │   └── events.ts       # Event bus for system events
│   ├── integrations/       # External service adapters
│   │   ├── openclaw.adapter.ts  # OpenClaw CLI wrapper
│   │   ├── discord.adapter.ts   # Discord bot client
│   │   └── index.ts
│   ├── lib/                # Shared utilities
│   │   ├── config.ts       # Configuration loader
│   │   ├── logger.ts       # Pino logger wrapper
│   │   └── errors.ts       # Custom error classes
│   ├── runtime/            # Core runtime components
│   │   ├── cerebro.ts      # Main runtime orchestrator
│   │   ├── heartbeat.ts    # Heartbeat loop (periodic execution)
│   │   ├── base-brain.ts   # Abstract brain implementation
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
├── frontend/               # Web UI (Vite + React/Svelte)
├── scripts/                # Utility scripts
└── dist/                   # Compiled JavaScript output
```

## Core Concepts

### Task Lifecycle

```
PENDING → READY → EXECUTING → COMPLETED
                           → FAILED (may retry)
```

1. **PENDING**: Initial state when task is created
2. **READY**: Task is eligible for execution (no time constraints or time has passed)
3. **EXECUTING**: Task is currently being processed by an agent
4. **COMPLETED**: Task finished successfully
5. **FAILED**: Task failed (error stored in `task.error` field)

### Recurring Tasks

Recurring tasks define schedules that generate one-time task instances:

- **RecurrencePattern**: DAILY, WEEKLY, MONTHLY, CUSTOM
- When a recurring task is "due" (nextExecutionAt <= now), a task instance is created
- After creation, `nextExecutionAt` is computed based on `lastExecutedAt`

### Heartbeat Loop

The heartbeat loop (`src/runtime/heartbeat.ts`) runs every 60 seconds:

1. **processRecurringTasks()**: Find due recurring tasks, create task instances
2. **updateTaskStatuses()**: Transition PENDING/WAITING → READY when eligible
3. **brainService.heartbeatAll()**: Each brain processes its READY tasks

### Brain Execution

Each brain has an `openClawAgentId` that maps to an OpenClaw agent. When a task executes:

1. `BaseBrain.processTasks()` finds READY tasks for this brain
2. `TaskExecutorService.executeTask()` orchestrates execution
3. `OpenClawTaskExecutor.execute()` builds and sends the prompt
4. `OpenClawAdapter.executeTask()` calls the `openclaw agent` CLI

## Database Schema

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (task_timestamp_random) |
| brainId | TEXT | Which brain owns this task |
| status | TEXT | PENDING, READY, EXECUTING, COMPLETED, FAILED |
| title | TEXT | Human-readable task name |
| description | TEXT | Task details |
| payload | TEXT | JSON payload (includes recurringTaskId if from recurring) |
| error | TEXT | Error message if FAILED |
| executeAt | INTEGER | Unix timestamp for scheduled execution |
| createdAt | INTEGER | Creation timestamp |
| updatedAt | INTEGER | Last update timestamp |
| attempts | INTEGER | Number of execution attempts |

### recurring_tasks
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| brainId | TEXT | Which brain owns this recurring task |
| title | TEXT | Task title |
| pattern / scheduleType | TEXT | DAILY, WEEKLY, MONTHLY, CUSTOM |
| cronExpression | TEXT | For CUSTOM pattern |
| active / enabled | INTEGER | 1 = active, 0 = disabled |
| lastExecutedAt | INTEGER | When last instance was created |
| nextExecutionAt | INTEGER | When next instance should be created |

## Configuration

### Environment Variables (.env)
```
DISCORD_BOT_TOKEN=...       # Discord bot token
OPENCLAW_GATEWAY_URL=...    # Usually http://localhost:18789
OPENCLAW_TOKEN=...          # OpenClaw gateway token
```

### config/brains.json
Defines available brains with their OpenClaw agent mappings:
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
  ]
}
```

## Debugging

### Check Task Status
```bash
sqlite3 cerebro.db "SELECT status, COUNT(*) FROM tasks GROUP BY status;"
```

### View Failed Tasks
```bash
sqlite3 cerebro.db "SELECT id, brainId, title, error FROM tasks WHERE status='FAILED' ORDER BY updatedAt DESC LIMIT 10;"
```

### View Recurring Task Schedule
```bash
sqlite3 cerebro.db "SELECT id, datetime(nextExecutionAt/1000, 'unixepoch', 'localtime') FROM recurring_tasks ORDER BY nextExecutionAt;"
```

### Check Logs
The application uses Pino logger. Set `LOG_LEVEL=debug` for verbose output.

### Manual Task Execution Test
```bash
openclaw agent --agent school --message "Test message" --json
```

## Common Issues

### Tasks Stuck in PENDING
The heartbeat loop should transition PENDING → READY. Check:
- Is the heartbeat running? (check process)
- Is `executeAt` in the future?

### Tasks Failing with "OpenClaw task execution failed"
Check the `error` field in the database for details. Common causes:
- Invalid agent ID (doesn't exist in OpenClaw)
- OpenClaw gateway not running
- Prompt too long or contains problematic characters

### Duplicate Tasks Being Created
The scheduler should update `lastExecutedAt` before computing `nextExecutionAt`.
If duplicates appear, check the order of operations in `SchedulerService.markExecuted()`.
