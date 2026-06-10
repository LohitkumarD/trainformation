'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { COACH_COLORS } from '@/lib/coach-colors';
import type { CoachType } from '@/types';

interface CoachBadgeProps {
  code: string;
  type: CoachType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 min-w-[2.5rem] px-2 text-xs',
  md: 'h-10 min-w-[3rem] px-3 text-sm',
  lg: 'h-12 min-w-[3.5rem] px-3 text-base font-semibold',
};

export function CoachBadge({ code, type, size = 'md', className }: CoachBadgeProps) {
  const colors = COACH_COLORS[type];
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-lg border-b-4 font-medium shadow-sm select-none',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
      title={`${code} (${colors.label})`}
    >
      {code}
    </div>
  );
}
