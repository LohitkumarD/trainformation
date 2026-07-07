'use client';

import type { Worker } from 'tesseract.js';

let worker: Worker | null = null;
let isInitializing = false;

export type OCRProgress = {
  status: string;
  progress: number;
};

export async function initOCR(onProgress?: (p: OCRProgress) => void): Promise<void> {
  if (worker || isInitializing) return;
  isInitializing = true;

  try {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (onProgress) {
          onProgress({ status: m.status, progress: m.progress });
        }
      },
    });
  } finally {
    isInitializing = false;
  }
}

export async function recognizeText(
  image: File | Blob | string,
  onProgress?: (p: OCRProgress) => void
): Promise<string> {
  if (!worker) {
    await initOCR(onProgress);
  }
  if (!worker) throw new Error('OCR worker failed to initialize');

  const { data } = await worker.recognize(image);
  return data.text;
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
