import Link from 'next/link';
import { Train } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="page-container pt-16 text-center">
      <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-5">
        <Train className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
