import { describe, expect, it } from 'vitest';
import { assessForecastIntegrity } from '@/lib/forecast/integrity';
import { evaluateForecast } from '@/lib/forecast/evaluate';
import { computeSafety } from '@/lib/safety/engine';
import { excellentMarine } from '@/lib/scoring/__fixtures__/marine';
import { deriveWaveMetrics } from '@/lib/waves/derived';
import type { MarineConditions } from '@/types/marine';

const SPOT = {
  id: 'spot-1',
  slug: 'sidi-rbat',
  latitude: 30.0561,
  longitude: -9.6531,
  spotType: 'beach' as const,
  difficultyLevel: 'beginner' as const,
  difficultyFactors: {
    access: 'easy',
    terrain: 'sand',
    hazards: 'low',
  },
};

function refreshWaveMetrics(marine: MarineConditions): void {
  if (marine.waves.status !== 'ok') return;
  const wave = marine.waves.data;
  wave.derived = deriveWaveMetrics({
    waveHeightM: wave.waveHeightM,
    wavePeriodS: wave.wavePeriodS,
    swellHeightM: wave.swellHeightM,
    swellDirectionDeg: wave.swellDirectionDeg,
    secondarySwellHeightM: wave.secondarySwellHeightM,
    secondarySwellDirectionDeg: wave.secondarySwellDirectionDeg,
  });
}

function safetyFor(marine: MarineConditions) {
  return computeSafety(marine, assessForecastIntegrity(marine), SPOT);
}

describe('computeSafety', () => {
  it('classifies complete benign conditions as Safe', () => {
    const result = safetyFor(excellentMarine());
    expect(result.status).toBe('Safe');
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.criticalWarnings).toEqual([]);
    expect(result.missingSafetyInputs).toEqual([]);
    expect(result.limitations.join(' ')).toContain('verify');
  });

  it('classifies warning thresholds as Caution', () => {
    const marine = excellentMarine();
    if (marine.wind.status !== 'ok') throw new Error('fixture');
    marine.wind.data.speedKmh = 30;
    const result = safetyFor(marine);
    expect(result.status).toBe('Caution');
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'strong-wind'
    );
  });

  it('keeps an Excellent fishing score separate from Dangerous safety', () => {
    const marine = excellentMarine();
    if (marine.wind.status !== 'ok') throw new Error('fixture');
    marine.wind.data.gustKmh = 65;
    const result = evaluateForecast(marine, SPOT);
    expect(result.fishing.label).toBe('Excellent');
    expect(result.safety.status).toBe('Dangerous');
    expect(result.safety.criticalWarnings.map((warning) => warning.code)).toContain(
      'dangerous-gusts'
    );
  });

  it('can classify moderate fishing quality independently as Safe', () => {
    const marine = excellentMarine();
    if (
      marine.wind.status !== 'ok' ||
      marine.waves.status !== 'ok' ||
      marine.weather.status !== 'ok'
    ) {
      throw new Error('fixture');
    }
    marine.wind.data.speedKmh = 29;
    marine.wind.data.gustKmh = 32;
    marine.waves.data.waveHeightM = 1.49;
    marine.waves.data.swellHeightM = 1.49;
    marine.waves.data.swellDirectionDeg = 180;
    marine.weather.data.precipitationMm = 4.9;
    marine.weather.data.pressureMb = 1000;
    refreshWaveMetrics(marine);
    const result = evaluateForecast(marine, SPOT);
    expect(result.fishing.label).toBe('Moderate');
    expect(result.safety.status).toBe('Safe');
  });

  it('returns Unknown rather than Safe when a primary input is missing', () => {
    const marine = excellentMarine();
    marine.waves = { status: 'error', message: 'provider unavailable' };
    const result = safetyFor(marine);
    expect(result.status).toBe('Unknown');
    expect(result.score).toBeNull();
    expect(result.missingSafetyInputs).toContain('waveHeight');
  });

  it('warns about offshore wind relative to provisional spot orientation', () => {
    const marine = excellentMarine();
    if (marine.wind.status !== 'ok') throw new Error('fixture');
    marine.wind.data.speedKmh = 25;
    marine.wind.data.directionDeg = 90;
    const result = safetyFor(marine);
    expect(result.status).toBe('Caution');
    expect(result.direction.wind).toBe('offshore');
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'offshore-wind'
    );
  });

  it('warns about long-period swell', () => {
    const marine = excellentMarine();
    if (marine.waves.status !== 'ok') throw new Error('fixture');
    marine.waves.data.waveHeightM = 0.8;
    marine.waves.data.wavePeriodS = 8;
    marine.waves.data.swellHeightM = 0.7;
    marine.waves.data.swellPeriodS = 13;
    marine.waves.data.swellDirectionDeg = 180;
    refreshWaveMetrics(marine);
    const result = safetyFor(marine);
    expect(result.status).toBe('Caution');
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'long-period-swell'
    );
  });

  it('warns when primary and secondary swell cross materially', () => {
    const marine = excellentMarine();
    if (marine.waves.status !== 'ok') throw new Error('fixture');
    marine.waves.data.swellHeightM = 0.6;
    marine.waves.data.swellDirectionDeg = 270;
    marine.waves.data.secondarySwellHeightM = 0.4;
    marine.waves.data.secondarySwellDirectionDeg = 0;
    refreshWaveMetrics(marine);
    const result = safetyFor(marine);
    expect(result.status).toBe('Caution');
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'crossing-swell'
    );
  });
});
