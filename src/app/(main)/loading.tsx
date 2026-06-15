import { Loader2 } from 'lucide-react';

/**
 * Default loading state for main pages that don't define their own
 * loading.tsx. Pages with bespoke skeletons (e.g. spots/[id]) override this.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
    </div>
  );
}
