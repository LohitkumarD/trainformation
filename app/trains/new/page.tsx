'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Train, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoachEditor } from '@/components/train/CoachEditor';
import { CoachDisplay } from '@/components/train/CoachDisplay';
import { PageHeader } from '@/components/layout/PageHeader';
import { addTrain } from '@/hooks/useTrains';
import { toast } from '@/components/ui/use-toast';
import type { Coach } from '@/types';

export default function NewTrainPage() {
  const router = useRouter();
  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isValid = trainNumber.trim().length >= 1 && coaches.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      const id = await addTrain({
        number: trainNumber.trim(),
        name: trainName.trim(),
        coaches,
      });
      toast({ title: 'Train saved!', description: `Train ${trainNumber} added successfully.`, variant: 'success' as never });
      router.push(`/trains/${id}`);
    } catch {
      toast({ title: 'Error', description: 'Failed to save train. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Add New Train"
        backHref="/trains"
        actions={
          <Button size="sm" onClick={handleSave} disabled={!isValid || isSaving}>
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        }
      />

      <div className="page-container pt-4 space-y-4">
        {/* Train details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Train className="w-4.5 h-4.5 text-primary w-5 h-5" />
              Train Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="train-number">
                  Train Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="train-number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="12345"
                  inputMode="numeric"
                  className="font-mono text-lg"
                  maxLength={5}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="train-name">Train Name</Label>
                <Input
                  id="train-name"
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

        {/* Live preview */}
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

        {/* Save button */}
        <Button
          className="w-full h-14 text-base"
          onClick={handleSave}
          disabled={!isValid || isSaving}
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving…' : 'Save Train'}
        </Button>
      </div>
    </>
  );
}
