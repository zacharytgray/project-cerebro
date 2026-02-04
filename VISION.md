I have a vision to create an online dashboard. The current ceo-dashboard project has a frontend that successfully connects to my domain, but I've since been inspired and want to start it over.

The current dashboard envisioned:
- Five CEOs, each with their own unique purpose and scope. I think I will want to make these sub-agents.
	- Personal Life CEO [DESCRIPTION + CHANNEL ID]
	- Schoolwork CEO [DESCRIPTION + CHANNEL ID]
	- Personal life CEO [DESCRIPTION + CHANNEL ID]
	- Research CEO [DESCRIPTION + CHANNEL ID]
	- Money Making CEO [DESCRIPTION + CHANNEL ID]
	- Job Application CEO [DESCRIPTION + CHANNEL ID + DATABASE TO STORE AND QUERY JOB APP INFORMATION]
	Where CEOs can only communicate in their respective channels.
- Additionally, there was a daily digest discord channel [DESCRIPTION + CHANNEL ID]

- Controls to automate each CEO (scheduling, recurring tasks, manual runs, etc.).
- Upon each run, a CEO would generate a markdown report file for that run and display a history of reports and logs of what it had to report. 
	- Brief discord summaries are sent in the corresponding discord server after each report is generated. Heavy text is saved for the reports. 
- A file upload interface so I could easily send files to the raspberry pi openclaw is running from.
- Ability to schedule and automate tasks easily on a nice frontend UI. Included unique controls for each agent (e.g. job application details for the Job Application CEO)

---

## In the new version:

* Replace the term **“CEO”** with **“Brain.”**
  The system consists of five primary Brains (e.g. Personal Life Brain, Research Brain, Job Application Brain), each potentially composed of multiple sub-agents. Brains operate autonomously within their defined scope and communicate only through their assigned Discord channels or the Daily Digest aggregation layer.

* The dashboard becomes an **agent runtime and execution control surface**, rather than a task board.
  For each Brain and its sub-agents, the UI exposes:

  * Running or idle status
  * Current model and configuration
  * Last execution time and duration
  * Active task or execution phase
  * Detailed logs and generated artifacts
  * Token usage relative to configured limits

* Introduce a **formal, stateful task execution system**
  Every user request or scheduled action is decomposed into one or more **tasks**, which are treated as long-lived execution objects rather than static tickets. Tasks may spawn subtasks, pause, resume, or wait on external events.

* Tasks are managed through an **Execution Graph** rather than columns.
  Each task progresses through explicit execution states such as:

  * Pending
  * Waiting on trigger (time, heartbeat, dependency, external event)
  * Ready
  * Executing
  * Paused
  * Blocked
  * Needs review
  * Completed
  * Failed

  The UI surfaces *why* a task is idle, *what it is waiting on*, and *what will cause it to resume*, instead of requiring manual state changes.

* **Heartbeat-driven autonomy is the primary execution mechanism.**
  The heartbeat system is first-class and heavily leveraged:

  * On each heartbeat, idle Brains inspect the Execution Graph for eligible tasks
  * Ready tasks are automatically resumed or executed
  * Long-running tasks continue incrementally across heartbeats
  * Tasks recover cleanly from restarts or interruptions

* Maintain full control over **heartbeat schedules, cron jobs, and execution policies** via the frontend.
  These controls define:

  * How often Brains wake
  * Which task states are eligible for auto-execution
  * Retry behavior and backoff strategies
  * Whether autonomous execution is enabled globally or per Brain

* auto-complete toggle with an **Autonomous Execution Mode**.
  When enabled:

  * Brains automatically pull the highest-priority eligible tasks
  * Scheduled and recurring tasks activate themselves at runtime
  * Dependencies are respected without manual intervention

  When disabled:

  * Tasks accumulate in the system without executing
  * Manual inspection or approval is required to resume work

* Provide **agent-centric and timeline-based views**S.
  The dashboard allows inspection by:

  * Brain workload and execution history
  * Active vs dormant vs blocked tasks
  * Upcoming scheduled executions
  * Recently completed or failed tasks

  This view emphasizes understanding system behavior over managing task placement.

* Preserve and expand **reporting and artifact generation**.
  Each Brain continues to generate markdown reports per execution or run, with:

  * Full logs and detailed output written to disk
  * A persistent history accessible from the dashboard
  * Brief Discord summaries referencing generated files

* Retain and extend **file upload and context ingestion**.
  Uploaded files are treated as first-class inputs that can:

  * Spawn new tasks
  * Unblock existing tasks
  * Update Brain context or memory

* Creative freedom is explicitly encouraged.
  This redesign is intended to be a **significant architectural shift** toward autonomy, recoverability, and long-running execution. If a clearer or more robust abstraction emerges during implementation, it should be adopted even if it diverges from traditional dashboard metaphors.
