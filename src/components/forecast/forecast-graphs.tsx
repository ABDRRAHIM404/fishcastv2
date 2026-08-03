'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastGraphCategory, ForecastPeriod } from '@/lib/forecast-ui/types';
import { Button } from '@/components/ui/button';
import { directionArrowFrom } from '@/lib/forecast-ui/labels';
import { useI18n } from '@/i18n/provider';
import { formatGraphTimestamp, formatMeasurement, formatNumber, formatPercentage, formatScore, formatTime } from '@/i18n/formatting';
import { compassDirectionLabel, fishingStatus, safetyStatus, tideStatus } from '@/i18n/presentation';
import type { Locale, TextDirection } from '@/i18n/config';
import type { TranslationKey, Translator } from '@/i18n/types';

const CATEGORIES: Array<{ id: ForecastGraphCategory; labelKey: TranslationKey }> = [
  { id: 'fishing', labelKey: 'graph.category.fishing' },
  { id: 'safety', labelKey: 'graph.category.safety' },
  { id: 'wind', labelKey: 'graph.category.wind' },
  { id: 'waves', labelKey: 'graph.category.waves' },
  { id: 'tide', labelKey: 'graph.category.tide' },
  { id: 'weather', labelKey: 'graph.category.weather' },
];

interface GraphDatum {
  time: string;
  label: string;
  score: number | null;
  confidence: number | null;
  safetyScore: number | null;
  wind: number | null;
  gust: number | null;
  wave: number | null;
  swell: number | null;
  secondarySwell: number | null;
  period: number | null;
  power: number | null;
  tide: number | null;
  tideRate: number | null;
  temperature: number | null;
  pressure: number | null;
  rain: number | null;
  visibility: number | null;
  recommended: boolean;
  dangerous: boolean;
  tideHigh: boolean;
  tideLow: boolean;
}

function graphData(periods: ForecastPeriod[], locale: Locale): GraphDatum[] {
  return periods.map((period) => ({
    time: period.start,
    label: formatGraphTimestamp(locale, period.start),
    score: period.fishing.score,
    confidence: period.confidence.completenessPercentage,
    safetyScore: period.safety.score,
    wind: period.wind.speedKmh,
    gust: period.wind.gustKmh,
    wave: period.waves.heightM,
    swell: period.waves.swellHeightM,
    secondarySwell: period.waves.secondarySwellHeightM,
    period: period.waves.periodS,
    power: period.waves.derived.estimatedPowerKwPerM,
    tide: period.tide.heightM,
    tideRate: period.tide.rateMPerHour,
    temperature: period.weather.temperatureC,
    pressure: period.weather.pressureMb,
    rain: period.weather.precipitationMm,
    visibility: period.weather.visibilityM === null ? null : period.weather.visibilityM / 1000,
    recommended: period.recommended,
    dangerous: period.safety.containsDangerous,
    tideHigh: period.markers.tideHigh,
    tideLow: period.markers.tideLow,
  }));
}

interface Series {
  key: keyof GraphDatum;
  label: string;
  color: string;
  valueKind?: 'score' | 'percentage';
  valueUnit?: string;
  digits?: number;
}

function formatSeriesValue(locale: Locale, series: Series | undefined, value: number): string {
  if (series?.valueKind === 'score') return formatScore(locale, value);
  if (series?.valueKind === 'percentage') return formatPercentage(locale, value);
  if (series?.valueUnit) return formatMeasurement(locale, value, series.valueUnit, series.digits ?? 2);
  return formatNumber(locale, value, { maximumFractionDigits: 2 });
}

