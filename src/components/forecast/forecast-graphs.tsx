'use client';

import { useState } from 'react';
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
import type {
  ForecastGraphCategory,
  ForecastPeriod,
} from '@/lib/forecast-ui/types';
import { compassLabel, directionArrowFrom } from '@/lib/forecast-ui/labels';
import { formatTimeLabel } from '@/lib/timeline/format';
import { cn } from '@/lib/utils';

const CATEGORIES: Array<{ id: ForecastGraphCategory; label: string }> = [
  { id: 'fishing', label: 'Fishing' },
  { id: 'safety', label: 'Safety' },
  { id: 'wind', label: 'Wind' },
  { id: 'waves', label: 'Waves' },
  { id: 'tide', label: 'Tide' },
  { id: 'weather', label: 'Weather' },
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

function graphData(periods: ForecastPeriod[]): GraphDatum[] {
  return periods.map((period) => ({
    time: period.start,
    label: `${period.date.slice(5)} ${formatTimeLabel(period.start)}`,
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
    visibility:
      period.weather.visibilityM === null
        ? null
        : period.weather.visibilityM / 1000,
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
}

function GraphPanel({
  title,
  unit,
  data,
  series,
  domain,
  selectedLabel,
  tideMarkers = false,
}: {
  title: string;
  unit: string;
  data: GraphDatum[];
  series: Series[];
  domain?: [number | 'auto', number | 'auto'];
  selectedLabel: string | null;
  tideMarkers?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-medium">{title}</h4>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-3 h-72 w-full sm:h-80" role="img" aria-label={`${title} forecast graph`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.5} />
            <XAxis dataKey="label" minTickGap={42} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
            <YAxis domain={domain} width={48} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            {selectedLabel ? (
              <ReferenceLine
                x={selectedLabel}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 3"
              />
            ) : null}
            {data.filter((item) => item.recommended).map((item) => (
              <ReferenceLine key={`recommended-${item.time}`} x={item.label} stroke="hsl(var(--condition-good))" strokeWidth={4} opacity={0.22} />
            ))}
            {data.filter((item) => item.dangerous).map((item) => (
              <ReferenceLine key={`danger-${item.time}`} x={item.label} stroke="hsl(var(--destructive))" strokeWidth={5} opacity={0.3} />
            ))}
            {tideMarkers ? data.filter((item) => item.tideHigh || item.tideLow).map((item) => (
              <ReferenceLine key={`tide-${item.time}`} x={item.label} stroke={item.tideHigh ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} strokeDasharray="2 2" label={{ value: item.tideHigh ? 'H' : 'L', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            )) : null}
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function panels(category: ForecastGraphCategory, data: GraphDatum[], selectedLabel: string | null) {
  const primary = 'hsl(var(--primary))';
  const accent = 'hsl(var(--accent))';
  const caution = 'hsl(var(--condition-moderate))';
  if (category === 'fishing') {
    return <GraphPanel title="Fishing quality and confidence" unit="score / percent" data={data} domain={[0, 100]} selectedLabel={selectedLabel} series={[{ key: 'score', label: 'Fishing score', color: accent }, { key: 'confidence', label: 'Completeness', color: primary }]} />;
  }
  if (category === 'safety') {
    return <GraphPanel title="Safety score" unit="score / 100" data={data} domain={[0, 100]} selectedLabel={selectedLabel} series={[{ key: 'safetyScore', label: 'Safety score', color: caution }]} />;
  }
  if (category === 'wind') {
    return <GraphPanel title="Wind and gusts" unit="km/h" data={data} selectedLabel={selectedLabel} series={[{ key: 'wind', label: 'Wind', color: primary }, { key: 'gust', label: 'Gust', color: caution }]} />;
  }
  if (category === 'waves') {
    return <div className="grid gap-3 lg:grid-cols-2"><GraphPanel title="Wave and swell height" unit="metres" data={data} selectedLabel={selectedLabel} series={[{ key: 'wave', label: 'Wave', color: primary }, { key: 'swell', label: 'Primary swell', color: accent }, { key: 'secondarySwell', label: 'Secondary swell', color: caution }]} /><GraphPanel title="Wave period" unit="seconds" data={data} selectedLabel={selectedLabel} series={[{ key: 'period', label: 'Wave period', color: primary }]} /><GraphPanel title="Estimated wave power" unit="kW/m" data={data} selectedLabel={selectedLabel} series={[{ key: 'power', label: 'Power', color: caution }]} /></div>;
  }
  if (category === 'tide') {
    return <div className="grid gap-3 lg:grid-cols-2"><GraphPanel title="Modelled sea level" unit="metres MSL" data={data} selectedLabel={selectedLabel} tideMarkers series={[{ key: 'tide', label: 'Modelled tide', color: primary }]} /><GraphPanel title="Modelled tide movement" unit="m/hour" data={data} selectedLabel={selectedLabel} tideMarkers series={[{ key: 'tideRate', label: 'Movement', color: accent }]} /></div>;
  }
  return <div className="grid gap-3 lg:grid-cols-2"><GraphPanel title="Air temperature" unit="°C" data={data} selectedLabel={selectedLabel} series={[{ key: 'temperature', label: 'Temperature', color: caution }]} /><GraphPanel title="Pressure" unit="mb" data={data} selectedLabel={selectedLabel} series={[{ key: 'pressure', label: 'Pressure', color: primary }]} /><GraphPanel title="Precipitation" unit="mm" data={data} selectedLabel={selectedLabel} series={[{ key: 'rain', label: 'Precipitation', color: accent }]} /><GraphPanel title="Visibility" unit="kilometres" data={data} selectedLabel={selectedLabel} series={[{ key: 'visibility', label: 'Visibility', color: primary }]} /></div>;
}

export function ForecastGraphs({ periods, selectedTimestamp, onSelectTimestamp }: { periods: ForecastPeriod[]; selectedTimestamp: string | null; onSelectTimestamp: (timestamp: string) => void }) {
  const [category, setCategory] = useState<ForecastGraphCategory>('fishing');
  const data = graphData(periods);
  const selectedLabel = data.find((item) => item.time === selectedTimestamp)?.label ?? null;
  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Forecast graph category">
        {CATEGORIES.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={category === item.id} onClick={() => setCategory(item.id)} className={cn('min-h-11 rounded-md px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', category === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="mb-4 block max-w-xs text-sm">
        <span className="mb-1 block text-muted-foreground">Selected graph time</span>
        <select value={selectedTimestamp && periods.some((period) => period.start === selectedTimestamp) ? selectedTimestamp : periods[0]?.start ?? ''} onChange={(event) => onSelectTimestamp(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3">
          {periods.map((period) => <option key={period.start} value={period.start}>{period.date.slice(5)} · {formatTimeLabel(period.start)}</option>)}
        </select>
      </label>
      {panels(category, data, selectedLabel)}
      {category === 'wind' ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Wind direction indicators">
          {periods.map((period) => <span key={period.start} className="min-w-20 rounded border border-border px-2 py-1 text-center text-xs"><span className="block text-muted-foreground">{formatTimeLabel(period.start)}</span>{directionArrowFrom(period.wind.directionDeg)} {compassLabel(period.wind.directionDeg)}</span>)}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Gaps are shown when source values are unavailable. Green bands mark recommended periods, red bands mark intervals containing Dangerous conditions, and the dashed cursor is the selected time. Three- and six-hour views are display aggregates; modelled tide remains an estimate, not a nautical prediction.
      </p>
      <details className="mt-3 rounded-lg border border-border/70 p-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Text alternative for selected graph time</summary>
        {periods.find((period) => period.start === selectedTimestamp) ?? periods[0] ? (() => {
          const selected = periods.find((period) => period.start === selectedTimestamp) ?? periods[0]!;
          return <dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Fishing / safety</dt><dd>{selected.fishing.score}/100 · {selected.fishing.label} / {selected.safety.status}</dd></div><div><dt className="text-muted-foreground">Wind / gust</dt><dd>{selected.wind.speedKmh?.toFixed(0) ?? '—'} / {selected.wind.gustKmh?.toFixed(0) ?? '—'} km/h</dd></div><div><dt className="text-muted-foreground">Wave / period</dt><dd>{selected.waves.heightM?.toFixed(1) ?? '—'} m / {selected.waves.periodS?.toFixed(1) ?? '—'} s</dd></div><div><dt className="text-muted-foreground">Modelled tide</dt><dd>{selected.tide.heightM?.toFixed(2) ?? '—'} m · {selected.tide.trend ?? 'Unavailable'}</dd></div></dl>;
        })() : <p className="mt-2 text-muted-foreground">No graph data is available.</p>}
      </details>
    </div>
  );
}
