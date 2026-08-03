'use client';

import { AlertTriangle, Clock3, Fish, ShieldCheck } from 'lucide-react';
import type { ForecastDailySummary, ForecastPeriod } from '@/lib/forecast-ui/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import { formatMeasurement, formatPercentage, formatScore, formatTime } from '@/i18n/formatting';
import {
  confidenceStatus,
  dataQualityStatus,
  fishingStatus,
  inputLabel,
  primarySafetyWarning,
  safetyStatus,
} from '@/i18n/presentation';

export function ForecastInsightPanel({
  day,
  selected,
}: {
  day: ForecastDailySummary;
  selected: ForecastPeriod | null;
}) {
  const { locale, t } = useI18n();
  const unsafe = day.safety.status === 'Dangerous' || day.safety.status === 'Unknown';
  const bestPeriod = day.bestWindow
    ? t('forecast.bestTime', {
        start: formatTime(locale, day.bestWindow.start),
        end: formatTime(locale, day.bestWindow.end),
      })
    : t('insight.noRecommendedDay');
  const qualityReason = selected
    ? t('insight.qualityReason', {
        label: fishingStatus(t, selected.fishing.label),
        score: formatScore(locale, selected.fishing.score),
        wind: selected.wind.speedKmh === null
          ? t('insight.windUnavailable')
          : t('insight.windValue', {
              value: formatMeasurement(locale, selected.wind.speedKmh, 'km/h'),
            }),
        waves: selected.waves.heightM === null
          ? t('insight.wavesUnavailable')
          : t('insight.wavesValue', {
              value: formatMeasurement(locale, selected.waves.heightM, 'm', 1),
            }),
      })
    : t('insight.qualityUnavailable');
  const missingData = selected?.confidence.missingInputs.length
    ? t('insight.missingInputs', {
        inputs: selected.confidence.missingInputs.map((key) => inputLabel(t, key)).join(', '),
      })
    : t('insight.noMissing');

  return (
    <aside
      className="space-y-4 min-[1750px]:sticky min-[1750px]:top-4 min-[1750px]:self-start"
      aria-label={t('insight.label')}
    >
      <div className={cn('rounded-xl border p-4', unsafe ? 'border-destructive/60 bg-destructive/15' : 'border-condition-good/30 bg-condition-good/5')}>
        <div className="flex items-center gap-2">
          {unsafe ? <AlertTriangle className="size-5 text-condition-poor" aria-hidden /> : <ShieldCheck className="size-5 text-condition-good" aria-hidden />}
          <span className="font-medium">{t('forecast.safetyHeading', { status: safetyStatus(t, day.safety.status) })}</span>
        </div>
        <p className="mt-2 text-sm">{selected ? primarySafetyWarning(t, locale, selected, day.safety.status) : day.safety.status === 'Safe' ? t('insight.noWarning') : t('safety.missingCritical')}</p>
      </div>
      <div className="rounded-xl border border-border/70 bg-card/55 p-4">
        <p className="text-sm text-muted-foreground">{t('insight.fishingQuality')}</p>
        <p className="mt-1 font-display text-h2">{formatScore(locale, day.fishing.score)}</p>
        <p className="text-sm">{fishingStatus(t, day.fishing.label)} · {t('conditions.confidence', { label: confidenceStatus(t, day.confidence.label) })}</p>
        <div className="mt-4 flex items-start gap-2 text-sm"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{bestPeriod}</span></div>
        <div className="mt-2 flex items-start gap-2 text-sm"><Fish className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{day.bestSpecies ?? t('insight.noSupportedSpecies')}</span></div>
        {selected ? (
          <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
            {t('insight.selected', {
              time: formatTime(locale, selected.start),
              score: formatScore(locale, selected.fishing.score),
              status: safetyStatus(t, selected.safety.status),
            })}
            <span className="mt-1 block">{dataQualityStatus(t, selected.dataQuality)}</span>
          </p>
        ) : null}
      </div>
      <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-border/70 bg-card/55 p-4">
        <h3 className="font-display text-h3">{t('insight.whatMeans')}</h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-medium text-primary">{t('insight.bestPeriod')}</dt><dd className="mt-0.5 text-muted-foreground">{bestPeriod}</dd></div>
          <div><dt className="font-medium text-primary">{t('insight.why')}</dt><dd className="mt-0.5 text-muted-foreground">{qualityReason}</dd></div>
          <div><dt className="font-medium text-primary">{t('insight.safety')}</dt><dd className="mt-0.5 text-muted-foreground">{selected ? primarySafetyWarning(t, locale, selected, day.safety.status) : t('insight.safetyNotAssessed')}</dd></div>
          <div><dt className="font-medium text-primary">{t('insight.dataLimits')}</dt><dd className="mt-0.5 text-muted-foreground">{missingData} {t('insight.confidenceLimit', { label: confidenceStatus(t, day.confidence.label), percent: formatPercentage(locale, day.confidence.completenessPercentage) })}</dd></div>
          <div><dt className="font-medium text-primary">{t('insight.orientation')}</dt><dd className="mt-0.5 text-muted-foreground">{t('insight.orientationLimit')}</dd></div>
        </dl>
      </div>
    </aside>
  );
}
