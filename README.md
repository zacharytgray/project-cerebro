# Project Cerebro

## Goal
Project Cerebro aims to re-envision the "CEO Dashboard" as a comprehensive **agent runtime and execution control surface**. Instead of a static task board, Cerebro provides a dynamic interface for managing autonomous "Brains" (specialized agents) that operate on a formal, stateful execution graph driven by heartbeats. The primary goal is to shift from manual task management to overseeing an autonomous system that executes, recovers, and reports on its own work.

## Current Features (Phase 4 Implemented)

### 🧠 Specialized Brains
The system currently runs 5 specialized Brains + 1 Aggregator, each with persistent storage and context memory.
- **Personal Life Brain**
- **Schoolwork Brain**
- **Research Brain**
- **Money Making Brain**
- **Job Application Brain**
- **Daily Digest Brain**

### 🔌 API Backend (Port 3000)
The runtime exposes a REST API for the dashboard:
- `GET /api/status`: Real-time status of all Brains (`IDLE`, `EXECUTING`).
- `GET /api/tasks`: Full list of tasks in the Execution Graph.
- `GET /api/jobs`: All tracked job applications.

### 💬 Discord Commands
Interact with Brains directly in their specific channels.

#### Global Commands (All Brains)
- **`!log <text>`**: Append an entry to the brain's daily markdown log (`data/{brain}/{date}.md`).
- **`!read`**: Read back today's log entries.
- **`!context`**: View the long-term context/memory for the brain.
- **`!context set <text>`**: Overwrite the long-term context.
- **`!task <title>`**: Create a new task in the Execution Graph (sets status to `READY` for immediate execution).

#### Job Brain Commands (`#job-application-brain`)
- **`!job add <Company> <Position> [URL]`**: Track a new job application.
- **`!job list`**: List the 10 most recent applications with their Status and ID.
- **`!job remove <ID>`**: Remove a job application from the database.

#### Digest Brain Commands (`#daily-digest`)
- **`!digest`**: Aggregates today's logs from all other brains into a single report.

## Architecture

### 1. The "Brain" Architecture
Each Brain is an autonomous agent operating within a specific domain. They communicate via Discord and persist state to disk (`data/` directory) and a SQLite database (`cerebro.db`).

### 2. Execution Graph
Tasks are managed via a SQLite-backed **Execution Graph**.
- **Stateful**: Tasks move from `PENDING` → `READY` → `EXECUTING` → `COMPLETED`.
- **Persistent**: All state survives restarts.

### 3. Heartbeat-Driven Autonomy
A central runtime loop (30s heartbeat) checks the Graph for `READY` tasks and dispatches them to the appropriate Brain for execution.

## Setup & Run
1. **Install Dependencies**: `npm install`
2. **Configure**: Add `DISCORD_TOKEN` to `.env`.
3. **Run Backend**: `npm run start` (or `npx tsc && node dist/index.js`)
   - Starts Discord Bot
   - Starts API Server on `http://localhost:3000`

## Recurring Tasks
Recurring tasks live in their own section and **spawn normal execution tasks** on schedule.

## File Ingestion
The dashboard includes a file upload block that writes files to intake folders:
- Default: `data/default/intake/`
- Per-brain: `data/<brainId>/intake/`

Supported schedule types:
- **Hourly** (select minute of the hour)
- **Daily** (select time of day)
- **Weekly** (select day + time)
- **Interval** (minutes)

## Brain Configs (Per‑Brain)
Each Brain has a persisted config JSON stored in SQLite. Edit configs in the Brain detail view (JSON textarea) and click **Save Changes**.
These configs are intended for Brain‑specific settings and context.

**Reporting:** Each brain can schedule two daily markdown reports (morning + night). Times are configurable in the UI and stored under `reportTiming`.
