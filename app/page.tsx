'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Train, Plus, ScanLine, Wifi, WifiOff, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrainCard } from '@/components/train/TrainCard';
import { useAllTrains } from '@/hooks/useTrains';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const trains = useAllTrains();
  const router = useRouter();

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/trains?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const recentTrains = trains?.slice(0, 3) ?? [];
  const totalTrains = trains?.length ?? 0;

  return (
    <div className="page-container pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Train className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Coach Manager</h1>
              <p className="text-xs text-muted-foreground">Railway Staff Tool</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <div className="flex items-center gap-1 text-xs text-accent">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-orange-500">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by train number or name…"
            className="pl-10 h-12 text-base"
            type="search"
            inputMode="search"
          />
        </div>
      </form>

      {/* Stats */}
      {totalTrains > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Train className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTrains}</p>
                <p className="text-xs text-muted-foreground">Saved Trains</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {trains
                    ? Math.round(trains.reduce((sum, t) => sum + t.coaches.length, 0) / Math.max(trains.length, 1))
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg. Coaches</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/trains/new">
          <button className="w-full h-16 bg-primary text-white rounded-2xl flex items-center justify-center gap-2.5 font-semibold shadow-sm active:scale-[0.97] transition-transform">
            <Plus className="w-5 h-5" />
            Add Train
          </button>
        </Link>
        <Link href="/scan">
          <button className="w-full h-16 bg-accent text-white rounded-2xl flex items-center justify-center gap-2.5 font-semibold shadow-sm active:scale-[0.97] transition-transform">
            <ScanLine className="w-5 h-5" />
            Scan OCR
          </button>
        </Link>
      </div>

      {/* Recent trains */}
      {trains === undefined ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Loading…</h2>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : recentTrains.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent</h2>
            <Link href="/trains" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {recentTrains.map((train) => (
            <TrainCard key={train.id} train={train} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
              <Train className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No trains saved yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first train to get started</p>
            </div>
            <Link href="/trains/new">
              <Button className="mt-2">
                <Plus className="w-4 h-4" />
                Add First Train
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
