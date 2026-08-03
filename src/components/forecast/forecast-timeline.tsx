'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { directionArrowFrom } from '@/lib/forecast-ui/labels';
import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import { useI18n } from '@/i18n/provider';
import { formatDayLabel, formatMeasurement, formatPercentage, formatScore, formatTime } from '@/i18n/formatting';
import {
  compassDirectionLabel,
  confidenceStatus,
  dataQualityStatus,
  daylightStatus,
  fishingStatus,
  periodRecommendation,
  primarySafetyWarning,
  safetyStatus,
  tideExtremeStatus,
  tideStatus,
} from '@/i18n/presentation';

function badgeVariant(label: ForecastPeriod['fishing']['label']) {
  if (label === 'Excellent') return 'excellent' as const;
  if (label === 'Good') return 'good' as const;
  if (label === 'Moderate') return 'moderate' as const;
  return 'poor' as const;
}

export function ForecastTimeline({ periods, selectedTimestamp, onSelectTimestamp }: { periods: ForecastPeriod[]; selectedTimestamp: string | null; onSelectTimestamp: (timestamp: string) => void }) {
  const { direction, locale, t } = useI18n();
  const nowIndex = useMemo(() => Math.max(0, periods.findIndex((period) => period.markers.currentTime)), [periods]);
  const selectedIndex = periods.findIndex((period) => period.start === selectedTimestamp);
  const index = selectedIndex >= 0 ? selectedIndex : nowIndex;
  const setIndex = (nextIndex: number) => {
    const next = periods[nextIndex];
    if (next) onSelectTimestamp(next.start);
  };
  const active = periods[index] ?? periods[0];
  if (!active) return <p className="text-sm text-muted-foreground">{t('timeline.unavailable')}</p>;
  const dayLabel = formatDayLabel(locale, active.date, new Date().toISOString(), t('common.today'), t('common.tomorrow'));
  const tideDuration = active.tide.minutesToNextExtreme === null
    ? null
    : t('common.hoursMinutes', {
        hours: Math.floor(active.tide.minutesToNextExtreme / 60),
        minutes: active.tide.minutesToNextExtreme % 60,
      });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-[0.18em] text-muted-foreground">{t('timeline.title')}</p>
          <h3 className="mt-1 font-display text-h3">{dayLabel} · {formatTime(locale, active.start)}</h3>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="icon" variant="control" aria-label={t('timeline.previous')} disabled={index === 0} onClick={() => setIndex(Math.max(0, index - 1))}>{direction === 'rtl' ? <ChevronRight aria-hidden /> : <ChevronLeft aria-hidden />}</Button>
          <Button type="button" variant={active.markers.currentTime ? 'controlActive' : 'control'} aria-pressed={active.markers.currentTime} onClick={() => setIndex(nowIndex)} disabled={!periods.some((period) => period.markers.currentTime)}><LocateFixed aria-hidden />{t('common.now')}</Button>
          <Button type="button" size="icon" variant="control" aria-label={t('timeline.next')} disabled={index >= periods.length - 1} onClick={() => setIndex(Math.min(periods.length - 1, index + 1))}>{direction === 'rtl' ? <ChevronLeft aria-hidden /> : <ChevronRight aria-hidden />}</Button>
        </div>
      </div>

      <label className="block">
        <span className="sr-only">{t('timeline.select')}</span>
        <input type="range" min={0} max={Math.max(0, periods.length - 1)} value={index} onChange={(event) => setIndex(Number(event.target.value))} className="h-12 w-full cursor-pointer accent-primary" aria-valuetext={t('timeline.valueText', { day: dayLabel, time: formatTime(locale, active.start) })} dir="ltr" />
      </label>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label={t('timeline.markers')}>
        {active.markers.currentTime ? <span>● {t('timeline.currentTime')}</span> : null}
        {active.markers.sunrise ? <span>☀ {t('timeline.sunrise')}</span> : null}
        {active.markers.sunset ? <span>◐ {t('timeline.sunset')}</span> : null}
        {active.markers.tideHigh ? <span>↑ {t('timeline.modelledHigh')}</span> : null}
        {active.markers.tideLow ? <span>↓ {t('timeline.modelledLow')}</span> : null}
        {active.recommended ? <span className="text-condition-good">★ {t('timeline.recommended')}</span> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <div className="rounded-lg border border-border/70 p-4">
          <div className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{t('timeline.fishing')}</span><Badge variant={badgeVariant(active.fishing.label)}>{fishingStatus(t, active.fishing.label)}</Badge></div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatScore(locale, active.fishing.score)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{confidenceStatus(t, active.confidence.label)} · {formatPercentage(locale, active.confidence.completenessPercentage)}</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <span className="text-sm text-muted-foreground">{t('timeline.safety')}</span>
          <p className="mt-2 text-xl font-semibold">{safetyStatus(t, active.safety.status)}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{primarySafetyWarning(t, locale, active, active.safety.status)}</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <span className="text-sm text-muted-foreground">{t('timeline.wind')}</span>
          <p className="mt-2 text-xl font-semibold tabular-nums">{formatMeasurement(locale, active.wind.speedKmh, 'km/h')}</p>
          <p className="mt-1 text-xs text-muted-foreground" dir="auto">{directionArrowFrom(active.wind.directionDeg)} {compassDirectionLabel(t, active.wind.directionDeg)} · {t('timeline.gust', { value: formatMeasurement(locale, active.wind.gustKmh, 'km/h') })}</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <span className="text-sm text-muted-foreground">{t('timeline.wavesTide')}</span>
          <p className="mt-2 text-xl font-semibold tabular-nums" dir="ltr">{formatMeasurement(locale, active.waves.heightM, 'm', 1)} · {formatMeasurement(locale, active.waves.periodS, 's', 1)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('timeline.tideValue', { value: formatMeasurement(locale, active.tide.heightM, 'm', 2), trend: tideStatus(t, active.tide.trend) })}</p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border/70 bg-muted/10 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted-foreground">{t('timeline.valueSource')}</dt><dd className="mt-0.5 font-medium">{dataQualityStatus(t, active.dataQuality)}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.bestSpecies')}</dt><dd className="mt-0.5 font-medium">{active.bestSpecies ?? t('timeline.notAvailable')}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.airSeaTemperature')}</dt><dd className="mt-0.5 font-medium tabular-nums" dir="ltr">{formatMeasurement(locale, active.weather.temperatureC, '°C', 1)} / {formatMeasurement(locale, active.environment.seaSurfaceTemperatureC, '°C', 1)}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.pressureRain')}</dt><dd className="mt-0.5 font-medium tabular-nums" dir="ltr">{formatMeasurement(locale, active.weather.pressureMb, 'hPa')} / {formatMeasurement(locale, active.weather.precipitationMm, 'mm', 1)}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.primarySwell')}</dt><dd className="mt-0.5 font-medium tabular-nums" dir="auto">{formatMeasurement(locale, active.waves.swellHeightM, 'm', 1)} · {formatMeasurement(locale, active.waves.swellPeriodS, 's', 1)} · {compassDirectionLabel(t, active.waves.swellDirectionDeg)}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.wavePower')}</dt><dd className="mt-0.5 font-medium tabular-nums">{t('timeline.estimated', { value: formatMeasurement(locale, active.waves.derived.estimatedPowerKwPerM, 'kW/m', 1) })}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.nextTide')}</dt><dd className="mt-0.5 font-medium">{tideDuration ? t('timeline.nextExtremeIn', { state: tideExtremeStatus(t, active.tide.nextExtremeState), duration: tideDuration }) : t('common.unavailable')}</dd></div>
        <div><dt className="text-muted-foreground">{t('timeline.currentLight')}</dt><dd className="mt-0.5 font-medium tabular-nums">{formatMeasurement(locale, active.environment.oceanCurrentVelocityKmh, 'km/h', 1)} · {daylightStatus(t, active.environment.daylightState)}</dd></div>
      </dl>
      <p className="text-sm text-muted-foreground">{periodRecommendation(t, locale, active)}</p>
    </div>
  );
}
