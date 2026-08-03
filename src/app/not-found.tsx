import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerDictionary } from '@/i18n/server';

export default async function NotFound() {
  const { messages } = await getServerDictionary();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-5 text-center">
      <h1 className="font-display text-display">404</h1>
      <p className="text-muted-foreground">{messages['error.notFound']}</p>
      <Button>
        <Link href="/">{messages['error.backToShore']}</Link>
      </Button>
    </div>
  );
}
