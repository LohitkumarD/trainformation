'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUploader({ onImageSelected, disabled, className }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImageSelected(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected" className="w-full max-h-64 object-contain bg-muted" />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-2 bg-muted/30"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Drop an image here or use the buttons below
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-14"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          type="button"
        >
          <Camera className="w-5 h-5" />
          Camera
        </Button>
        <Button
          variant="outline"
          className="h-14"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload className="w-5 h-5" />
          Gallery
        </Button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
