/**
 * Structured (non-prose) explanations per factor. Returns a short, fixed-format
 * string describing the measured value and qualitative band. No free-text /
 * AI generation — that belongs to a later phase.
 */
import type { FactorKey } from '@/lib/scoring/types';
import type { MarineConditions } from '@/types/marine';

function band(score: number | null): string {
  if (score === null) return 'no data';
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'moderate';
  return 'poor';
}

export function explainFactor(
  key: FactorKey,
  score: number | null,
  marine: MarineConditions
): string {
  if (score === null) return 'No data available.';
  const b = band(score);

  switch (key) {
    case 'wind': {
      if (marine.wind.status !== 'ok') return `Wind: ${b}.`;
      const s = marine.wind.data.speedKmh;
      return s === null
        ? `Wind: ${b}.`
        : `Wind ${s.toFixed(0)} km/h — ${b}.`;
    }
    case 'wave': {
      if (marine.waves.status !== 'ok') return `Waves: ${b}.`;
      const h = marine.waves.data.waveHeightM;
      return h === null
        ? `Waves: ${b}.`
        : `Wave height ${h.toFixed(1)} m — ${b}.`;
    }
    case 'swell': {
      if (marine.waves.status !== 'ok') return `Swell: ${b}.`;
      const h = marine.waves.data.swellHeightM;
      return h === null
        ? `Swell: ${b}.`
        : `Swell height ${h.toFixed(1)} m — ${b}.`;
    }
    case 'weather': {
      if (marine.weather.status !== 'ok') return `Weather: ${b}.`;
      const p = marine.weather.data.precipitationMm;
      return p === null
        ? `Weather: ${b}.`
        : `Precipitation ${p.toFixed(1)} mm — ${b}.`;
    }
    case 'tide': {
      if (marine.tide.status !== 'ok') return `Tide: ${b}.`;
      const trend = marine.tide.data.trend;
      return trend
        ? `Tide ${trend} — ${b}.`
        : `Tide slack — ${b}.`;
    }
    case 'pressure': {
      if (marine.weather.status !== 'ok') return `Pressure: ${b}.`;
      const p = marine.weather.data.pressureMb;
      return p == null
        ? `Pressure: ${b}.`
        : `Pressure ${p.toFixed(0)} mb — ${b}.`;
    }
    case 'moon': {
      if (marine.weather.status !== 'ok' && marine.tide.status !== 'ok') {
        return `Moon phase: ${b}.`;
      }
      return `Moon phase — ${b}.`;
    }
    case 'timeOfDay':
      return 'Time of day score based on dawn/dusk timing.';
  }
}
