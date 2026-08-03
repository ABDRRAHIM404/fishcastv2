'use client';

import { CloudSun, Compass, Database, Droplets, Gauge, Waves, Wind } from 'lucide-react';
import { ForecastHelp } from '@/components/forecast/forecast-help';
import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import { useI18n } from '@/i18n/provider';
import { formatMeasurement, formatNumber } from '@/i18n/formatting';
import {
  compassDirectionLabel,
  confidenceStatus,
  dataQualityStatus,
  daylightStatus,
  formatBearing,
  gustBand,
  inputLabel,
  pressureTrendStatus,
  seaStateStatus,
  tideExtremeStatus,
  tideMovementBand,
  tideStatus,
  weatherStatus,
  wavePeriodBand,
  windBand,
  windRelationshipStatus,
} from '@/i18n/presentation';

function ConditionCard({ icon: Icon, title, children }: { icon: typeof Wind; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/45 p-5">
      <div className="flex items-center gap-2"><Icon className="size-5 text-primary" aria-hidden /><h3 className="font-display text-h3">{title}</h3></div>
      <dl className="mt-4 space-y-3 text-sm">{children}</dl>
    </section>
  );
}

function Reading({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end"><span className="block font-medium tabular-nums" dir="auto">{value}</span>{detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}</dd>
    </div>
  );
}

