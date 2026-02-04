import { Database } from 'sqlite3';
import { Task, TaskStatus } from './Task';
import * as path from 'path';

export interface JobApplication {
    id: string;
    company: string;
    position: string;
    status: 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'GHOSTED';
    url: string;
    notes: string;
    dateApplied: number;
    updatedAt: number;
}

export class ExecutionGraph {
    private db: Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.initSchema();
    }

    private initSchema() {
        this.db.serialize(() => {
            // Base tables (idempotent)
            this.db.run(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    brainId TEXT NOT NULL,
                    brainName TEXT,
                    status TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    payload TEXT,
                    modelOverride TEXT,
                    dependencies TEXT,
                    executeAt INTEGER,
                    createdAt INTEGER,
                    updatedAt INTEGER,
                    attempts INTEGER DEFAULT 0,
                    retryPolicy TEXT,
                    error TEXT,
                    output TEXT
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    company TEXT NOT NULL,
                    position TEXT NOT NULL,
                    status TEXT NOT NULL,
                    url TEXT,
                    notes TEXT,
                    dateApplied INTEGER,
                    updatedAt INTEGER
                )
            `);

            // Lightweight migrations (best-effort, safe on existing DBs)
            const ensureColumn = (table: string, column: string, type: string) => {
                this.db.all(`PRAGMA table_info(${table})`, (err, rows: any[]) => {
                    if (err) {
                        console.error(`[DB] Failed to read schema for ${table}:`, err);
                        return;
                    }
                    const hasColumn = rows.some(r => r.name === column);
                    if (!hasColumn) {
                        this.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (alterErr) => {
                            if (alterErr) {
                                console.error(`[DB] Failed to add column ${column} to ${table}:`, alterErr);
                            } else {
                                console.log(`[DB] Added column ${column} to ${table}`);
                            }
                        });
                    }
                });
            };

            // Task columns added in recent commits
            ensureColumn('tasks', 'modelOverride', 'TEXT');
            ensureColumn('tasks', 'brainName', 'TEXT');
            ensureColumn('tasks', 'description', 'TEXT');
        });
    }

    // --- Task Lifecycle Methods ---\n
    public async createTask(task: Task): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO tasks (id, brainId, brainName, status, title, description, payload, modelOverride, dependencies, executeAt, createdAt, updatedAt, attempts, retryPolicy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                task.id, task.brainId, task.brainName, task.status, task.title, task.description,
                JSON.stringify(task.payload), task.modelOverride, JSON.stringify(task.dependencies),
                task.executeAt, task.createdAt, task.updatedAt,
                task.attempts, JSON.stringify(task.retryPolicy)
            ];

            this.db.run(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async updateTaskStatus(taskId: string, status: TaskStatus, error?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            let query = `UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?`;
            let params: any[] = [status, now, taskId];

            if (error) {
                query = `UPDATE tasks SET status = ?, error = ?, updatedAt = ? WHERE id = ?`;
                params = [status, error, now, taskId];
            }

            this.db.run(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async getReadyTasks(brainId: string): Promise<Task[]> {
        return new Promise((resolve, reject) => {
            // Find tasks that are WAITING but ready to move to READY, OR already READY
            // Simplified logic: Just get READY tasks for now. 
            // The "Graph Manager" logic (Waiting -> Ready) is separate.
            const query = `SELECT * FROM tasks WHERE brainId = ? AND status = ?`;
            this.db.all(query, [brainId, TaskStatus.READY], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(this.mapRowToTask));
            });
        });
    }

    public async getWaitingTasks(): Promise<Task[]> {
         return new Promise((resolve, reject) => {
            const query = `SELECT * FROM tasks WHERE status = ?`;
            this.db.all(query, [TaskStatus.WAITING], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(this.mapRowToTask));
            });
        });
    }

    public async getAllTasks(): Promise<Task[]> {
        return new Promise((resolve, reject) => {
           const query = `SELECT * FROM tasks ORDER BY createdAt DESC LIMIT 100`;
           this.db.all(query, [], (err, rows) => {
               if (err) reject(err);
               else resolve(rows.map(this.mapRowToTask));
           });
       });
   }

    // --- Job Methods ---

    public async createJob(job: JobApplication): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO jobs (id, company, position, status, url, notes, dateApplied, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                job.id, job.company, job.position, job.status,
                job.url, job.notes, job.dateApplied, job.updatedAt
            ];
            this.db.run(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async getJobs(): Promise<JobApplication[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM jobs ORDER BY updatedAt DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows as JobApplication[]);
            });
        });
    }

    public async deleteJob(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM jobs WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async deleteTask(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // --- Helper Methods ---

    private mapRowToTask(row: any): Task {
        return {
            ...row,
            payload: JSON.parse(row.payload || '{}'),
            dependencies: JSON.parse(row.dependencies || '[]'),
            retryPolicy: row.retryPolicy ? JSON.parse(row.retryPolicy) : undefined,
            brainName: row.brainName // Ensure this is mapped if added to SQL
        };
    }
    
    // Evaluate dependencies and time to promote WAITING -> READY
    public async evaluateGraph(): Promise<void> {
        const waitingTasks = await this.getWaitingTasks();
        const now = Date.now();

        for (const task of waitingTasks) {
            let isReady = true;

            // 1. Time Check
            if (task.executeAt && task.executeAt > now) {
                isReady = false;
            }

            // 2. Dependency Check (stub logic for now)
            // In a real graph, we'd query status of parent tasks here.
            
            if (isReady) {
                console.log(`[Graph] Promoting task ${task.id} (${task.title}) to READY`);
                await this.updateTaskStatus(task.id, TaskStatus.READY);
            }
        }
    }
}
