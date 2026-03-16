import { Play } from 'lucide-react';
import type { BrainStatus } from '../../api/types';
import { GlowCard } from '../ui/GlowCard';
import { Badge } from '../ui/Badge';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { PulseIndicator } from '../ui/PulseIndicator';
import { getBrainIcon, brainColors } from '../../utils/brainIcons';
import { displayBrainLabel } from '../../utils/brainLabels';
import { cn } from '../../utils/cn';

interface BrainTileProps {
  brain: BrainStatus;
  onToggle: (id: string, enabled: boolean) => void;
  onRun: (id: string) => void;
  onClick: (id: string) => void;
  className?: string;
}

export function BrainTile({ brain, onToggle, onRun, onClick, className }: BrainTileProps) {
  const isExecuting = brain.status === 'EXECUTING';
  const iconColor = brainColors[brain.id] || 'text-gray-400';
  const maturity = brain.maturity || 'active';

  const displayStatus = isExecuting ? 'ACTIVE' : brain.status;
  const maturityTone =
    maturity === 'dormant' ? 'text-amber-200 border-amber-400/30 bg-amber-500/10' :
    maturity === 'experimental' ? 'text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/10' :
    'text-sky-200 border-sky-400/30 bg-sky-500/10';

  return (
    <GlowCard
      onClick={() => onClick(brain.id)}
      animate={isExecuting}
      glowColor={isExecuting ? 'rgba(34, 197, 94, 0.45)' : 'rgba(59, 130, 246, 0.25)'}
      className={cn(
        'relative group shrink-0 w-[255px] sm:w-[272px] lg:w-[285px] min-h-[248px]',
        className
      )}
    >
      <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('p-2 rounded-xl bg-white/5 border border-white/10 shrink-0', iconColor)}>
            {getBrainIcon(brain.id, 'w-5 h-5')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 break-words pr-1">{displayBrainLabel(brain)}</h3>
              {isExecuting && <PulseIndicator active size="sm" color="green" />}
            </div>
            <p className="text-[11px] text-white/55 truncate">{brain.id}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={isExecuting ? 'success' : 'default'} className="shrink-0">
            {displayStatus}
          </Badge>
          <span className={cn('text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-semibold', maturityTone)}>
            {maturity}
          </span>
        </div>
      </div>

      <div className="mt-3 flex-1 min-h-0">
        <p className="text-[11px] leading-5 text-white/65 line-clamp-4 min-h-[5.4rem]">{brain.description || 'No description available.'}</p>
      </div>

      <div
        className="mt-auto pt-4 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/65">Auto</span>
          <Toggle checked={brain.autoMode} onChange={(enabled) => onToggle(brain.id, enabled)} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRun(brain.id);
          }}
          className="flex items-center gap-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs px-2.5 text-white/80"
        >
          <Play className="w-3.5 h-3.5" />
          Force Run
        </Button>
      </div>
      </div>
    </GlowCard>
  );
}
