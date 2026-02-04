import { CerebroRuntime } from './core/Runtime';
import { Brain } from './core/Brain';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.join(__dirname, '../config/discord_ids.json');
const discordConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Simple concrete implementation for Phase 1 testing
class GenericBrain extends Brain {}

async function main() {
    const runtime = new CerebroRuntime();

    // Initialize Brains from config
    const brains = [
        { id: 'personal', name: 'Personal Life Brain', channelKey: 'personal_life_brain' },
        { id: 'school', name: 'Schoolwork Brain', channelKey: 'schoolwork_brain' },
        { id: 'research', name: 'Research Brain', channelKey: 'research_brain' },
        { id: 'money', name: 'Money Making Brain', channelKey: 'money_making_brain' },
        { id: 'job', name: 'Job Application Brain', channelKey: 'job_application_brain' },
    ];

    brains.forEach(b => {
        const channelId = discordConfig.channels[b.channelKey];
        if (channelId) {
            // @ts-ignore - passing client via runtime in real implementation, simplified here
            const brain = new GenericBrain({
                id: b.id,
                name: b.name,
                description: 'Core brain',
                discordChannelId: channelId
            }, (runtime as any).client);
            
            runtime.registerBrain(brain);
        }
    });

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error("DISCORD_TOKEN not found in environment");
        process.exit(1);
    }

    await runtime.start(token);
}

main().catch(console.error);
