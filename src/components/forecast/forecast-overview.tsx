'use client';

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Fish,
  ShieldAlert,
  Waves,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ForecastDailySummary,
  ForecastPeriod,
  ForecastView,
} from '@/lib/forecast-ui/types';
import { cn } from '@/lib/utils';
import { isUrgentSafetyStatus } from '@/lib/forecast-ui/presentation';
import { useI18n } from '@/i18n/provider';
import { formatDayLabel, formatFullDate, formatMeasurement, formatPercentage, formatScore, formatTime } from '@/i18n/formatting';
import {
  confidenceStatus,
  fishingStatus,
  primarySafetyWarning,
  safetyStatus,
  seaStateStatus,
  tideStatus,
  wavePeriodBand,
  windBand,
} from '@/i18n/presentation';

interface Props {
  day: ForecastDailySummary;
  current: ForecastPeriod | null;
  freshnessMinutes: number | null;
  onOpenForecast: (view?: ForecastView, comparison?: boolean) => void;
  onOpenSpecies: () => void;
  onOpenGuide: () => void;
}

export function ForecastOverview({
  day,
  current,
  freshnessMinutes,
  onOpenForecast,
  onOpenSpecies,
  onOpenGuide,
}: Props) {
  const { locale, t } = useI18n();
  const safetyDominant = isUrgentSafetyStatus(day.safety.status);
  const qualityReason = current
    ? t('insight.qualityReason', {
        label: fishingStatus(t, current.fishing.label),
        score: formatScore(locale, current.fishing.score),
        wind: current.wind.speedKmh === null
          ? t('insight.windUnavailable')
          : t('insight.windValue', {
              value: formatMeasurement(locale, current.wind.speedKmh, 'km/h'),
            }),
        waves: current.waves.heightM === null
          ? t('insight.wavesUnavailable')
          : t('insight.wavesValue', {
              value: formatMeasurement(locale, current.waves.heightM, 'm', 1),
            }),
      })
    : t('insight.qualityUnavailable');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('overview.dateLine', {
              day: formatDayLabel(
                locale,
                day.date,
                new Date().toISOString(),
                t('common.today'),
                t('common.tomorrow')
              ),
              date: formatFullDate(locale, day.date),
            })}
          </p>
          <h2 className="font-display text-h2">{t('overview.question')}</h2>
        </div>
        <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
          {t('overview.updated', {
            age:
              freshnessMinutes === null
                ? t('common.unavailable')
                : t('conditions.age', { minutes: freshnessMinutes }),
          })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section
          className={cn(
            'rounded-xl border p-5',
            safetyDominant
              ? 'order-first border-destructive/60 bg-destructive/15 sm:col-span-2'
              : 'border-border bg-muted/10'
          )}
          aria-labelledby="overview-safety-title"
        >
          <div className="flex items-center gap-3">
            {day.safety.status === 'Safe' ? (
              <CheckCircle2 className="size-7 text-condition-good" aria-hidden />
            ) : (
              <ShieldAlert className="size-7 text-condition-poor" aria-hidden />
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t('overview.safety')}</p>
              <h3 id="overview-safety-title" className="font-display text-h2">
                {safetyStatus(t, day.safety.status)}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-base">
            {current
              ? primarySafetyWarning(t, locale, current, day.safety.status)
              : day.safety.status === 'Safe'
                ? t('overview.noWarning')
                : t('overview.safetyIncomplete')}
          </p>
        </section>

        <section className="rounded-xl border border-primary/35 bg-primary/5 p-5" aria-labelledby="overview-fishing-title">
          <p className="text-sm text-muted-foreground">{t('overview.fishingQuality')}</p>
          <h3 id="overview-fishing-title" className="mt-1 font-display text-h2">
            {formatScore(locale, day.fishing.score)} · {fishingStatus(t, day.fishing.label)}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('overview.confidence', {
              percent: formatPercentage(locale, day.confidence.completenessPercentage),
              label: confidenceStatus(t, day.confidence.label),
            })}
          </p>
          {safetyDominant ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-condition-poor">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('overview.qualityCannotOverride', {
                status: safetyStatus(t, day.safety.status),
              })}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-muted/10 p-5" aria-labelledby="overview-window-title">
          <p className="text-sm text-muted-foreground">{t('overview.bestWindow')}</p>
          <h3 id="overview-window-title" className="mt-1 font-display text-h3">
            {day.bestWindow
              ? `${formatTime(locale, day.bestWindow.start)}–${formatTime(locale, day.bestWindow.end)}`
              : t('forecast.noWindow')}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {day.bestSpecies
              ? t('overview.matchedTarget', { species: day.bestSpecies })
              : t('overview.noSpeciesMatch')}
          </p>
        </section>
      </div>

      <section aria-labelledby="current-conditions-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t('overview.atTime', {
                time: current ? formatTime(locale, current.start) : '—',
              })}
            </p>
            <h3 id="current-conditions-title" className="font-display text-h3">
              {t('overview.currentConditions')}
            </h3>
          </div>
          <Button type="button" variant="control" size="sm" onClick={() => onOpenForecast('timeline')}>
            {t('overview.openTimeline')}
          </Button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Wind className="size-4 text-primary" aria-hidden />{t('conditions.wind')}</dt>
            <dd className="mt-2 text-base font-semibold tabular-nums">{formatMeasurement(locale, current?.wind.speedKmh ?? null, 'km/h')}</dd>
            <dd className="text-sm text-muted-foreground">{windBand(t, current?.wind.speedKmh ?? null)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Waves className="size-4 text-primary" aria-hidden />{t('comparison.waves')}</dt>
            <dd className="mt-2 text-base font-semibold tabular-nums">{formatMeasurement(locale, current?.waves.heightM ?? null, 'm', 1)}</dd>
            <dd className="text-sm text-muted-foreground">{seaStateStatus(t, current?.waves.heightM ?? null, current?.waves.derived.seaState)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-sm text-muted-foreground">{t('graph.wavePeriodTitle')}</dt>
            <dd className="mt-2 text-base font-semibold tabular-nums">{formatMeasurement(locale, current?.waves.periodS ?? null, 's', 1)}</dd>
            <dd className="text-sm text-muted-foreground">{wavePeriodBand(t, current?.waves.periodS ?? null)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-sm text-muted-foreground">{t('conditions.tide')}</dt>
            <dd className="mt-2 text-base font-semibold tabular-nums">{formatMeasurement(locale, current?.tide.heightM ?? null, 'm', 2)}</dd>
            <dd className="text-sm text-muted-foreground">{tideStatus(t, current?.tide.trend ?? null)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/50 p-5" aria-labelledby="overview-meaning-title">
        <h3 id="overview-meaning-title" className="font-display text-h3">{t('overview.recommendation')}</h3>
        <p className="mt-2 text-base text-muted-foreground">{qualityReason}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('insight.confidenceLimit', {
            label: confidenceStatus(t, day.confidence.label),
            percent: formatPercentage(locale, day.confidence.completenessPercentage),
          })}
        </p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label={t('overview.actions')}>
        <Button type="button" className="min-h-12" onClick={() => onOpenForecast('table')}><CalendarDays aria-hidden />{t('overview.detailedForecast')}</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={() => onOpenForecast('graph')}><BarChart3 aria-hidden />{t('overview.viewGraphs')}</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={onOpenSpecies}><Fish aria-hidden />{t('species.title')}</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={onOpenGuide}><BookOpen aria-hidden />{t('spot.guide')}</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={() => onOpenForecast('table', true)}><Waves aria-hidden />{t('forecast.compareSpots')}</Button>
      </div>
    </div>
  );
}
