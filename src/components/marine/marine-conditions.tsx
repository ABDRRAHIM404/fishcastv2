'use client';

import { motion } from 'framer-motion';
import { Cloud, Wind, Waves, Droplets } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { staggerContainer } from '@/components/shared/motion';
import { MarineCard, MarineMetric } from '@/components/marine/marine-card';
import { MarineConditionsSkeleton } from '@/components/shared/skeletons';
import { useMarineConditions } from '@/hooks/use-marine-conditions';
import type {
  WeatherConditions,
  WindConditions,
  WaveConditions,
  TideConditions,
} from '@/types/marine';

function fmt(value: number | null, unit: string, digits = 0): string {
  if (value === null) return '—';
  return `${value.toFixed(digits)}${unit}`;
}

function WeatherBody({ d }: { d: WeatherConditions }) {
  return (
    <>
      <MarineMetric label="Temperature" value={fmt(d.temperatureC, '°C')} />
      <MarineMetric label="Feels like" value={fmt(d.apparentTemperatureC, '°C')} />
      <MarineMetric label="Cloud cover" value={fmt(d.cloudCoverPct, '%')} />
      <MarineMetric label="Precipitation" value={fmt(d.precipitationMm, ' mm', 1)} />
    </>
  );
}

function WindBody({ d }: { d: WindConditions }) {
  const dir =
    d.directionCompass ?? (d.directionDeg !== null ? fmt(d.directionDeg, '°') : '—');
  return (
    <>
      <MarineMetric label="Speed" value={fmt(d.speedKmh, ' km/h')} />
      <MarineMetric label="Gusts" value={fmt(d.gustKmh, ' km/h')} />
      <MarineMetric label="Direction" value={dir} />
    </>
  );
}

function WavesBody({ d }: { d: WaveConditions }) {
  return (
    <>
      <MarineMetric label="Wave height" value={fmt(d.waveHeightM, ' m', 1)} />
      <MarineMetric label="Wave period" value={fmt(d.wavePeriodS, ' s', 0)} />
      <MarineMetric label="Swell height" value={fmt(d.swellHeightM, ' m', 1)} />
      <MarineMetric label="Swell period" value={fmt(d.swellPeriodS, ' s', 0)} />
    </>
  );
}

function TideBody({ d }: { d: TideConditions }) {
  const next = d.extremes[0] ?? null;
  const nextLabel = next
    ? `${next.state === 'high' ? 'High' : 'Low'} · ${new Date(
        next.time
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '—';
  const trend =
    d.trend === 'rising' ? 'Rising' : d.trend === 'falling' ? 'Falling' : '—';
  return (
    <>
      <MarineMetric label="Height" value={fmt(d.heightM, ' m', 2)} />
      <MarineMetric label="Trend" value={trend} />
      <MarineMetric label="Next" value={nextLabel} />
    </>
  );
}

/**
 * Live marine conditions section for the spot details page. Fetches normalized
 * data via /api/marine and renders Wind / Waves / Weather / Tide cards. Data
 * display only: no scoring, no recommendations, no good/bad logic. Each card
 * degrades to an unavailable state independently.
 */
export function MarineConditionsSection({ spotId }: { spotId: string }) {
  const { state } = useMarineConditions(spotId);

  return (
    <PremiumCard className="p-6">
      <h2 className="font-display text-h3">Marine conditions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Live weather, wind, waves, and tide for this spot.
      </p>

      {state.status === 'loading' ? (
        <MarineConditionsSkeleton />
      ) : state.status === 'error' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Marine conditions are unavailable right now.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <MarineCard
            title="Weather"
            icon={<Cloud className="size-4" aria-hidden />}
            error={state.data.weather.status === 'error' ? 'err' : null}
          >
            {state.data.weather.status === 'ok' ? (
              <WeatherBody d={state.data.weather.data} />
            ) : null}
          </MarineCard>

          <MarineCard
            title="Wind"
            icon={<Wind className="size-4" aria-hidden />}
            error={state.data.wind.status === 'error' ? 'err' : null}
          >
            {state.data.wind.status === 'ok' ? (
              <WindBody d={state.data.wind.data} />
            ) : null}
          </MarineCard>

          <MarineCard
            title="Waves"
            icon={<Waves className="size-4" aria-hidden />}
            error={state.data.waves.status === 'error' ? 'err' : null}
          >
            {state.data.waves.status === 'ok' ? (
              <WavesBody d={state.data.waves.data} />
            ) : null}
          </MarineCard>

          <MarineCard
            title="Tide"
            icon={<Droplets className="size-4" aria-hidden />}
            error={state.data.tide.status === 'error' ? 'err' : null}
          >
            {state.data.tide.status === 'ok' ? (
              <TideBody d={state.data.tide.data} />
            ) : null}
          </MarineCard>
        </motion.div>
      )}
    </PremiumCard>
  );
}
