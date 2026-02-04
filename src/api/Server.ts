import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { CerebroRuntime } from '../core/Runtime';

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

        this.registerRoutes();
    }

    private registerRoutes() {
        // Health / Status
        this.server.get('/api/status', async (request, reply) => {
            const brains = this.runtime.getBrains().map(b => ({
                id: b.id,
                name: b.name,
                status: b.status
            }));
            
            return {
                status: 'online',
                timestamp: Date.now(),
                brains
            };
        });

        // Tasks
        this.server.get('/api/tasks', async (request, reply) => {
            const tasks = await this.runtime.graph.getAllTasks();
            return { tasks };
        });
        
        // Jobs (Direct DB access via graph wrapper)
        this.server.get('/api/jobs', async (request, reply) => {
            const jobs = await this.runtime.graph.getJobs();
            return { jobs };
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
