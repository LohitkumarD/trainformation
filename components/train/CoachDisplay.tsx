'use client';

import React from 'react';
import { CoachBadge } from './CoachBadge';
import { COACH_COLORS, COACH_TYPE_LEGEND } from '@/lib/coach-colors';
import type { Coach } from '@/types';
import { cn } from '@/lib/utils';

interface CoachDisplayProps {
  coaches: Coach[];
  className?: string;
  showLegend?: boolean;
}

export function CoachDisplay({ coaches, className, showLegend = true }: CoachDisplayProps) {
  if (coaches.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
        No coaches added
      </div>
    );
  }

  const typesPresent = [...new Set(coaches.map((c) => c.type))];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Horizontal scroll coach layout */}
      <div className="overflow-x-auto -mx-1 pb-2">
        <div className="flex gap-2 px-1 w-max">
          {coaches.map((coach, idx) => (
            <div key={coach.id || idx} className="flex flex-col items-center gap-1">
              <CoachBadge code={coach.code} type={coach.type} size="lg" />
              <span className="text-[10px] text-muted-foreground">{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && typesPresent.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {COACH_TYPE_LEGEND.filter((t) => typesPresent.includes(t)).map((type) => {
            const cfg = COACH_COLORS[type];
            const count = coaches.filter((c) => c.type === type).length;
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                <span className="text-xs text-muted-foreground">
                  {cfg.label} ({count})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
