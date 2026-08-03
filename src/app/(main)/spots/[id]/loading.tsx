'use client';

import { usePathname } from 'next/navigation';
import { SpotDetailsSkeleton } from '@/components/shared/skeletons';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import { useI18n } from '@/i18n/provider';

function displayNameFromPath(pathname: string, fallbackName: string): string {
  const slug = decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? '');
  const fallback = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return publicSpotName(slug, fallback || fallbackName);
}

export default function Loading() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <SpotDetailsSkeleton
      spotName={displayNameFromPath(pathname, t('spot.fallbackName'))}
      message={t('spot.updating')}
    />
  );
}
