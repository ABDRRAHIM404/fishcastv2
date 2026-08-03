'use client';

import { usePathname } from 'next/navigation';
import { SpotDetailsSkeleton } from '@/components/shared/skeletons';
import { publicSpotName } from '@/lib/forecast-ui/spots';

function displayNameFromPath(pathname: string): string {
  const slug = decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? '');
  const fallback = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return publicSpotName(slug, fallback || 'Fishing spot');
}

export default function Loading() {
  const pathname = usePathname();
  return (
    <SpotDetailsSkeleton
      spotName={displayNameFromPath(pathname)}
      message="Updating spot details and forecast…"
    />
  );
}
