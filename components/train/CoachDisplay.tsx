'use client';

import React from 'react';
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
    <div className={cn('space-y-4', className)}>
      {/* Vertical wrap grid — [position#][CODE] compound chips */}
      <div className="flex flex-wrap gap-2">
        {coaches.map((coach, idx) => {
          const colors = COACH_COLORS[coach.type];
          return (
            <div
              key={coach.id || idx}
              className="flex items-stretch rounded-xl overflow-hidden border border-border shadow-sm"
            >
              {/* Position number */}
              <span className="flex items-center justify-center min-w-[1.8rem] px-1.5 bg-muted text-[11px] font-semibold text-muted-foreground leading-none select-none">
                {idx + 1}
              </span>
              {/* Coach code with type colour */}
              <span
                className={cn(
                  'flex items-center justify-center px-2.5 py-2 text-xs font-bold leading-none select-none',
                  colors.bg,
                  colors.text
                )}
              >
                {coach.code}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && typesPresent.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
          {COACH_TYPE_LEGEND.filter((t) => typesPresent.includes(t)).map((type) => {
            const cfg = COACH_COLORS[type];
            const count = coaches.filter((c) => c.type === type).length;
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
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
