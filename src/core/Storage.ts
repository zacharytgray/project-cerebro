import * as fs from 'fs';
import * as path from 'path';

export class BrainStorage {
    private basePath: string;
    private brainId: string;

    constructor(brainId: string) {
        this.brainId = brainId;
        this.basePath = path.join(process.cwd(), 'data', brainId);
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    public async appendLog(content: string): Promise<void> {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const logFile = path.join(this.basePath, `${date}.md`);
        const timestamp = new Date().toLocaleTimeString();
        const entry = `\n[${timestamp}] ${content}`;
        
        await fs.promises.appendFile(logFile, entry);
    }

    public async readTodayLog(): Promise<string> {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.basePath, `${date}.md`);
        
        try {
            return await fs.promises.readFile(logFile, 'utf-8');
        } catch (e) {
            return '';
        }
    }
    
    public async updateContext(content: string): Promise<void> {
        const contextFile = path.join(this.basePath, 'CONTEXT.md');
        await fs.promises.writeFile(contextFile, content);
    }

    public async getContext(): Promise<string> {
         const contextFile = path.join(this.basePath, 'CONTEXT.md');
         try {
             return await fs.promises.readFile(contextFile, 'utf-8');
         } catch (e) {
             return 'No context defined.';
         }
    }
}
