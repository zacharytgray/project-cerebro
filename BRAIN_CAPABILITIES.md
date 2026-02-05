# Brain Capabilities & Tooling Matrix

Below is a clear, implementation-ready breakdown of **tool requirements and skills per Brain**, written for capability gating, permissioning, and backend wiring.

Tools are grouped into:

- **Core integrations** (must-have)
- **Optional / advanced tools** (nice-to-have or phase 2)
- **Special execution privileges** (important for autonomy)

---

# Personal Life Brain

## Core Integrations

- **Google Calendar (read/write)**
  - Detect free time
  - Create lifestyle events automatically
- **Weather API**
  - Outdoor activity suggestions
- **Location / Region Context**
  - Local activity discovery
- **Preferences / Memory Store**
  - Hobbies, interests, energy levels, activity durations

## Optional / Advanced

- **Light web search**
  - Events, restaurants, activities nearby
- **Maps / Places API**
  - Distance-aware suggestions

## Special Privileges

- May create calendar events **without confirmation**
- Must respect higher-priority calendar blocks (Schoolwork, Research)

---

# Schoolwork Brain

## Core Integrations

- **Todoist (read/write)**
  - Task ingestion
  - Label-based prioritization (Quiz, Exam, Homework, Research)
- **Google Calendar (read/write BUT NEVER DELETE)**
  - Study block creation
  - Deadline-aware scheduling
- **Preferences / Memory Store**
  - Study habits
  - Preferred study times
  - Session length preferences
- **Notification system**
  - Escalation as deadlines approach

## Optional / Advanced

- **File access**
  - Syllabi, assignments, uploaded notes

## Special Privileges

- Highest scheduling authority
- Allowed to override Personal Life Brain calendar blocks if there is a conflict. Do not ever remove calendar events once they're created though.
- Assertive behavior expected for quizzes and exams

---

# Research Brain

## Core Integrations

- **Local file system (read/write)**
  - Uploaded papers
  - Notes
  - Generated reports
- **Todoist (read-only or read/write)**
  - Research-labeled task context
- **Web search (academic sources)**
  - arXiv
  - Conference proceedings
- **Markdown report generator**

## Optional / Advanced

- **Citation tools**
  - BibTeX generation
- **PDF parsing**
  - Paper ingestion and summarization

## Special Privileges

- Long-running tasks via heartbeat
- Scheduled weekly autonomous scans
- Generates artifacts rather than chat output

---

# Money-Making Brain

## Core Integrations

- **Web search**
  - Business discovery
  - Opportunity scanning (small businesses needing websites, market prediction models, etc.)
- **Agent-browser**
  - Website inspection
  - Lead research
- **Email (send + inbox monitoring)**
  - Outreach — AUTONOMOUS
  - Response tracking
- **File system (read/write)**
  - Generated sites
  - Screenshots
  - Outreach/findings logs
- **Track prospects and responses**

## Optional / Advanced

- **Website generation tools**
  - Static site builders
- **Screenshot / rendering tools**
  - For outbound emails
- **CRM-like lightweight store**

## Special Privileges

- Proactive outbound communication
- Long-running multi-step workflows
- Must log every external contact

---

# Job Application Brain

## Core Integrations

- **Agent-browser (high trust)**
  - Job board navigation
  - Form completion
- **Job search MCP / API**
  - Filtering and discovery
- **Inbox (read-only initially, read/write if needed)**
  - Application responses
- **Persistent database**
  - Job ID (primary key)
  - Status (queued, submitted, accepted, rejected, etc.), metadata, timestamps
- **Preferences / Profile Store**
  - Demographics (e.g. veteran status)
  - Work authorization
  - Resume variants
- **Answer bank**
  - Generic application MCQ bank
  - Open-ended responses
  - Paraphrasing allowed, fabrication forbidden

## Optional / Advanced

- **Resume generator**
  - Per-job tailoring
- **Cover letter generator**
- **Calendar integration**
  - Interviews and deadlines

## Special Privileges

- May submit applications end-to-end
- Must queue rejected or ambiguous cases for human review
- Requires strict data integrity and auditability

---

# Daily Digest Brain (Aggregator)

## Core Integrations

- **Read-only access to all Brains’ task states**
- **Calendar (read-only)**
- **Task execution logs**
- **Report metadata**
- **Natural language summarization**
- **Priority highlighting**

## Special Privileges

- No task creation
- No scheduling authority
- Output-only role (Discord messages)

---

# Shared Infrastructure (All Brains)

## Common Capabilities

- **Execution Stream**
- **Heartbeat scheduler**
- **Logging system**
- **Markdown Report System**
- **Token accounting (per model, not per brain/agent)**
- **Model routing / fallback**
- **Discord messaging (channel-scoped)**

## Permission Rules

- Tools are granted **per Brain**
- Sub-agents inherit only the minimum required tools
- Dangerous tools (browser, email, calendar write) are scoped tightly
