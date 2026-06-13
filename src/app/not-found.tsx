import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-5 text-center">
      <h1 className="font-display text-display">404</h1>
      <p className="text-muted-foreground">This stretch of coast isn’t charted yet.</p>
      <Button asChild={false}>
        <Link href="/">Back to shore</Link>
      </Button>
    </div>
  );
}
