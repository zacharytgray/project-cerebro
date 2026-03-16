import { Play } from 'lucide-react';
import type { BrainStatus } from '../../api/types';
import { GlowCard } from '../ui/GlowCard';
import { Badge } from '../ui/Badge';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { PulseIndicator } from '../ui/PulseIndicator';
import { getBrainIcon, brainColors } from '../../utils/brainIcons';
import { displayBrainLabel } from '../../utils/brainLabels';

interface BrainCardProps {
  brain: BrainStatus;
  onToggle: (id: string, enabled: boolean) => void;
  onRun: (id: string) => void;
  onClick: (id: string) => void;
}

export function BrainCard({ brain, onToggle, onRun, onClick }: BrainCardProps) {
  const isExecuting = brain.status === 'EXECUTING';
  const iconColor = brainColors[brain.id] || 'text-gray-400';
  const maturity = brain.maturity || 'active';
  const maturityTone =
    maturity === 'dormant' ? 'text-amber-200 border-amber-400/30 bg-amber-500/10' :
    maturity === 'experimental' ? 'text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/10' :
    'text-sky-200 border-sky-400/30 bg-sky-500/10';

  return (
    <GlowCard
      onClick={() => onClick(brain.id)}
      animate={isExecuting}
      glowColor={
        isExecuting ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.3)'
      }
      className="relative group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-secondary ${iconColor}`}>
            {getBrainIcon(brain.id)}
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2 leading-tight break-words">
              {displayBrainLabel(brain)}
              {isExecuting && <PulseIndicator active size="sm" color="green" />}
            </h3>
            <p className="text-xs text-muted-foreground">{brain.id}</p>
            <p className="text-xs text-muted-foreground">{brain.operationalRole === 'primary' ? 'Primary operator' : 'Specialist brain'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={isExecuting ? 'success' : 'default'}>
            {brain.status}
          </Badge>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${maturityTone}`}>
            {maturity}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{brain.description || 'No description available.'}</p>

      <div className="flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Auto Mode</span>
          <Toggle
            checked={brain.autoMode}
            onChange={(enabled) => onToggle(brain.id, enabled)}
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRun(brain.id);
          }}
          className="flex items-center gap-2"
        >
          <Play className="w-3 h-3" />
          Force Run
        </Button>
      </div>

    </GlowCard>
  );
}
