'use client';

import React from 'react';
import Link from 'next/link';
import { Train, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CoachBadge } from './CoachBadge';
import { formatDate } from '@/lib/utils';
import type { Train as TrainType } from '@/types';
import { cn } from '@/lib/utils';

interface TrainCardProps {
  train: TrainType;
  className?: string;
}

export function TrainCard({ train, className }: TrainCardProps) {
  const preview = train.coaches.slice(0, 6);
  const remaining = train.coaches.length - preview.length;

  return (
    <Link href={`/trains/${train.id}`}>
      <Card className={cn('active:scale-[0.98] transition-transform cursor-pointer hover:shadow-card-hover', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Train className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-base leading-tight">{train.number}</p>
                {train.name && (
                  <p className="text-sm text-muted-foreground leading-tight mt-0.5">{train.name}</p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          </div>

          {/* Coach preview */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            {preview.map((coach, idx) => (
              <CoachBadge key={coach.id || idx} code={coach.code} type={coach.type} size="sm" />
            ))}
            {remaining > 0 && (
              <span className="text-xs text-muted-foreground font-medium ml-1">+{remaining}</span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-2.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{formatDate(train.updatedAt)}</span>
            <span className="text-xs text-muted-foreground ml-1">· {train.coaches.length} coaches</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
