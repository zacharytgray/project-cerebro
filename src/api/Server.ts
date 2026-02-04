import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
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
        this.server.post<{ Params: { id: string } }>('/api/brains/:id/run', async (request, reply) => {
            const { id } = request.params;
            const brain = this.runtime.getBrains().find(b => b.id === id);
            if (!brain) {
                reply.code(404);
                return { error: "Brain not found" };
            }
            await brain.forceRun();
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
