# Project Cerebro

## Goal
Project Cerebro aims to re-envision the "CEO Dashboard" as a comprehensive **agent runtime and execution control surface**. Instead of a static task board, Cerebro provides a dynamic interface for managing autonomous "Brains" (specialized agents) that operate on a formal, stateful execution graph driven by heartbeats. The primary goal is to shift from manual task management to overseeing an autonomous system that executes, recovers, and reports on its own work.

## Core Concepts

### 1. The "Brain" Architecture
The system is composed of five primary **Brains**, each with a dedicated purpose and communication channel. A "Brain" is an autonomous agent (potentially managing sub-agents) that operates within a specific domain.
- **Personal Life Brain**
- **Schoolwork Brain**
- **Research Brain**
- **Money Making Brain**
- **Job Application Brain** (includes job app database management)

Each Brain communicates strictly via its assigned Discord channel or through a global **Daily Digest** aggregation layer.

### 2. Execution Graph vs. Task Lists
Tasks are not static text entries but **stateful execution objects**. They are managed via an **Execution Graph** that tracks lifecycle states:
- **Pending**: Created but not started.
- **Waiting**: Blocked on time, dependencies, or external events.
- **Ready**: Eligible for execution.
- **Executing**: Currently running.
- **Paused**: Temporarily halted.
- **Blocked**: Stopped due to error or missing resource.
- **Needs Review**: Requires human intervention.
- **Completed**: Successfully finished.
- **Failed**: Terminated with errors.

The UI will expose *why* a task is in a given state (e.g., "Waiting for 9:00 AM" or "Blocked on file upload").

### 3. Heartbeat-Driven Autonomy
The system relies on a first-class **heartbeat mechanism**:
- Idle Brains check the Execution Graph on every heartbeat.
- Eligible ("Ready") tasks are automatically resumed or started.
- Long-running tasks execute incrementally across heartbeats.
- System is designed for crash recoverability.

## Planned Functionality

### Dashboard UI (Agent Runtime Surface)
The frontend will serve as a control plane, displaying:
- **Status**: Running/Idle state for each Brain.
- **Telemetry**: Current model, config, last run time, duration, and token usage.
- **Activity**: Active task phase, live logs, and generated artifacts.
- **Views**: Agent-centric (workload/history) and Timeline-based views.

### Control Systems
- **Autonomous Execution Mode**: A global or per-Brain toggle.
    - *Enabled*: Brains pull and execute tasks automatically.
    - *Disabled*: Tasks accumulate and wait for manual approval.
- **Scheduling & Cron**: Interface to define wake intervals, retry policies, and execution windows.

### Reporting & Artifacts
- **Markdown Reports**: Generated per run/execution, saved to disk.
- **History**: Persistent log of past reports accessible via UI.
- **Discord Summaries**: Brief notifications sent to Discord linking to full reports.

### Inputs & Ingestion
- **File Upload Interface**: "First-class" input method.
- **Context Updates**: Uploads can trigger new tasks, unblock waiting tasks, or update a Brain's memory/context.

## Architectural Philosophy
This project represents a shift toward **autonomy, recoverability, and long-running execution**. The dashboard is for *observing* and *tuning* the machine, not just operating it manually.
