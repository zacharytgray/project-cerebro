/**
 * Spec Site Engine routes
 */

import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type LeadRecord = {
  lead_id?: string;
  business_name?: string;
  city?: string;
  state?: string;
  website_score?: number;
  updated_at?: string;
  artifacts?: {
    preview_url?: string | null;
    outreach_draft_path?: string | null;
  };
};

function readJsonArray(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath: string, data: any[]): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function registerSpecSiteEngineRoutes(server: FastifyInstance): void {
  server.get<{ Querystring: { path?: string } }>('/api/spec-site-engine/file', async (request, reply) => {
    const relPath = request.query.path || '';
    const workspaceRoot = path.join(os.homedir(), '.openclaw', 'workspace');
    const specRoot = path.join(workspaceRoot, 'data', 'money', 'spec-sites');
    const resolved = path.resolve(workspaceRoot, relPath);

    if (!resolved.startsWith(specRoot)) {
      reply.code(400);
      return { error: 'Invalid file path' };
    }
    if (!fs.existsSync(resolved)) {
      reply.code(404);
      return { error: 'File not found' };
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    const buf = fs.readFileSync(resolved);
    reply.header('Content-Type', mime);
    return reply.send(buf);
  });

  server.get('/api/spec-site-engine/summary', async () => {
    const workspaceRoot = path.join(os.homedir(), '.openclaw', 'workspace');
    const leadsRoot = path.join(workspaceRoot, 'data', 'money', 'leads');

    const stages: Record<string, string> = {
      backlog: path.join(leadsRoot, 'backlog.json'),
      qualified: path.join(leadsRoot, 'qualified.json'),
      in_progress: path.join(leadsRoot, 'in-progress.json'),
      outbox: path.join(leadsRoot, 'outbox.json'),
      sent: path.join(leadsRoot, 'sent.json'),
      responded: path.join(leadsRoot, 'responded.json'),
      archived: path.join(leadsRoot, 'archived.json'),
    };

    const backlog = readJsonArray(stages.backlog);
    const qualified = readJsonArray(stages.qualified);
    const inProgress = readJsonArray(stages.in_progress);
    const outbox = readJsonArray(stages.outbox);
    const sent = readJsonArray(stages.sent);
    const responded = readJsonArray(stages.responded);
    const archived = readJsonArray(stages.archived);

    const toListItem = (item: any) => ({
      lead_id: item.lead_id || '',
      business_name: item.business_name || '',
      city: item.city || '',
      state: item.state || '',
      website_score: item.website_score ?? null,
      updated_at: item.updated_at || null,
      preview_url: item.artifacts?.preview_url || null,
      screenshot_paths: Array.isArray(item.artifacts?.screenshot_paths)
        ? item.artifacts.screenshot_paths
        : item.artifacts?.screenshot_path
        ? [item.artifacts.screenshot_path]
        : [],
      site_dir: item.artifacts?.site_dir || null,
      outreach_draft_path: item.artifacts?.outreach_draft_path || null,
      email: {
        recipient: item.email?.recipient || item.primary_email || '',
        subject: item.email?.subject || '',
        body: item.email?.body || '',
      },
    });

    const latestOutbox = [...outbox]
      .sort((a, b) => {
        const at = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bt = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bt - at;
      })
      .slice(0, 10)
      .map((item) => toListItem(item));

    const latestSent = [...sent]
      .sort((a, b) => {
        const at = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bt = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bt - at;
      })
      .slice(0, 10)
      .map((item) => toListItem(item));

    return {
      counts: {
        backlog: backlog.length,
        qualified: qualified.length,
        in_progress: inProgress.length,
        outbox: outbox.length,
        sent: sent.length,
        responded: responded.length,
        archived: archived.length,
      },
      latestOutbox,
      latestSent,
      paths: {
        leadsRoot,
      },
      updatedAt: new Date().toISOString(),
    };
  });

  server.post<{ Params: { leadId: string }; Body: { approvedBy?: string } }>(
    '/api/spec-site-engine/outbox/:leadId/approve-send',
    async (request, reply) => {
      const workspaceRoot = path.join(os.homedir(), '.openclaw', 'workspace');
      const leadsRoot = path.join(workspaceRoot, 'data', 'money', 'leads');
      const configPath = path.join(workspaceRoot, 'data', 'money', 'config', 'spec-site-engine.json');
      const outboxPath = path.join(leadsRoot, 'outbox.json');
      const sentPath = path.join(leadsRoot, 'sent.json');

      const outbox = readJsonArray(outboxPath);
      const sent = readJsonArray(sentPath);
      const cfg = (() => {
        try {
          return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {
          return {};
        }
      })();

      const idx = outbox.findIndex((item: any) => item?.lead_id === request.params.leadId);
      if (idx < 0) {
        reply.code(404);
        return { error: `Lead ${request.params.leadId} not found in outbox` };
      }

      const now = new Date().toISOString();
      const approvedBy = request.body?.approvedBy || 'zach';
      const lead = outbox[idx];

      const senderAccount = cfg?.email?.senderAccount || 'zach.gray.office@gmail.com';
      const recipient = lead?.email?.recipient || lead?.primary_email;
      const subject = lead?.email?.subject || `Website draft for ${lead?.business_name || 'your business'}`;
      const body = lead?.email?.body || 'Hi,\n\nPlease see the attached website draft screenshots.\n';
      const screenshotPaths = Array.isArray(lead?.artifacts?.screenshot_paths)
        ? lead.artifacts.screenshot_paths
        : lead?.artifacts?.screenshot_path
        ? [lead.artifacts.screenshot_path]
        : [];

      if (!recipient) {
        reply.code(400);
        return { error: 'Outbox item missing email.recipient (or primary_email)' };
      }

      const attachments = screenshotPaths
        .map((p: string) => path.isAbsolute(p) ? p : path.join(workspaceRoot, p))
        .filter((p: string) => fs.existsSync(p));

      const args = [
        'gmail',
        'send',
        '--account', senderAccount,
        '--to', recipient,
        '--subject', subject,
        '--body', body,
      ];

      for (const a of attachments) {
        args.push('--attach', a);
      }

      try {
        await execFileAsync('gog', args, {
          env: {
            ...process.env,
            GOG_KEYRING_PASSWORD: process.env.GOG_KEYRING_PASSWORD || cfg?.email?.keyringPassword || '',
          },
        });
      } catch (e: any) {
        reply.code(500);
        return { error: `Manual send failed: ${e?.stderr || e?.message || 'unknown error'}` };
      }

      const updatedLead = {
        ...lead,
        stage: 'sent',
        updated_at: now,
        email: {
          ...(lead?.email || {}),
          sender: senderAccount,
          sent_at: now,
        },
        history: [
          ...(Array.isArray(lead?.history) ? lead.history : []),
          {
            at: now,
            event: 'approved_send',
            by: approvedBy,
            meta: {
              fromStage: 'outbox',
              toStage: 'sent',
              sender: senderAccount,
              recipient,
              attachmentsCount: attachments.length,
            },
          },
        ],
      };

      outbox.splice(idx, 1);
      sent.unshift(updatedLead);

      writeJsonArray(outboxPath, outbox);
      writeJsonArray(sentPath, sent);

      return {
        ok: true,
        lead_id: request.params.leadId,
        stage: 'sent',
        updatedAt: now,
      };
    }
  );

  server.post<{ Params: { leadId: string }; Body: { archivedBy?: string; reason?: string } }>(
    '/api/spec-site-engine/outbox/:leadId/archive',
    async (request, reply) => {
      const workspaceRoot = path.join(os.homedir(), '.openclaw', 'workspace');
      const leadsRoot = path.join(workspaceRoot, 'data', 'money', 'leads');
      const outboxPath = path.join(leadsRoot, 'outbox.json');
      const archivedPath = path.join(leadsRoot, 'archived.json');

      const outbox = readJsonArray(outboxPath);
      const archived = readJsonArray(archivedPath);

      const idx = outbox.findIndex((item: any) => item?.lead_id === request.params.leadId);
      if (idx < 0) {
        reply.code(404);
        return { error: `Lead ${request.params.leadId} not found in outbox` };
      }

      const now = new Date().toISOString();
      const archivedBy = request.body?.archivedBy || 'zach';
      const reason = request.body?.reason || 'rejected_in_outbox';
      const lead = outbox[idx];

      const siteDir = lead?.artifacts?.site_dir
        ? (path.isAbsolute(lead.artifacts.site_dir)
            ? lead.artifacts.site_dir
            : path.join(workspaceRoot, lead.artifacts.site_dir))
        : path.join(workspaceRoot, 'data', 'money', 'spec-sites', request.params.leadId);

      let deletedSiteDir = false;
      try {
        if (fs.existsSync(siteDir)) {
          fs.rmSync(siteDir, { recursive: true, force: true });
          deletedSiteDir = true;
        }
      } catch {
        deletedSiteDir = false;
      }

      const archivedLead = {
        ...lead,
        stage: 'archived',
        updated_at: now,
        history: [
          ...(Array.isArray(lead?.history) ? lead.history : []),
          {
            at: now,
            event: 'archived',
            by: archivedBy,
            meta: {
              fromStage: 'outbox',
              toStage: 'archived',
              reason,
              deletedSiteDir,
            },
          },
        ],
      };

      outbox.splice(idx, 1);
      archived.unshift(archivedLead);

      writeJsonArray(outboxPath, outbox);
      writeJsonArray(archivedPath, archived);

      return {
        ok: true,
        lead_id: request.params.leadId,
        stage: 'archived',
        updatedAt: now,
      };
    }
  );
}
