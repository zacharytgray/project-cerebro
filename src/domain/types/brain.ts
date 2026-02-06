/**
 * Brain domain types
 */

export enum BrainStatus {
  IDLE = 'IDLE',
  EXECUTING = 'EXECUTING',
}

export enum BrainType {
  CONTEXT = 'context',
  JOB = 'job',
  DIGEST = 'digest',
  NEXUS = 'nexus',
}

export interface BrainConfig {
  id: string;
  name: string;
  type: BrainType;
  description: string;
  discordChannelId: string;
  openClawAgentId?: string;
}

export interface BrainState {
  id: string;
  name: string;
  type: BrainType;
  status: BrainStatus;
  autoMode: boolean;
  description: string;
  discordChannelId: string;
  openClawAgentId?: string;
}

export interface IBrain {
  id: string;
  name: string;
  status: BrainStatus;
  autoMode: boolean;

  // Lifecycle
  init(): Promise<void>;
  toggleAutoMode(enabled: boolean): void;

  // Message handling
  handleUserMessage(message: string): Promise<void>;

  // Heartbeat
  onHeartbeat(): Promise<void>;

  // Force execution
  forceRun(): Promise<void>;

  // State
  getState(): BrainState;
}
