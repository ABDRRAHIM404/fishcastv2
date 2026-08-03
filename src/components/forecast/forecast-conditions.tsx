import {
  CloudSun,
  Compass,
  Database,
  Droplets,
  Gauge,
  Waves,
  Wind,
} from 'lucide-react';
import { ForecastHelp } from '@/components/forecast/forecast-help';
import {
  compassLabel,
  dataQualityLabel,
  formatValue,
  gustLabel,
  pressureTrendLabel,
  tideMovementLabel,
  waveHeightLabel,
  wavePeriodLabel,
  weatherLabel,
  windLabel,
} from '@/lib/forecast-ui/labels';
import type { ForecastPeriod } from '@/lib/forecast-ui/types';

function ConditionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Wind;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/45 p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" aria-hidden />
        <h3 className="font-display text-h3">{title}</h3>
      </div>
      <dl className="mt-4 space-y-3 text-sm">{children}</dl>
    </section>
  );
}

function Reading({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right"><span className="block font-medium tabular-nums">{value}</span>{detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}</dd>
    </div>
  );
}

export function ForecastConditions({ period, freshnessMinutes }: { period: ForecastPeriod | null; freshnessMinutes: number | null }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Selected forecast timestamp</p>
        <h2 className="font-display text-h2">Conditions and data quality</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Provider timestamps, calculated metrics and interpolated estimates are labelled separately. Onshore/offshore relationships use unverified editorial shoreline orientation.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ConditionCard icon={Wind} title="Wind">
          <Reading label="Speed" value={formatValue(period?.wind.speedKmh ?? null, ' km/h')} detail={windLabel(period?.wind.speedKmh ?? null)} />
          <Reading label="Gusts" value={formatValue(period?.wind.gustKmh ?? null, ' km/h')} detail={gustLabel(period?.wind.gustKmh ?? null)} />
          <Reading label="Direction" value={period?.wind.directionDeg === null || !period ? '—' : `${Math.round(period.wind.directionDeg)}° · ${compassLabel(period.wind.directionDeg)}`} detail={period?.wind.relationship ?? 'Relationship unavailable'} />
        </ConditionCard>
        <ConditionCard icon={Waves} title="Waves and swell">
          <Reading label="Wave" value={formatValue(period?.waves.heightM ?? null, ' m', 1)} detail={waveHeightLabel(period?.waves.heightM ?? null, period?.waves.derived.seaState)} />
          <Reading label="Period" value={formatValue(period?.waves.periodS ?? null, ' s', 1)} detail={wavePeriodLabel(period?.waves.periodS ?? null)} />
          <Reading label="Primary swell" value={formatValue(period?.waves.swellHeightM ?? null, ' m', 1)} detail={`${formatValue(period?.waves.swellPeriodS ?? null, ' s', 1)} · ${compassLabel(period?.waves.swellDirectionDeg ?? null)}`} />
          <Reading label="Secondary swell" value={formatValue(period?.waves.secondarySwellHeightM ?? null, ' m', 1)} detail={period?.waves.derived.crossingSwell ? 'Crossing-swell warning' : 'No crossing-swell warning'} />
        </ConditionCard>
        <ConditionCard icon={Droplets} title="Modelled tide">
          <Reading label="Height" value={formatValue(period?.tide.heightM ?? null, ' m', 2)} detail="Relative to modelled mean sea level" />
          <Reading label="Movement" value={period?.tide.trend ?? 'Unavailable'} detail={tideMovementLabel(period?.tide.trend ?? null, period?.tide.rateMPerHour ?? null)} />
          <Reading label="Daily range" value={formatValue(period?.tide.dailyRangeM ?? null, ' m', 2)} />
          <Reading label="Next extreme" value={period?.tide.nextExtremeState ?? 'Unavailable'} detail={period?.tide.minutesToNextExtreme === null || !period ? undefined : `${Math.floor(period.tide.minutesToNextExtreme / 60)}h ${period.tide.minutesToNextExtreme % 60}m`} />
        </ConditionCard>
        <ConditionCard icon={CloudSun} title="Weather">
          <Reading label="Temperature" value={formatValue(period?.weather.temperatureC ?? null, '°C', 1)} detail={weatherLabel(period?.weather.weatherCode ?? null)} />
          <Reading label="Pressure" value={formatValue(period?.weather.pressureMb ?? null, ' mb')} detail={pressureTrendLabel(period?.weather.pressureTrendMbPerHr ?? null)} />
          <Reading label="Rain" value={formatValue(period?.weather.precipitationMm ?? null, ' mm', 1)} />
          <Reading label="Cloud / visibility" value={`${formatValue(period?.weather.cloudCoverPct ?? null, '%')} · ${period?.weather.visibilityM === null || !period ? '—' : `${(period.weather.visibilityM / 1000).toFixed(1)} km`}`} />
        </ConditionCard>
        <ConditionCard icon={Compass} title="Sea and currents">
          <Reading label="Sea temperature" value={formatValue(period?.environment.seaSurfaceTemperatureC ?? null, '°C', 1)} />
          <Reading label="Current" value={formatValue(period?.environment.oceanCurrentVelocityKmh ?? null, ' km/h', 1)} detail={period?.environment.oceanCurrentDirectionDeg === null || !period ? 'Direction unavailable' : `${Math.round(period.environment.oceanCurrentDirectionDeg)}° towards`} />
          <Reading label="Light" value={period?.environment.daylightState.replace('-', ' ') ?? 'Unavailable'} />
          <Reading label="Wave power" value={formatValue(period?.waves.derived.estimatedPowerKwPerM ?? null, ' kW/m', 1)} detail="Calculated deep-water estimate" />
        </ConditionCard>
        <ConditionCard icon={Database} title="Data quality">
          <Reading label="Value source" value={period ? dataQualityLabel(period.dataQuality) : 'Unavailable'} />
          <Reading label="Completeness" value={period ? `${period.confidence.completenessPercentage}%` : '—'} detail={period ? `${period.confidence.label} confidence` : undefined} />
          <Reading label="Freshness" value={freshnessMinutes === null ? 'Unavailable' : `${freshnessMinutes} min ago`} />
          <Reading label="Missing inputs" value={period?.confidence.missingInputs.length ? period.confidence.missingInputs.join(', ') : 'None reported'} />
        </ConditionCard>
      </div>
      <details className="rounded-xl border border-border/70 p-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Gauge className="size-4 text-primary" aria-hidden />How to read estimates <ForecastHelp helpKey="interpolated" /></summary>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground"><p><strong className="text-foreground">Provider timestamp:</strong> aligned to a native normalized provider point.</p><p><strong className="text-foreground">Interpolated estimate:</strong> calculated between provider timestamps for continuity.</p><p><strong className="text-foreground">Unavailable:</strong> FishCast leaves the field blank rather than fabricating a value.</p><p><strong className="text-foreground">Orientation:</strong> onshore/offshore labels are provisional and require local verification.</p></div>
      </details>
    </div>
  );
}
