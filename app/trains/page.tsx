'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Train, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrainCard } from '@/components/train/TrainCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAllTrains } from '@/hooks/useTrains';

function TrainsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const trains = useAllTrains(searchQuery);

  return (
    <div className="page-container pt-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search trains…"
          className="pl-10 h-11"
          type="search"
          autoFocus={!!initialQuery}
        />
      </div>

      {/* Results */}
      {trains === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : trains.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto">
              <Train className="w-7 h-7 text-muted-foreground" />
            </div>
            {searchQuery ? (
              <div>
                <p className="font-semibold">No results for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">No trains saved</p>
                <p className="text-sm text-muted-foreground mt-1">Add a train to get started</p>
              </div>
            )}
            <Link href="/trains/new">
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Add Train
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {trains.length} {trains.length === 1 ? 'train' : 'trains'}
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </p>
          {trains.map((train) => (
            <TrainCard key={train.id} train={train} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainsPage() {
  return (
    <>
      <PageHeader title="All Trains" subtitle="Saved coach compositions" />
      <Suspense fallback={<div className="page-container pt-4"><div className="h-11 skeleton rounded-xl" /></div>}>
        <TrainsContent />
      </Suspense>
    </>
  );
}
