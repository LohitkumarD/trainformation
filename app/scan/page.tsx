'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, Cpu, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ImageUploader } from '@/components/ocr/ImageUploader';
import { OCRResultPanel } from '@/components/ocr/OCRResult';
import { recognizeText } from '@/lib/ocr';
import { parseOCRText } from '@/lib/parser';
import { addTrain, getTrainByNumber } from '@/hooks/useTrains';
import { toast } from '@/components/ui/use-toast';
import type { OCRResult, Coach } from '@/types';
import { cn } from '@/lib/utils';

type ScanState = 'idle' | 'processing' | 'done' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = async (file: File) => {
    setScanState('processing');
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const text = await recognizeText(file, (p) => {
        setProgress(Math.round(p.progress * 100));
        setProgressLabel(p.status);
      });

      const parsed = parseOCRText(text);
      setResult({ ...parsed, rawText: text });
      setScanState('done');
    } catch (err) {
      console.error('OCR error:', err);
      setError('OCR processing failed. Please try with a clearer image.');
      setScanState('error');
    }
  };

  const handleSave = async (trainNumber: string, trainName: string, coaches: Coach[]) => {
    const existing = await getTrainByNumber(trainNumber);
    if (existing) {
      toast({
        title: 'Train already exists',
        description: `Train ${trainNumber} is already saved. Please edit it instead.`,
        variant: 'destructive',
      });
      return;
    }

    const id = await addTrain({ number: trainNumber, name: trainName, coaches });
    toast({ title: 'Saved!', description: `Train ${trainNumber} saved successfully.`, variant: 'success' as never });
    router.push(`/trains/${id}`);
  };

  const handleDiscard = () => {
    setResult(null);
    setScanState('idle');
    setProgress(0);
  };

  return (
    <>
      <PageHeader title="OCR Scanner" subtitle="Scan train composition images" />

      <div className="page-container pt-4 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Take a clear photo of the coach composition board. The scanner works best with good lighting
            and minimal blur. You can edit the results before saving.
          </p>
        </div>

        {scanState !== 'done' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-primary" />
                Select Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                onImageSelected={handleImageSelected}
                disabled={scanState === 'processing'}
              />
            </CardContent>
          </Card>
        )}

        {/* Processing state */}
        {scanState === 'processing' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Cpu className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Processing Image…</p>
                <p className="text-sm text-muted-foreground capitalize mt-1">{progressLabel || 'Initializing OCR'}</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {scanState === 'error' && error && (
          <Card className="border-red-200">
            <CardContent className="py-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <div>
                <p className="font-semibold text-red-600">Scan Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setScanState('idle')}
                className="text-sm text-primary underline"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        )}

        {/* OCR result */}
        {scanState === 'done' && result && (
          <>
            {result.coaches.length === 0 && result.trainNumbers.length === 0 ? (
              <Card className="border-orange-200">
                <CardContent className="py-6 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-orange-500 mx-auto" />
                  <div>
                    <p className="font-semibold text-orange-600">No data detected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Could not detect any train numbers or coach codes. Try a clearer image.
                    </p>
                  </div>
                  {result.rawText && (
                    <div className="bg-muted rounded-lg p-3 font-mono text-xs text-left whitespace-pre-wrap max-h-28 overflow-y-auto">
                      {result.rawText}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="text-sm text-primary underline"
                  >
                    Scan another image
                  </button>
                </CardContent>
              </Card>
            ) : (
              <OCRResultPanel result={result} onSave={handleSave} onDiscard={handleDiscard} />
            )}
          </>
        )}
      </div>
    </>
  );
}
