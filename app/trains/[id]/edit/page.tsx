'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoachEditor } from '@/components/train/CoachEditor';
import { CoachDisplay } from '@/components/train/CoachDisplay';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTrain, updateTrain } from '@/hooks/useTrains';
import { toast } from '@/components/ui/use-toast';
import type { Coach } from '@/types';

export default function EditTrainPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const train = useTrain(id);

  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (train && !isInitialized) {
      setTrainNumber(train.number);
      setTrainName(train.name || '');
      setCoaches(train.coaches);
      setIsInitialized(true);
    }
  }, [train, isInitialized]);

  if (train === undefined) {
    return (
      <div className="page-container pt-6">
        <div className="h-40 skeleton rounded-xl mb-4" />
        <div className="h-32 skeleton rounded-xl" />
      </div>
    );
  }

  if (train === null) {
    return (
      <div className="page-container pt-6 text-center">
        <p className="text-muted-foreground">Train not found.</p>
        <Button className="mt-4" onClick={() => router.push('/trains')}>Back</Button>
      </div>
    );
  }

  const isValid = trainNumber.trim().length >= 1 && coaches.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await updateTrain(id, {
        number: trainNumber.trim(),
        name: trainName.trim(),
        coaches,
      });
      toast({ title: 'Saved!', description: `Train ${trainNumber} updated.`, variant: 'success' as never });
      router.push(`/trains/${id}`);
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Edit Train"
        subtitle={`Train ${train.number}`}
        backHref={`/trains/${id}`}
        actions={
          <Button size="sm" onClick={handleSave} disabled={!isValid || isSaving}>
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        }
      />

      <div className="page-container pt-4 space-y-4">
        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Train className="w-5 h-5 text-primary" />
              Train Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-train-number">
                  Train Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-train-number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="12345"
                  inputMode="numeric"
                  className="font-mono text-lg"
                  maxLength={5}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-train-name">Train Name</Label>
                <Input
                  id="edit-train-name"
                  value={trainName}
                  onChange={(e) => setTrainName(e.target.value)}
                  placeholder="Express, Rajdhani…"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coach editor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Coach Sequence <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CoachEditor coaches={coaches} onChange={setCoaches} />
          </CardContent>
        </Card>

        {/* Preview */}
        {coaches.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <CoachDisplay coaches={coaches} showLegend />
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full h-14 text-base"
          onClick={handleSave}
          disabled={!isValid || isSaving}
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}
