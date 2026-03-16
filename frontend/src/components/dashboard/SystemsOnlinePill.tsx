import { PulseIndicator } from '../ui/PulseIndicator';

export function SystemsOnlinePill() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-violet-300/55 dark:border-sky-400/20 bg-white/72 dark:bg-slate-950/55 px-4 py-2 text-xs font-medium tracking-[0.22em] text-violet-950 dark:text-sky-100 shadow-[0_0_25px_rgba(139,92,246,0.10)] backdrop-blur-md">
      <PulseIndicator active size="sm" color="green" />
      <span className="uppercase text-violet-900/90 dark:text-sky-200/90">Systems online</span>
      <span className="h-1 w-1 rounded-full bg-violet-500/60 dark:bg-sky-300/60" />
      <span className="uppercase text-violet-800/60 dark:text-sky-100/60">Nexus linked</span>
    </div>
  );
}
