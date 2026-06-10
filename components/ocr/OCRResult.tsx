'use client';

import React, { useState } from 'react';
import { Train, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CoachEditor } from '@/components/train/CoachEditor';
import { CoachDisplay } from '@/components/train/CoachDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Coach } from '@/types';
import type { OCRResult as OCRResultType } from '@/types';

interface OCRResultProps {
  result: OCRResultType;
  onSave: (trainNumber: string, trainName: string, coaches: Coach[]) => Promise<void>;
  onDiscard: () => void;
}

export function OCRResultPanel({ result, onSave, onDiscard }: OCRResultProps) {
  const [trainNumber, setTrainNumber] = useState(result.trainNumbers[0] || '');
  const [trainName, setTrainName] = useState('');
  const [coaches, setCoaches] = useState<Coach[]>(result.coaches as Coach[]);
  const [showRawText, setShowRawText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!trainNumber.trim()) return;
    setIsSaving(true);
    try {
      await onSave(trainNumber, trainName, coaches);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent" />
            OCR Results — Review & Edit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Train number selection */}
          {result.trainNumbers.length > 1 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Detected Train Numbers</Label>
              <div className="flex flex-wrap gap-2">
                {result.trainNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTrainNumber(num)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors ${
                      trainNumber === num
                        ? 'bg-primary text-white border-primary'
                        : 'bg-card border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ocr-train-num">Train Number *</Label>
              <Input
                id="ocr-train-num"
                value={trainNumber}
                onChange={(e) => setTrainNumber(e.target.value)}
                placeholder="12345"
                className="font-mono"
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ocr-train-name">Train Name</Label>
              <Input
                id="ocr-train-name"
                value={trainName}
                onChange={(e) => setTrainName(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coach Sequence ({coaches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachDisplay coaches={coaches} showLegend />
        </CardContent>
      </Card>

      {/* Coach editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Edit Coaches</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachEditor coaches={coaches} onChange={setCoaches} />
        </CardContent>
      </Card>

      {/* Raw text toggle */}
      <button
        type="button"
        onClick={() => setShowRawText(!showRawText)}
        className="flex items-center gap-1 text-sm text-muted-foreground w-full"
      >
        {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showRawText ? 'Hide' : 'Show'} raw OCR text
      </button>

      {showRawText && (
        <div className="rounded-xl bg-muted p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
          {result.rawText || 'No text detected'}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
          Discard
        </Button>
        <Button
          onClick={handleSave}
          disabled={!trainNumber.trim() || coaches.length === 0 || isSaving}
          variant="accent"
        >
          <Train className="w-4 h-4" />
          {isSaving ? 'Saving…' : 'Save Train'}
        </Button>
      </div>
    </div>
  );
}
