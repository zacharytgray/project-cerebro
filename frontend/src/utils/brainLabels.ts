import type { BrainStatus } from '../api/types';

export function displayBrainName(name: string): string {
  return name
    .replace('Personal Planning Capability', 'Personal Brain')
    .replace('Schoolwork Capability', 'School Brain')
    .replace('Research Capability', 'Research Brain')
    .replace('Money / Offers Capability', 'Money Brain')
    .replace('Job Application Capability', 'Job Brain')
    .replace('Trainer Capability', 'Trainer Brain');
}

export function displayBrainLabel(brain: Pick<BrainStatus, 'id' | 'name'>): string {
  if (brain.id === 'nexus') return 'Nexus';
  return displayBrainName(brain.name);
}
