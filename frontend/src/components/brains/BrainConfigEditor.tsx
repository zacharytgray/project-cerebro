import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { Database } from 'lucide-react';

interface BrainConfigEditorProps {
  brainId: string;
  config: Record<string, any>;
  getCfg: (path: string, fallback?: any) => any;
  setCfg: (path: string, value: any) => void;
}

export function BrainConfigEditor({
  brainId,
  config,
  getCfg,
  setCfg,
}: BrainConfigEditorProps) {
  // This is a simplified version - the original had brain-specific configs
  // We'll keep the core structure but make it more maintainable

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

        {/* Common Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border">
            <div>
              <div className="font-medium">Reporting Enabled</div>
              <div className="text-sm text-muted-foreground">
                Generate periodic reports for this brain
              </div>
            </div>
            <Toggle
              checked={getCfg('reporting.enabled', true)}
              onChange={(v) => setCfg('reporting.enabled', v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border">
            <div>
              <div className="font-medium">Calendar Write Without Confirmation</div>
              <div className="text-sm text-muted-foreground">
                Allow autonomous calendar modifications
              </div>
            </div>
            <Toggle
              checked={getCfg('privileges.calendarWriteWithoutConfirmation', false)}
              onChange={(v) => setCfg('privileges.calendarWriteWithoutConfirmation', v)}
            />
          </div>
        </div>

        {/* Brain-specific configs would go here */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Advanced Configuration (JSON)
          </summary>
          <pre className="mt-3 p-4 bg-black/20 rounded-lg text-xs overflow-auto max-h-96">
            {JSON.stringify(config, null, 2)}
          </pre>
        </details>
      </div>
    </Card>
  );
}
