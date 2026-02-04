import { Brain } from '../core/Brain';
import { TaskStatus } from '../core/Task';

export class ContextBrain extends Brain {
    
    public async handleUserMessage(message: string): Promise<void> {
        if (message.startsWith('!task')) {
             const title = message.replace('!task', '').trim() || 'Manual Task';
            await this.graph.createTask({
                id: Date.now().toString(),
                brainId: this.id,
                status: TaskStatus.READY,
                title: title,
                payload: {},
                dependencies: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                attempts: 0
            });
            await this.sendMessage(`✅ Task "${title}" created.`);
        }
    }
}