function GraphPanel({
  title,
  unit,
  data,
  series,
  selectedLabel,
  direction,
  locale,
  t,
  domain,
  tideMarkers = false,
}: {
  title: string;
  unit: string;
  data: GraphDatum[];
  series: Series[];
  selectedLabel: string | null;
  direction: TextDirection;
  locale: Locale;
  t: Translator;
  domain?: [number, number];
  tideMarkers?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/45 p-3 sm:p-4" dir={direction}>
      <div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-h3">{title}</h3><span className="text-xs text-muted-foreground">{unit}</span></div>
      <div className="mt-3 h-72 w-full sm:h-80" role="img" aria-label={t('graph.forecastLabel', { title })} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 12, left: -12, bottom: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.55} />
            <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
            <YAxis domain={domain} width={48} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--popover-foreground))', direction }}
              formatter={(value, name) => {
                const numericValue = typeof value === 'number' ? value : Number(value);
                const item = series.find((candidate) => candidate.label === String(name));
                return [formatSeriesValue(locale, item, numericValue), String(name)];
              }}
            />
            {selectedLabel ? <ReferenceLine x={selectedLabel} stroke="hsl(var(--primary))" strokeDasharray="4 3" /> : null}
            {data.filter((item) => item.recommended).map((item) => <ReferenceLine key={`recommended-${item.time}`} x={item.label} stroke="hsl(var(--condition-good))" strokeWidth={4} opacity={0.22} />)}
            {data.filter((item) => item.dangerous).map((item) => <ReferenceLine key={`danger-${item.time}`} x={item.label} stroke="hsl(var(--destructive))" strokeWidth={5} opacity={0.3} />)}
            {tideMarkers ? data.filter((item) => item.tideHigh || item.tideLow).map((item) => <ReferenceLine key={`tide-${item.time}`} x={item.label} stroke={item.tideHigh ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} strokeDasharray="2 2" label={{ value: item.tideHigh ? t('graph.highShort') : t('graph.lowShort'), fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />) : null}
            {series.map((item) => <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function panels(category: ForecastGraphCategory, data: GraphDatum[], selectedLabel: string | null, locale: Locale, direction: TextDirection, t: Translator) {
  const primary = 'hsl(var(--primary))';
  const accent = 'hsl(var(--accent))';
  const caution = 'hsl(var(--condition-moderate))';
  const shared = { data, selectedLabel, locale, direction, t };
  if (category === 'fishing') return <GraphPanel {...shared} title={t('graph.fishingQuality')} unit={t('graph.unit.scorePercent')} domain={[0, 100]} series={[{ key: 'score', label: t('graph.fishingScore'), color: accent, valueKind: 'score' }, { key: 'confidence', label: t('graph.completeness'), color: primary, valueKind: 'percentage' }]} />;
  if (category === 'safety') return <GraphPanel {...shared} title={t('graph.safetyScore')} unit={t('graph.unit.score100')} domain={[0, 100]} series={[{ key: 'safetyScore', label: t('graph.safetyScore'), color: caution, valueKind: 'score' }]} />;
  if (category === 'wind') return <GraphPanel {...shared} title={t('graph.windGusts')} unit="km/h" series={[{ key: 'wind', label: t('comparison.wind'), color: primary, valueUnit: 'km/h' }, { key: 'gust', label: t('graph.gust'), color: caution, valueUnit: 'km/h' }]} />;
  if (category === 'waves') return <div className="grid gap-3 lg:grid-cols-2"><GraphPanel {...shared} title={t('graph.waveSwellHeight')} unit={t('graph.unit.metres')} series={[{ key: 'wave', label: t('graph.wave'), color: primary, valueUnit: 'm' }, { key: 'swell', label: t('graph.primarySwell'), color: accent, valueUnit: 'm' }, { key: 'secondarySwell', label: t('graph.secondarySwell'), color: caution, valueUnit: 'm' }]} /><GraphPanel {...shared} title={t('graph.wavePeriodTitle')} unit={t('graph.unit.seconds')} series={[{ key: 'period', label: t('graph.wavePeriodTitle'), color: primary, valueUnit: 's' }]} /><GraphPanel {...shared} title={t('graph.estimatedPower')} unit="kW/m" series={[{ key: 'power', label: t('graph.power'), color: caution, valueUnit: 'kW/m' }]} /></div>;
  if (category === 'tide') return <div className="grid gap-3 lg:grid-cols-2"><GraphPanel {...shared} title={t('graph.modelledSeaLevel')} unit={t('graph.unit.metresMsl')} tideMarkers series={[{ key: 'tide', label: t('graph.modelledTide'), color: primary, valueUnit: 'm' }]} /><GraphPanel {...shared} title={t('graph.tideMovement')} unit={t('graph.unit.metresHour')} tideMarkers series={[{ key: 'tideRate', label: t('graph.movement'), color: accent, valueUnit: 'm/h' }]} /></div>;
  return <div className="grid gap-3 lg:grid-cols-2"><GraphPanel {...shared} title={t('graph.airTemperature')} unit="°C" series={[{ key: 'temperature', label: t('graph.temperature'), color: caution, valueUnit: '°C' }]} /><GraphPanel {...shared} title={t('graph.pressure')} unit="hPa" series={[{ key: 'pressure', label: t('graph.pressure'), color: primary, valueUnit: 'hPa' }]} /><GraphPanel {...shared} title={t('graph.precipitation')} unit="mm" series={[{ key: 'rain', label: t('graph.precipitation'), color: accent, valueUnit: 'mm' }]} /><GraphPanel {...shared} title={t('graph.visibility')} unit={t('graph.unit.kilometres')} series={[{ key: 'visibility', label: t('graph.visibility'), color: primary, valueUnit: 'km' }]} /></div>;
}

export function ForecastGraphs({ periods, selectedTimestamp, onSelectTimestamp }: { periods: ForecastPeriod[]; selectedTimestamp: string | null; onSelectTimestamp: (timestamp: string) => void }) {
  const { direction, locale, t } = useI18n();
  const [category, setCategory] = useState<ForecastGraphCategory>('fishing');
  const data = useMemo(() => graphData(periods, locale), [locale, periods]);
  const selectedLabel = data.find((item) => item.time === selectedTimestamp)?.label ?? null;
  const selected = periods.find((period) => period.start === selectedTimestamp) ?? periods[0];
  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={t('graph.category')}>
        {CATEGORIES.map((item) => <Button key={item.id} type="button" role="tab" size="sm" variant={category === item.id ? 'controlActive' : 'control'} aria-selected={category === item.id} onClick={() => setCategory(item.id)} className="shrink-0">{t(item.labelKey)}</Button>)}
      </div>
      <label className="mb-4 block max-w-xs text-sm">
        <span className="mb-1 block text-muted-foreground">{t('graph.selectedTime')}</span>
        <select value={selectedTimestamp && periods.some((period) => period.start === selectedTimestamp) ? selectedTimestamp : periods[0]?.start ?? ''} onChange={(event) => onSelectTimestamp(event.target.value)} className="min-h-11 w-full cursor-pointer rounded-md border border-border/90 bg-card/55 px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" dir="ltr">
          {periods.map((period) => <option key={period.start} value={period.start}>{formatGraphTimestamp(locale, period.start)}</option>)}
        </select>
      </label>
      <div dir="ltr">{panels(category, data, selectedLabel, locale, direction, t)}</div>
      {category === 'wind' ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label={t('graph.windIndicators')} dir="ltr">
          {periods.map((period) => <span key={period.start} className="min-w-20 rounded border border-border px-2 py-1 text-center text-xs"><span className="block text-muted-foreground">{formatTime(locale, period.start)}</span>{directionArrowFrom(period.wind.directionDeg)} {compassDirectionLabel(t, period.wind.directionDeg)}</span>)}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">{t('graph.description')}</p>
      <details className="mt-3 rounded-lg border border-border/70 p-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('graph.textAlternative')}</summary>
        {selected ? (
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div><dt className="text-muted-foreground">{t('graph.fishingSafety')}</dt><dd>{formatScore(locale, selected.fishing.score)} · {fishingStatus(t, selected.fishing.label)} / {safetyStatus(t, selected.safety.status)}</dd></div>
            <div><dt className="text-muted-foreground">{t('graph.windGust')}</dt><dd dir="ltr">{formatMeasurement(locale, selected.wind.speedKmh, 'km/h')} / {formatMeasurement(locale, selected.wind.gustKmh, 'km/h')}</dd></div>
            <div><dt className="text-muted-foreground">{t('graph.wavePeriod')}</dt><dd dir="ltr">{formatMeasurement(locale, selected.waves.heightM, 'm', 1)} / {formatMeasurement(locale, selected.waves.periodS, 's', 1)}</dd></div>
            <div><dt className="text-muted-foreground">{t('graph.modelledTide')}</dt><dd dir="auto">{formatMeasurement(locale, selected.tide.heightM, 'm', 2)} · {tideStatus(t, selected.tide.trend)}</dd></div>
          </dl>
        ) : <p className="mt-2 text-muted-foreground">{t('graph.noData')}</p>}
      </details>
    </div>
  );
}
