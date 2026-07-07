'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, actions, className }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className={cn('sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border', className)}>
      <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
        {(backHref !== undefined || backHref === undefined) && (
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors -ml-1 shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-foreground text-base leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
