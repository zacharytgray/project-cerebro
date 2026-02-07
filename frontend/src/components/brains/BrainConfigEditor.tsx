import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { Input } from '../ui/Input';
import { Database, Wrench } from 'lucide-react';

interface BrainConfigEditorProps {
  brainId: string;
  config: Record<string, any>;
  getCfg: (path: string, fallback?: any) => any;
  setCfg: (path: string, value: any) => void;
}

const TOOL_DEFINITIONS = [
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Merged Primary + Spring 2026 calendars',
    configFields: [
      { key: 'mergedCalendars', label: 'Calendar IDs (merged)', placeholder: 'primary, spring-2026' },
      { key: 'writeWithoutConfirmation', label: 'Write without confirmation', type: 'boolean' },
    ],
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Task management integration',
    configFields: [{ key: 'defaultProject', label: 'Default Project ID', placeholder: 'Inbox' }],
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Forecasts and current conditions',
    configFields: [{ key: 'defaultLocation', label: 'Default Location', placeholder: 'Chicago, IL' }],
  },
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Brave search integration',
    configFields: [{ key: 'defaultRegion', label: 'Default Region', placeholder: 'US' }],
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Send and read email',
    configFields: [{ key: 'defaultAccount', label: 'Default Account', placeholder: 'office' }],
  },
  {
    id: 'jobspy',
    name: 'JobSpy MCP',
    description: 'Job search across major boards',
    configFields: [{ key: 'defaultQuery', label: 'Default Query', placeholder: 'AI Engineer' }],
  },
  {
    id: 'agent_browser',
    name: 'Agent Browser',
    description: 'Browser automation for job applications',
    configFields: [{ key: 'headless', label: 'Headless mode', type: 'boolean' }],
  },
  {
    id: 'research_storage',
    name: 'Research Storage',
    description: 'Store papers + project context',
    configFields: [{ key: 'basePath', label: 'Storage Path', placeholder: 'data/research' }],
  },
];

export function BrainConfigEditor({
  brainId,
  config,
  getCfg,
  setCfg,
}: BrainConfigEditorProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Database className="w-5 h-5 text-purple-400" />
        Brain Settings
      </h2>

      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure settings for <strong>{brainId}</strong> brain.
        </p>

        {/* Identity & Prompt */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              value={getCfg('systemPrompt', '')}
              onChange={(e) => setCfg('systemPrompt', e.target.value)}
              placeholder="You are the [Brain Name]. Your scope is..."
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary min-h-[120px]"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Default Model</label>
            <Input
              value={getCfg('defaultModel', '')}
              onChange={(e) => setCfg('defaultModel', e.target.value)}
              placeholder="openrouter/anthropic/claude-opus-4.5"
            />
          </div>
        </div>

        {/* Tools */}
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            Tools & Capabilities
          </h3>
          <div className="space-y-4">
            {TOOL_DEFINITIONS.map((tool) => {
              const enabled = !!getCfg(`tools.enabled.${tool.id}`, false);
              return (
                <div key={tool.id} className="p-4 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">{tool.description}</div>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={(v) => setCfg(`tools.enabled.${tool.id}`, v)}
                    />
                  </div>
                  {enabled && tool.configFields.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {tool.configFields.map((field) => {
                        if (field.type === 'boolean') {
                          return (
                            <div key={field.key} className="flex items-center justify-between">
                              <label className="text-sm text-muted-foreground">{field.label}</label>
                              <Toggle
                                checked={!!getCfg(`tools.config.${tool.id}.${field.key}`, false)}
                                onChange={(v) => setCfg(`tools.config.${tool.id}.${field.key}`, v)}
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={field.key}>
                            <label className="text-sm text-muted-foreground">{field.label}</label>
                            <Input
                              value={getCfg(`tools.config.${tool.id}.${field.key}`, '')}
                              onChange={(e) => setCfg(`tools.config.${tool.id}.${field.key}`, e.target.value)}
                              placeholder={field.placeholder}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="text-sm font-medium">Skills (JSON array)</label>
          <textarea
            value={JSON.stringify(getCfg('skills', []), null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setCfg('skills', parsed);
              } catch {
                // ignore invalid JSON while typing
              }
            }}
            placeholder='["research-skill", "job-application-skill"]'
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary min-h-[80px] font-mono text-xs"
          />
        </div>

        {/* Report Settings */}
        <div>
          <label className="text-sm font-medium">Report Template (JSON)</label>
          <textarea
            value={getCfg('reportTemplate', '')}
            onChange={(e) => setCfg('reportTemplate', e.target.value)}
            placeholder='{"summary":"", "todos":[], "notes":[]}'
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary min-h-[120px] font-mono text-xs"
          />
          <div className="flex items-center gap-4 mt-2">
            <label className="text-xs text-muted-foreground">Format:</label>
            <select
              value={getCfg('reportFormat', 'json')}
              onChange={(e) => setCfg('reportFormat', e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-secondary text-sm"
            >
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        </div>

        {/* Debug View (read-only) */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted-foreground/50 hover:text-muted-foreground">
            🔍 Debug: View raw config (read-only)
          </summary>
          <pre className="mt-3 p-4 bg-black/20 rounded-lg text-xs overflow-auto max-h-96 select-all opacity-60">
            {JSON.stringify(config, null, 2)}
          </pre>
          <p className="text-xs text-muted-foreground/50 mt-1">
            This is a read-only view. Edit fields above to modify config.
          </p>
        </details>
      </div>
    </Card>
  );
}
