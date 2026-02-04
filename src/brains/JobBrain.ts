import { Brain } from '../core/Brain';
import { TaskStatus } from '../core/Task';

export class JobBrain extends Brain {
    
    // Override message handler to catch job commands
    // In a real system, we'd have a router, but here we just check messages in onHeartbeat or similar?
    // Actually, we need a way to pass messages TO the brain.
    // We'll rely on the Runtime calling a public method `handleMessage`.

    public async handleUserMessage(message: string): Promise<void> {
        const parts = message.split(' ');
        const command = parts[0].toLowerCase();

        if (command === '!job') {
            const sub = parts[1]?.toLowerCase();
            
            if (sub === 'add') {
                // Usage: !job add <Company> <Position> <URL>
                // Very simple parser for now
                const company = parts[2];
                const position = parts[3];
                const url = parts[4] || '';
                
                if (!company || !position) {
                    await this.sendMessage("Usage: `!job add <Company> <Position> [URL]`");
                    return;
                }

                await this.graph.createJob({
                    id: Date.now().toString(),
                    company,
                    position,
                    url,
                    status: 'APPLIED',
                    notes: '',
                    dateApplied: Date.now(),
                    updatedAt: Date.now()
                });
                
                await this.sendMessage(`✅ Tracked application for **${position}** at **${company}**.`);
            } 
            else if (sub === 'list') {
                const jobs = await this.graph.getJobs();
                const list = jobs.slice(0, 10).map(j => 
                    `• **${j.company}** - ${j.position} (${j.status})`
                ).join('\n');
                await this.sendMessage(list.length > 0 ? `**Recent Jobs:**\n${list}` : "No jobs tracked yet.");
            }
        } else {
            // Default task creation from Phase 2
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
}
