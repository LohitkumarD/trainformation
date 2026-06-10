'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Train, ScanLine, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/trains', label: 'Trains', icon: Train },
  { href: '/trains/new', label: 'Add', icon: Plus, isAction: true },
  { href: '/scan', label: 'Scan', icon: ScanLine },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon, isAction }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href) && href !== '/';

          if (isAction) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center"
                aria-label={label}
              >
                <div className="w-14 h-14 -mt-5 bg-primary rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <Icon className="w-7 h-7 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[56px] h-full px-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label={label}
            >
              <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
