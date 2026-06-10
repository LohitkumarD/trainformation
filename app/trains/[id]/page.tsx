'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Edit3, Trash2, Share2, Train, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoachDisplay } from '@/components/train/CoachDisplay';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTrain, deleteTrain } from '@/hooks/useTrains';
import { toast } from '@/components/ui/use-toast';
import { formatDate, shareCoachLayout } from '@/lib/utils';
import { COACH_COLORS } from '@/lib/coach-colors';
import type { CoachType } from '@/types';

export default function TrainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const train = useTrain(id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (train === undefined) {
    return (
      <div className="page-container pt-6">
        <div className="h-7 w-32 skeleton rounded mb-4" />
        <div className="h-40 skeleton rounded-xl mb-4" />
        <div className="h-32 skeleton rounded-xl" />
      </div>
    );
  }

  if (train === null) {
    return (
      <div className="page-container pt-6 text-center">
        <p className="text-muted-foreground">Train not found.</p>
        <Button className="mt-4" onClick={() => router.push('/trains')}>
          Back to Trains
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrain(train.id);
      toast({ title: 'Deleted', description: `Train ${train.number} removed.` });
      router.push('/trains');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete train.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = async () => {
    const text = shareCoachLayout(train.number, train.name, train.coaches);
    if (navigator.share) {
      try {
        await navigator.share({ text, title: `Train ${train.number} Coach Layout` });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Coach layout copied to clipboard.' });
    }
  };

  const coachStats = train.coaches.reduce<Record<CoachType, number>>(
    (acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; },
    {} as Record<CoachType, number>
  );

  const coachText = train.coaches.map((c) => c.code).join(' ');

  return (
    <>
      <PageHeader
        title={`Train ${train.number}`}
        subtitle={train.name || undefined}
        backHref="/trains"
        actions={
          <div className="flex gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => router.push(`/trains/${train.id}/edit`)}
              aria-label="Edit train"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete train"
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="page-container pt-4 space-y-4">
        {/* Train info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Train className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{train.number}</h2>
                {train.name && <p className="text-sm text-muted-foreground">{train.name}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {formatDate(train.updatedAt)}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-3 flex-wrap">
              {(Object.entries(coachStats) as [CoachType, number][]).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${COACH_COLORS[type].dot}`} />
                  <span className="text-xs font-medium">{COACH_COLORS[type].label}: {count}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                <span className="text-xs font-medium text-muted-foreground">Total: {train.coaches.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coach layout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Coach Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachDisplay coaches={train.coaches} showLegend />
          </CardContent>
        </Card>

        {/* Text format */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-sm text-muted-foreground font-medium">Text Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all leading-relaxed text-foreground">
              {coachText}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14"
            onClick={() => router.push(`/trains/${train.id}/edit`)}
          >
            <Edit3 className="w-5 h-5" />
            Edit
          </Button>
          <Button
            variant="accent"
            className="h-14"
            onClick={handleShare}
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Train {train.number}?</DialogTitle>
            <DialogDescription>
              This will permanently remove Train {train.number}
              {train.name ? ` (${train.name})` : ''} and all its coach data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
