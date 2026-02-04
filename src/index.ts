import { CerebroRuntime } from './core/Runtime';
import { JobBrain } from './brains/JobBrain';
import { ContextBrain } from './brains/ContextBrain';
import { DigestBrain } from './brains/DigestBrain';
import { ApiServer } from './api/Server';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.join(__dirname, '../config/discord_ids.json');
const discordConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

async function main() {
    const runtime = new CerebroRuntime();

    // Initialize Brains from config
    const brains = [
        { id: 'personal', name: 'Personal Life Brain', channelKey: 'personal_life_brain', type: 'context' },
        { id: 'school', name: 'Schoolwork Brain', channelKey: 'schoolwork_brain', type: 'context' },
        { id: 'research', name: 'Research Brain', channelKey: 'research_brain', type: 'context' },
        { id: 'money', name: 'Money Making Brain', channelKey: 'money_making_brain', type: 'context' },
        { id: 'job', name: 'Job Application Brain', channelKey: 'job_application_brain', type: 'job' },
    ];

    brains.forEach(b => {
        const channelId = discordConfig.channels[b.channelKey];
        if (channelId) {
            let brain;
            const config = {
                id: b.id,
                name: b.name,
                description: 'Core brain',
                discordChannelId: channelId
            };

            if (b.type === 'job') {
                // @ts-ignore
                brain = new JobBrain(config, (runtime as any).client, runtime.graph);
            } else {
                // @ts-ignore
                brain = new ContextBrain(config, (runtime as any).client, runtime.graph);
            }
            
            runtime.registerBrain(brain);
        }
    });

    // Register Daily Digest Brain
    const digestChannelId = discordConfig.channels['daily_digest'];
    if (digestChannelId) {
        const digestBrain = new DigestBrain({
            id: 'digest',
            name: 'Daily Digest Brain',
            description: 'Aggregates reports',
            discordChannelId: digestChannelId
        }, (runtime as any).client, runtime.graph, brains.map(b => b.id));
        runtime.registerBrain(digestBrain);
    }

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error("DISCORD_TOKEN not found in environment");
        process.exit(1);
    }

    // Start API
    const api = new ApiServer(runtime, 3000);
    await api.start();

    await runtime.start(token);
}

main().catch(console.error);
