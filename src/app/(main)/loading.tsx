import { Loader2 } from 'lucide-react';
import { getServerDictionary } from '@/i18n/server';

/**
 * Default loading state for main pages that don't define their own
 * loading.tsx. Pages with bespoke skeletons (e.g. spots/[id]) override this.
 */
export default async function Loading() {
  const { messages } = await getServerDictionary();
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-label={messages['common.loading']}
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
    </div>
  );
}
