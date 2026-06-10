'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as unknown as Record<string, unknown>).standalone;
    setIsIOS(ios);

    if (ios) {
      const dismissed = localStorage.getItem('pwa-ios-dismissed');
      if (!dismissed) setShowIOSPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
    else setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSPrompt(false);
    localStorage.setItem('pwa-ios-dismissed', '1');
  };

  if (dismissed) return null;

  if (isIOS && showIOSPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-4 shadow-xl animate-slide-up">
        <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Install App</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap the <strong>Share</strong> button then <strong>Add to Home Screen</strong> for offline access
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!installPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-4 shadow-xl animate-slide-up">
      <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Coach Manager</p>
          <p className="text-xs text-muted-foreground mt-0.5">Works offline · Fast · No storage limit</p>
        </div>
        <Button size="sm" onClick={handleInstall} className="shrink-0">
          Install
        </Button>
      </div>
    </div>
  );
}
