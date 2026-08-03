'use client';

import { CircleHelp } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/types';

const HELP_KEYS = {
  wavePeriod: 'help.wavePeriod',
  wavelength: 'help.wavelength',
  wavePower: 'help.wavePower',
  steepness: 'help.steepness',
  modelledTide: 'help.modelledTide',
  swell: 'help.swell',
  crossingSwell: 'help.crossingSwell',
  windRelationship: 'help.windRelationship',
  confidence: 'help.confidence',
  interpolated: 'help.interpolated',
} as const satisfies Readonly<Record<string, TranslationKey>>;

export type ForecastHelpKey = keyof typeof HELP_KEYS;

export function ForecastHelp({ helpKey }: { helpKey: ForecastHelpKey }) {
  const { t } = useI18n();
  const text = t(HELP_KEYS[helpKey]);
  return (
    <span
      tabIndex={0}
      role="note"
      aria-label={text}
      title={text}
      className="inline-flex cursor-help text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CircleHelp className="size-3.5" aria-hidden />
    </span>
  );
}
