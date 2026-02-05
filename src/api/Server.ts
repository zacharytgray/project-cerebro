import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import { CerebroRuntime } from '../core/Runtime';
import { TaskStatus } from '../core/Task';

export class ApiServer {
    private server: FastifyInstance;
    private runtime: CerebroRuntime;
    private port: number = 3000;

    constructor(runtime: CerebroRuntime, port: number = 3000) {
        this.runtime = runtime;
        this.port = port;
        this.server = Fastify({ logger: true });
        
        this.server.register(cors, { 
            origin: true // Allow all origins for dev
        });

        this.server.register(multipart, {
            limits: { fileSize: 50 * 1024 * 1024 } // 50MB
        });

        // Serve Static Frontend
        const frontendPath = path.join(process.cwd(), 'frontend', 'dist');
        this.server.register(fastifyStatic, {
            root: frontendPath,
            prefix: '/'
        });

        this.registerRoutes();
    }

    private registerRoutes() {
        // Health / Status
        this.server.get('/api/status', async (request, reply) => {
            const brains = this.runtime.getBrains().map(b => ({
                id: b.id,
                name: b.name,
                status: b.status,
                autoMode: b.autoMode
            }));
            
            return {
                status: 'online',
                timestamp: Date.now(),
                brains
            };
        });

        // Control: Toggle AutoMode
        this.server.post<{ Params: { id: string }, Body: { enabled: boolean } }>('/api/brains/:id/toggle', async (request, reply) => {
            const { id } = request.params;
            const { enabled } = request.body;
            
            const brain = this.runtime.getBrains().find(b => b.id === id);
            if (!brain) {
                reply.code(404);
                return { error: "Brain not found" };
            }

            brain.toggleAutoMode(enabled);
            return { success: true, id: brain.id, autoMode: brain.autoMode };
        });

        // Control: Force Run
        this.server.post<{ Params: { id: string }, Body: { title?: string; description?: string; modelOverride?: string } }>('/api/brains/:id/run', async (request, reply) => {
            const { id } = request.params;
            const { title, description, modelOverride } = request.body || {} as any;
            const brain = this.runtime.getBrains().find(b => b.id === id);
            if (!brain) {
                reply.code(404);
                return { error: "Brain not found" };
            }

            const now = Date.now();
            await this.runtime.graph.createTask({
                id: now.toString(),
                brainId: brain.id,
                brainName: brain.name,
                status: TaskStatus.READY,
                title: title || `${brain.name} Manual Run`,
                description: description || 'Manual run requested.',
                payload: { manualRun: true },
                modelOverride,
                dependencies: [],
                executeAt: now,
                createdAt: now,
                updatedAt: now,
                attempts: 0
            });

            await brain.forceRun();
            return { success: true };
        });

        // Brain Config
        this.server.get<{ Params: { id: string } }>('/api/brains/:id/config', async (request, reply) => {
            const { id } = request.params;
            const record = await this.runtime.graph.getBrainConfig(id);
            return { config: record?.config || '{}' };
        });

        this.server.post<{ Params: { id: string }, Body: { config: any } }>('/api/brains/:id/config', async (request, reply) => {
            const { id } = request.params;
            const { config } = request.body || {} as any;
            const json = typeof config === 'string' ? config : JSON.stringify(config || {});
            await this.runtime.graph.setBrainConfig(id, json);
            return { success: true };
        });

        // Tasks
        this.server.post<{ Body: { brainId: string; title: string; description?: string; executeAt?: number; modelOverride?: string } }>('/api/tasks', async (request, reply) => {
            const { brainId, title, description, executeAt, modelOverride } = request.body || {} as any;
            if (!brainId || !title) {
                reply.code(400);
                return { error: 'brainId and title are required' };
            }

            const brain = this.runtime.getBrains().find(b => b.id === brainId);
            const brainName = brain ? brain.name : brainId;

            const now = Date.now();
            const status = executeAt && executeAt > now ? TaskStatus.WAITING : TaskStatus.READY;

            await this.runtime.graph.createTask({
                id: now.toString(),
                brainId,
                brainName,
                status,
                title,
                description,
                payload: {},
                modelOverride,
                dependencies: [],
                executeAt,
                createdAt: now,
                updatedAt: now,
                attempts: 0
            });

            return { success: true, status };
        });

        this.server.get('/api/tasks', async (request, reply) => {
            const tasks = await this.runtime.graph.getAllTasks();
            return { tasks };
        });

        // File Uploads
        this.server.post('/api/upload', async (request, reply) => {
            const data = await request.file();
            if (!data) {
                reply.code(400);
                return { error: 'No file uploaded' };
            }

            const brainId = (data.fields?.brainId as any)?.value || 'default';
            const safeBrain = brainId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
            const intakeDir = path.join(process.cwd(), 'data', safeBrain, 'intake');
            if (!fs.existsSync(intakeDir)) {
                fs.mkdirSync(intakeDir, { recursive: true });
            }

            const filename = data.filename || `upload-${Date.now()}`;
            const outPath = path.join(intakeDir, filename);
            await fs.promises.writeFile(outPath, await data.toBuffer());

            return { success: true, brainId: safeBrain, path: outPath };
        });

        // Reports (markdown)
        this.server.get('/api/reports', async (request, reply) => {
            const q: any = request.query || {};
            const brainId = String(q.brainId || '').trim();
            if (!brainId) {
                reply.code(400);
                return { error: 'brainId is required' };
            }
            const safeBrain = brainId.replace(/[^a-zA-Z0-9_-]/g, '');
            const reportsDir = path.join(process.cwd(), 'data', safeBrain, 'reports');
            const limit = Math.max(1, Math.min(50, Number(q.limit || 10)));
            let files: string[] = [];
            try {
                files = await fs.promises.readdir(reportsDir);
            } catch (e) {
                return { reports: [] };
            }
            const items = await Promise.all(files
                .filter(f => f.endsWith('.md'))
                .map(async (f) => {
                    const full = path.join(reportsDir, f);
                    const stat = await fs.promises.stat(full);
                    const match = f.match(/(\d{4}-\d{2}-\d{2})-(morning|night)\.md/);
                    return {
                        file: f,
                        full,
                        date: match?.[1] || null,
                        kind: (match?.[2] as any) || null,
                        mtime: stat.mtimeMs || 0
                    };
                }));
            items.sort((a, b) => b.mtime - a.mtime);
            const sliced = items.slice(0, limit);
            const reports = await Promise.all(sliced.map(async (it) => ({
                id: it.file,
                brainId: safeBrain,
                date: it.date,
                kind: it.kind,
                updatedAt: it.mtime,
                markdown: await fs.promises.readFile(it.full, 'utf-8')
            })));
            return { reports };
        });

        // Recurring Tasks
        this.server.post<{ Body: { brainId: string; title: string; description?: string; modelOverride?: string; scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY'; intervalMinutes?: number; scheduleConfig?: any } }>('/api/recurring-tasks', async (request, reply) => {
            const { brainId, title, description, modelOverride, scheduleType, intervalMinutes, scheduleConfig } = request.body || {} as any;
            if (!brainId || !title || !scheduleType) {
                reply.code(400);
                return { error: 'brainId, title, and scheduleType are required' };
            }

            const brain = this.runtime.getBrains().find(b => b.id === brainId);
            const brainName = brain ? brain.name : brainId;
            const now = Date.now();

            let intervalMs: number | undefined;
            if (scheduleType === 'INTERVAL') {
                if (!intervalMinutes || intervalMinutes <= 0) {
                    reply.code(400);
                    return { error: 'intervalMinutes (>0) required for INTERVAL schedule' };
                }
                intervalMs = Math.floor(intervalMinutes * 60 * 1000);
            }

            await this.runtime.graph.createRecurringTask({
                id: now.toString(),
                brainId,
                brainName,
                title,
                description,
                modelOverride,
                scheduleType,
                intervalMs,
                scheduleConfig: scheduleConfig ? JSON.stringify(scheduleConfig) : undefined,
                nextRunAt: now,
                lastRunAt: undefined,
                enabled: true,
                createdAt: now,
                updatedAt: now
            });

            return { success: true };
        });

        this.server.get('/api/recurring-tasks', async (request, reply) => {
            const recurringTasks = await this.runtime.graph.getRecurringTasks();
            return { recurringTasks };
        });

        this.server.post<{ Params: { id: string }, Body: { enabled: boolean } }>('/api/recurring-tasks/:id/toggle', async (request, reply) => {
            const { id } = request.params;
            const { enabled } = request.body || {} as any;
            await this.runtime.graph.toggleRecurringTask(id, !!enabled);
            return { success: true };
        });

        // Manual Run: create task from recurring definition + run immediately
        this.server.post<{ Params: { id: string } }>('/api/recurring-tasks/:id/run', async (request, reply) => {
            const { id } = request.params;
            const recurring = (await this.runtime.graph.getRecurringTasks()).find(r => r.id === id);
            if (!recurring) {
                reply.code(404);
                return { error: 'Recurring task not found' };
            }

            const brain = this.runtime.getBrains().find(b => b.id === recurring.brainId);
            const now = Date.now();

            await this.runtime.graph.createTask({
                id: now.toString(),
                brainId: recurring.brainId,
                brainName: recurring.brainName,
                status: TaskStatus.READY,
                title: recurring.title,
                description: recurring.description,
                payload: { recurringTaskId: recurring.id, manualRun: true },
                modelOverride: recurring.modelOverride,
                dependencies: [],
                executeAt: now,
                createdAt: now,
                updatedAt: now,
                attempts: 0
            });

            if (brain) {
                await brain.forceRun();
            }

            return { success: true };
        });

        this.server.post<{ Params: { id: string }, Body: { title?: string; description?: string; modelOverride?: string; scheduleType?: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY'; intervalMinutes?: number; scheduleConfig?: any } }>('/api/recurring-tasks/:id', async (request, reply) => {
            const { id } = request.params;
            const { title, description, modelOverride, scheduleType, intervalMinutes, scheduleConfig } = request.body || {} as any;

            const recurring = (await this.runtime.graph.getRecurringTasks()).find(r => r.id === id);
            if (!recurring) {
                reply.code(404);
                return { error: 'Recurring task not found' };
            }

            const desc = recurring.description || '';
            const isBrainTask = desc.includes('REPORT_KIND:') || desc.includes('PLANNING_KIND:') || desc.includes('MONEY_SEARCH');
            if (isBrainTask) {
                reply.code(403);
                return { error: 'Brain-managed recurring tasks are read-only. Edit in Brain Config.' };
            }

            let intervalMs: number | undefined = recurring.intervalMs;
            let scheduleTypeFinal = recurring.scheduleType;
            let scheduleConfigFinal = recurring.scheduleConfig;
            if (scheduleType) {
                scheduleTypeFinal = scheduleType;
                if (scheduleType === 'INTERVAL') {
                    if (!intervalMinutes || intervalMinutes <= 0) {
                        reply.code(400);
                        return { error: 'intervalMinutes (>0) required for INTERVAL schedule' };
                    }
                    intervalMs = Math.floor(intervalMinutes * 60 * 1000);
                }
                scheduleConfigFinal = scheduleConfig ? JSON.stringify(scheduleConfig) : undefined;
            }

            const now = Date.now();
            const nextRunAt = this.runtime.computeNextRunAt({
                scheduleType: scheduleTypeFinal,
                scheduleConfig: scheduleConfigFinal,
                intervalMs
            } as any, now);

            await this.runtime.graph.updateRecurringTaskFields(id, { title, description, modelOverride });
            await this.runtime.graph.updateRecurringTaskSchedule(id, scheduleTypeFinal, scheduleConfigFinal, intervalMs, nextRunAt);

            return { success: true };
        });

        this.server.delete<{ Params: { id: string } }>('/api/recurring-tasks/:id', async (request, reply) => {
            const { id } = request.params;
            await this.runtime.graph.deleteRecurringTask(id);
            return { success: true };
        });
        
        // Jobs (Direct DB access via graph wrapper)
        this.server.get('/api/jobs', async (request, reply) => {
            const jobs = await this.runtime.graph.getJobs();
            return { jobs };
        });

        // Delete Task
        this.server.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
            const { id } = request.params;
            await this.runtime.graph.deleteTask(id);
            return { success: true };
        });

        // Catch-all for SPA client-side routing
        this.server.setNotFoundHandler((req, res) => {
             res.sendFile('index.html');
        });
    }

    public async start() {
        try {
            await this.server.listen({ port: this.port, host: '0.0.0.0' });
            console.log(`API Server listening on port ${this.port}`);
        } catch (err) {
            this.server.log.error(err);
            process.exit(1);
        }
    }
}
