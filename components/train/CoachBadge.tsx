'use client';

import React from 'react';
import { COACH_COLORS } from '@/lib/coach-colors';
import type { CoachType } from '@/types';
import { cn } from '@/lib/utils';

interface CoachBadgeProps {
  code: string;
  type: CoachType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 min-w-[2.25rem] px-2 text-[11px]',
  md: 'h-9 min-w-[2.75rem] px-2.5 text-xs',
  lg: 'h-11 min-w-[3.25rem] px-3 text-sm font-semibold',
};

export function CoachBadge({ code, type, size = 'md', className }: CoachBadgeProps) {
  const cfg = COACH_COLORS[type];
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium shadow-sm select-none text-white',
        sizeClasses[size],
        className
      )}
      /* Use inline style so Tailwind purging can never strip the colour */
      style={{ backgroundColor: cfg.hex }}
      title={`${code} — ${cfg.label}`}
    >
      {code}
    </div>
  );
}
