import { CerebroRuntime } from './core/Runtime';
import { JobBrain } from './brains/JobBrain';
import { ContextBrain } from './brains/ContextBrain';
import { DigestBrain } from './brains/DigestBrain';
import { ApiServer } from './api/Server';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.join(__dirname, '../config/discord_ids.json');
const brainsPath = path.join(__dirname, '../config/brains.json');
const discordConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const brainsConfig = JSON.parse(fs.readFileSync(brainsPath, 'utf-8'));

async function main() {
    const runtime = new CerebroRuntime();

    // Initialize Brains from config
    const brains = brainsConfig.brains as Array<{
        id: string;
        name: string;
        channelKey: string;
        type: 'context' | 'job';
        description: string;
        openClawAgentId?: string;
    }>;

    // Register Core Brains
    brains.forEach(b => {
        const channelId = discordConfig.channels[b.channelKey];
        if (channelId) {
            let brain;
            const config = {
                id: b.id,
                name: b.name,
                description: b.description,
                discordChannelId: channelId,
                openClawAgentId: b.openClawAgentId
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

    // Register Nexus (Orchestrator)
    const generalChannelId = discordConfig.channels[brainsConfig.nexus.channelKey];
    if (generalChannelId) {
        const nexusBrain = new ContextBrain({
            id: brainsConfig.nexus.id,
            name: brainsConfig.nexus.name,
            description: brainsConfig.nexus.description,
            discordChannelId: generalChannelId,
            openClawAgentId: brainsConfig.nexus.openClawAgentId
        }, (runtime as any).client, runtime.graph);
        runtime.registerBrain(nexusBrain);
    }

    // Register Daily Digest Brain
    const digestChannelId = discordConfig.channels[brainsConfig.digest.channelKey];
    if (digestChannelId) {
        const digestBrain = new DigestBrain({
            id: brainsConfig.digest.id,
            name: brainsConfig.digest.name,
            description: brainsConfig.digest.description,
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
