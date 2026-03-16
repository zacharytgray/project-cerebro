import { useEffect, useState } from 'react';
import { ExternalLink, FolderKanban, RefreshCw, Send, Server } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import type { SpecSiteEngineSummaryResponse } from '../api/types';

const PLAN_PATH = 'data/money/plans/local-business-spec-site-outbound-plan.md';
const LEADS_PATH = 'data/money/leads';
const CONFIG_PATH = 'data/money/config/spec-site-engine.json';

const EMPTY_SUMMARY: SpecSiteEngineSummaryResponse = {
  counts: { backlog: 0, qualified: 0, in_progress: 0, outbox: 0, sent: 0, responded: 0, archived: 0 },
  latestOutbox: [],
  latestSent: [],
  updatedAt: new Date(0).toISOString(),
};

export function SpecSiteEnginePage() {
  const [summary, setSummary] = useState<SpecSiteEngineSummaryResponse>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [approvingLeadId, setApprovingLeadId] = useState<string | null>(null);
  const [archivingLeadId, setArchivingLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getSpecSiteEngineSummary();
      setSummary(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Spec Site Engine summary');
    } finally {
      setLoading(false);
    }
  };

  const approveSend = async (leadId: string) => {
    try {
      setApprovingLeadId(leadId);
      await api.approveSpecSiteOutboxSend(leadId, 'zach');
      await loadSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve send');
    } finally {
      setApprovingLeadId(null);
    }
  };

  const archiveLead = async (leadId: string) => {
    const reason = window.prompt('Archive reason (optional):', 'not_a_fit') || 'not_a_fit';
    try {
      setArchivingLeadId(leadId);
      await api.archiveSpecSiteOutboxLead(leadId, 'zach', reason);
      await loadSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive lead');
    } finally {
      setArchivingLeadId(null);
    }
  };

  useEffect(() => {
    loadSummary();
    const timer = window.setInterval(loadSummary, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen p-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spec Site Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Local-business website revamp outbound pipeline (Backlog → Qualified → In Progress → Outbox → Sent → Responded).
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={loadSummary} className="flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {[
          ['Backlog', summary.counts.backlog],
          ['Qualified', summary.counts.qualified],
          ['In Progress', summary.counts.in_progress],
          ['Outbox', summary.counts.outbox],
          ['Sent', summary.counts.sent],
          ['Responded', summary.counts.responded],
          ['Archived', summary.counts.archived],
        ].map(([label, count]) => (
          <Card key={label}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{count as number}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-400" /> Latest Outbox Items
          </h2>
          {summary.latestOutbox.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outbox items yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.latestOutbox.map((item) => (
                <div key={item.lead_id} className="p-3 rounded-lg border border-border bg-secondary/20">
                  <div className="font-medium">{item.business_name || item.lead_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.city}, {item.state} • Score {item.website_score ?? 'n/a'}
                  </div>
                  <div className="text-xs mt-1 space-y-1 break-all">
                    <div><span className="text-muted-foreground">Recipient:</span> {item.email?.recipient || 'missing'}</div>
                    <div><span className="text-muted-foreground">Subject:</span> {item.email?.subject || 'missing'}</div>
                    <div className="text-muted-foreground">Body draft:</div>
                    <pre className="whitespace-pre-wrap text-[11px] bg-secondary/30 border border-border rounded p-2 max-h-32 overflow-auto">{item.email?.body || 'missing'}</pre>
                    <div>
                      <span className="text-muted-foreground">Screenshots:</span>
                      {item.screenshot_paths?.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {item.screenshot_paths.map((p) => {
                            const src = `/api/spec-site-engine/file?path=${encodeURIComponent(p)}`;
                            return (
                              <a key={p} href={src} target="_blank" rel="noreferrer" className="block border border-border rounded overflow-hidden hover:border-blue-400">
                                <img src={src} alt={p} className="w-full h-28 object-cover bg-black/20" />
                                <div className="text-[10px] font-mono p-1 truncate">{p}</div>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <span> none</span>
                      )}
                    </div>
                    {item.preview_url && (
                      <div>
                        <a href={item.preview_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">
                          Local Preview <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => approveSend(item.lead_id)}
                      disabled={approvingLeadId === item.lead_id || archivingLeadId === item.lead_id || !item.lead_id}
                    >
                      {approvingLeadId === item.lead_id ? 'Approving…' : 'Approve Send'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => archiveLead(item.lead_id)}
                      disabled={archivingLeadId === item.lead_id || approvingLeadId === item.lead_id || !item.lead_id}
                    >
                      {archivingLeadId === item.lead_id ? 'Archiving…' : 'Reject/Archive'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-400" /> Hosting
          </h2>
          <p className="text-sm text-muted-foreground">
            Local deploy + screenshots only for review. No demo URLs required.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-green-400" /> Latest Sent</h2>
        {summary.latestSent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sent items yet.</p>
        ) : (
          <div className="space-y-2">
            {summary.latestSent.map((item) => (
              <div key={item.lead_id} className="text-sm border border-border rounded p-2 bg-secondary/20">
                <div className="font-medium">{item.business_name}</div>
                <div className="text-xs text-muted-foreground">To: {item.email?.recipient || 'unknown'} • {item.email?.subject || 'no subject'}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-3">Scaffolded Assets</h2>
        <div className="space-y-2 text-sm">
          <div className="font-mono">{PLAN_PATH}</div>
          <div className="font-mono">{LEADS_PATH}</div>
          <div className="font-mono">{CONFIG_PATH}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-3">Last updated: {new Date(summary.updatedAt).toLocaleString()}</div>
        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
      </Card>
    </div>
  );
}