export function ForecastConditions({ period, freshnessMinutes }: { period: ForecastPeriod | null; freshnessMinutes: number | null }) {
  const { locale, t } = useI18n();
  const nextExtremeDuration = period?.tide.minutesToNextExtreme === null || !period
    ? undefined
    : t('common.hoursMinutes', {
        hours: Math.floor(period.tide.minutesToNextExtreme / 60),
        minutes: period.tide.minutesToNextExtreme % 60,
      });
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{t('conditions.selectedTimestamp')}</p>
        <h2 className="font-display text-h2">{t('conditions.title')}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t('conditions.description')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ConditionCard icon={Wind} title={t('conditions.wind')}>
          <Reading label={t('conditions.speed')} value={formatMeasurement(locale, period?.wind.speedKmh ?? null, 'km/h')} detail={windBand(t, period?.wind.speedKmh ?? null)} />
          <Reading label={t('conditions.gusts')} value={formatMeasurement(locale, period?.wind.gustKmh ?? null, 'km/h')} detail={gustBand(t, period?.wind.gustKmh ?? null)} />
          <Reading label={t('conditions.direction')} value={period?.wind.directionDeg === null || !period ? '—' : `${formatBearing(locale, period.wind.directionDeg)} · ${compassDirectionLabel(t, period.wind.directionDeg)}`} detail={period ? windRelationshipStatus(t, period.wind.relationship) : t('conditions.relationshipUnavailable')} />
        </ConditionCard>
        <ConditionCard icon={Waves} title={t('conditions.waves')}>
          <Reading label={t('conditions.wave')} value={formatMeasurement(locale, period?.waves.heightM ?? null, 'm', 1)} detail={seaStateStatus(t, period?.waves.heightM ?? null, period?.waves.derived.seaState)} />
          <Reading label={t('conditions.period')} value={formatMeasurement(locale, period?.waves.periodS ?? null, 's', 1)} detail={wavePeriodBand(t, period?.waves.periodS ?? null)} />
          <Reading label={t('conditions.primarySwell')} value={formatMeasurement(locale, period?.waves.swellHeightM ?? null, 'm', 1)} detail={`${formatMeasurement(locale, period?.waves.swellPeriodS ?? null, 's', 1)} · ${compassDirectionLabel(t, period?.waves.swellDirectionDeg ?? null)}`} />
          <Reading label={t('conditions.secondarySwell')} value={formatMeasurement(locale, period?.waves.secondarySwellHeightM ?? null, 'm', 1)} detail={period?.waves.derived.crossingSwell ? t('conditions.crossingWarning') : t('conditions.noCrossingWarning')} />
        </ConditionCard>
        <ConditionCard icon={Droplets} title={t('conditions.tide')}>
          <Reading label={t('conditions.height')} value={formatMeasurement(locale, period?.tide.heightM ?? null, 'm', 2)} detail={t('conditions.relativeMsl')} />
          <Reading label={t('conditions.movement')} value={tideStatus(t, period?.tide.trend ?? null)} detail={tideMovementBand(t, period?.tide.trend ?? null, period?.tide.rateMPerHour ?? null)} />
          <Reading label={t('conditions.dailyRange')} value={formatMeasurement(locale, period?.tide.dailyRangeM ?? null, 'm', 2)} />
          <Reading label={t('conditions.nextExtreme')} value={tideExtremeStatus(t, period?.tide.nextExtremeState ?? null)} detail={nextExtremeDuration} />
        </ConditionCard>
        <ConditionCard icon={CloudSun} title={t('conditions.weather')}>
          <Reading label={t('conditions.temperature')} value={formatMeasurement(locale, period?.weather.temperatureC ?? null, '°C', 1)} detail={weatherStatus(t, period?.weather.weatherCode ?? null)} />
          <Reading label={t('conditions.pressure')} value={formatMeasurement(locale, period?.weather.pressureMb ?? null, 'hPa')} detail={pressureTrendStatus(t, period?.weather.pressureTrendMbPerHr ?? null)} />
          <Reading label={t('conditions.rain')} value={formatMeasurement(locale, period?.weather.precipitationMm ?? null, 'mm', 1)} />
          <Reading label={t('conditions.cloudVisibility')} value={`${formatMeasurement(locale, period?.weather.cloudCoverPct ?? null, '%')} · ${period?.weather.visibilityM === null || !period ? '—' : formatMeasurement(locale, period.weather.visibilityM / 1000, 'km', 1)}`} />
        </ConditionCard>
        <ConditionCard icon={Compass} title={t('conditions.seaCurrents')}>
          <Reading label={t('conditions.seaTemperature')} value={formatMeasurement(locale, period?.environment.seaSurfaceTemperatureC ?? null, '°C', 1)} />
          <Reading label={t('conditions.current')} value={formatMeasurement(locale, period?.environment.oceanCurrentVelocityKmh ?? null, 'km/h', 1)} detail={period?.environment.oceanCurrentDirectionDeg === null || !period ? t('conditions.directionUnavailable') : t('conditions.towards', { degrees: formatNumber(locale, Math.round(period.environment.oceanCurrentDirectionDeg)) })} />
          <Reading label={t('conditions.light')} value={period ? daylightStatus(t, period.environment.daylightState) : t('common.unavailable')} />
          <Reading label={t('conditions.wavePower')} value={formatMeasurement(locale, period?.waves.derived.estimatedPowerKwPerM ?? null, 'kW/m', 1)} detail={t('conditions.deepWaterEstimate')} />
        </ConditionCard>
        <ConditionCard icon={Database} title={t('conditions.dataQuality')}>
          <Reading label={t('conditions.valueSource')} value={period ? dataQualityStatus(t, period.dataQuality) : t('common.unavailable')} />
          <Reading label={t('conditions.completeness')} value={period ? formatMeasurement(locale, period.confidence.completenessPercentage, '%') : '—'} detail={period ? t('conditions.confidence', { label: confidenceStatus(t, period.confidence.label) }) : undefined} />
          <Reading label={t('conditions.freshness')} value={freshnessMinutes === null ? t('common.unavailable') : t('conditions.age', { minutes: freshnessMinutes })} />
          <Reading label={t('conditions.missingInputs')} value={period?.confidence.missingInputs.length ? period.confidence.missingInputs.map((key) => inputLabel(t, key)).join(', ') : t('common.none')} />
        </ConditionCard>
      </div>
      <details className="rounded-xl border border-border/70 p-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Gauge className="size-4 text-primary" aria-hidden />{t('conditions.readEstimates')} <ForecastHelp helpKey="interpolated" /></summary>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">{t('conditions.providerTimestamp')}:</strong> {t('conditions.providerTimestampHelp')}</p>
          <p><strong className="text-foreground">{t('conditions.interpolated')}:</strong> {t('conditions.interpolatedHelp')}</p>
          <p><strong className="text-foreground">{t('common.unavailable')}:</strong> {t('conditions.unavailableHelp')}</p>
          <p><strong className="text-foreground">{t('insight.orientation')}:</strong> {t('conditions.orientationHelp')}</p>
        </div>
      </details>
    </div>
  );
}
