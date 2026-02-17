# Brain Configs (file-first)

These files are the **source of truth** for per-brain runtime behavior.

Location:
- `config/brain-configs/<brainId>.json`

Brain IDs currently used:
- `nexus`
- `personal`
- `school`
- `research`
- `money`
- `job`

## How sync works

At runtime startup, Cerebro syncs in this order:

1. **Bootstrap missing files from DB** (safety net for first run)
2. **Apply existing files to DB** (`brain_configs` table)

So if a file exists, it wins.

## Commands

```bash
npm run brain-configs:export   # DB -> files
npm run brain-configs:import   # files -> DB
npm run brain-configs:sync     # bootstrap missing + apply files
npm run brain-configs:lint     # validate files only (no DB writes)
```

## Recommended schema

Not all fields are required; keep it minimal and explicit.

```json
{
  "systemPrompt": "You are ...",
  "defaultModel": "",
  "tools": {
    "enabled": {
      "calendar": true,
      "web_search": false
    },
    "config": {
      "calendar": {
        "mergedCalendars": "primary,another-id"
      },
      "email": {
        "defaultAccount": "office"
      }
    }
  },
  "skills": ["optional-skill-name"],
  "reportFormat": "markdown",
  "reportTemplate": "# Daily Report\n\n## Summary\n- ..."
}
```

## Field guide

- `systemPrompt` (string)
  - Main behavioral instructions for the brain.
- `defaultModel` (string)
  - Optional preferred model alias.
- `tools.enabled` (object)
  - Tool-level toggles consumed by prompt construction/runtime logic.
- `tools.config` (object)
  - Tool-specific settings (calendar IDs, email account, etc).
- `skills` (array of strings)
  - Optional skill hints to include in prompt context.
- `reportFormat` (`"markdown" | "json"`)
  - Output style when task requests report generation.
- `reportTemplate` (string)
  - Template inserted into report tasks.

## Validation

Configs are schema-validated when:
- saved via API (`POST /api/brains/:brainId/config`)
- applied from files during startup sync

Invalid files are skipped (not applied to DB) and logged with validation errors.

## Best practices

- Keep brain-specific rules here, not in global `USER.md`.
- Keep global personal preferences in OpenClaw workspace docs (`USER.md`, `SOUL.md`).
- Commit changes to these files with clear messages (they are policy changes).
- Prefer small edits and test with one manual recurring run before relying on schedule.

## Quick edit workflow

1. Edit `config/brain-configs/<brainId>.json`
2. Restart Cerebro (or run import command)
3. Trigger a test task for that brain
4. Verify output and adjust
