# Action Plan

## Phase 1: Core Architecture & Foundation
Establish the runtime environment and the fundamental communication layer.

- [ ] **Project Skeleton**: Set up Node.js/TypeScript monorepo (Runtime + Dashboard).
- [ ] **Base Brain Interface**: Define the abstract `Brain` class with lifecycle methods (`init`, `wake`, `sleep`, `execute`).
- [ ] **Discord Gateway**: Implement a multi-channel Discord client capable of routing messages to specific Brains based on channel ID.
- [ ] **Heartbeat Loop**: Create the central ticker that emits heartbeat events to registered Brains.
- [ ] **Configuration Manager**: System to load/save config (channel IDs, API keys, model preferences) from disk.

## Phase 2: The Execution Engine (The "Graph")
Build the stateful task management system that replaces static lists.

- [ ] **Task Schema**: Design the data model for Tasks (ID, `BrainID`, Status, Payload, Dependencies, `RetryPolicy`, `CreatedAt`, `ExecuteAt`).
- [ ] **State Machine**: Implement strict transitions for task states:
    - `Pending` → `Waiting` (on time/dep)
    - `Waiting` → `Ready`
    - `Ready` → `Executing`
    - `Executing` → `Completed` | `Failed` | `Blocked` | `Paused`
- [ ] **Graph Manager**: Logic to resolve dependencies and promote tasks from `Waiting` to `Ready`.
- [ ] **Persistence Layer**: Implement SQLite or LevelDB storage to save the Execution Graph state (ensuring crash recovery).

## Phase 3: Brain Specialization
Implement the five specific Brains and their unique data requirements.

- [ ] **Job Application Brain**:
    - [ ] Design and implement the Job Database (SQLite/Postgres).
    - [ ] Create CRUD operations for job applications.
- [ ] **Personal Life Brain**: Implement context/memory bindings.
- [ ] **Schoolwork Brain**: Implement context/memory bindings.
- [ ] **Research Brain**: Implement context/memory bindings.
- [ ] **Money Making Brain**: Implement context/memory bindings.
- [ ] **Daily Digest**: Implement the aggregator logic to pull "Ready" summaries from other Brains and post to the Digest channel.

## Phase 4: Dashboard Backend & API
Expose the internal state to the frontend.

- [ ] **API Layer**: Fastify/Express server exposing:
    - `GET /status`: Real-time state of all Brains.
    - `GET /tasks`: The current Execution Graph.
    - `POST /control`: Endpoints to Pause/Resume/Trigger Brains.
- [ ] **Telemetry Tracking**: Middleware to track and store:
    - Token usage per run.
    - Execution duration.
    - Last active timestamps.

## Phase 5: Dashboard Frontend (The "Control Surface")
Build the UI for observation and control.

- [ ] **Status Board**: Real-time cards for each Brain showing Status (Idle/Running), Model, and Telemetry.
- [ ] **Execution Views**:
    - **Agent-Centric**: List of active/queued tasks per Brain.
    - **Timeline**: Chronological view of past and upcoming executions.
- [ ] **Task Inspector**: UI to view task details (logs, why it's blocked, dependencies).
- [ ] **Manual Controls**: Buttons to manually trigger a heartbeat or force-run a specific Brain.

## Phase 6: Autonomy & Scheduling Controls
Implement the logic that allows the system to run itself.

- [ ] **Scheduler UI**: Frontend interface to set Cron expressions or Intervals for each Brain.
- [ ] **Autonomous Toggle**:
    - Global "Auto-Mode" switch.
    - Per-Brain "Auto-Mode" switch.
- [ ] **Auto-Execution Logic**: The core loop that checks `if (AutoMode && Task is Ready) => Execute()`.

## Phase 7: Reporting, Artifacts & Ingestion
Handle the outputs and inputs of the system.

- [ ] **Markdown Generator**: Standardized service to render run reports (Logs + Summary).
- [ ] **Artifact Storage**: System to save reports to disk (`/reports/{brain}/{date}.md`).
- [ ] **Artifact Browser**: Dashboard page to view history of generated reports.
- [ ] **Discord Notifier**: Logic to post *brief* summaries to Discord with links to the full local report (or serving the report via web).
- [ ] **File Ingestion System**:
    - Web UI for file uploads.
    - "Ingestion Pipeline": Logic that accepts a file, determines context, and spawns a new Task (e.g., "Analyze this PDF").

## Phase 8: Deployment & Polish
Ensure reliability and ease of use.

- [ ] **Systemd/Docker Setup**: Configuration for always-on background running.
- [ ] **Log Rotation**: Ensure logs don't eat disk space.
- [ ] **Error Recovery**: Automatic retries for failed tasks (backoff strategies).
