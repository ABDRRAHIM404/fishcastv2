import { describe, expect, it } from 'vitest';
import { assessForecastIntegrity } from '@/lib/forecast/integrity';
import { excellentMarine } from '@/lib/scoring/__fixtures__/marine';

describe('assessForecastIntegrity', () => {
  it('reports complete native provider data at high confidence', () => {
    const result = assessForecastIntegrity(excellentMarine());
    expect(result.completenessPercentage).toBe(100);
    expect(result.confidence).toBe('high');
    expect(result.missingInputs).toEqual([]);
    expect(result.missingCriticalInputs).toEqual([]);
    expect(result.forecastAgeMinutes).toBe(0);
  });

  it('distinguishes fully interpolated estimates from native anchors', () => {
    const result = assessForecastIntegrity(excellentMarine(), {
      defaultAvailability: 'interpolated',
      provenance: { daylight: 'calculated' },
    });
    expect(result.completenessPercentage).toBe(85);
    expect(result.confidence).toBe('medium');
    expect(
      result.inputs.find((input) => input.key === 'waveHeight')
    ).toMatchObject({
      availability: 'interpolated',
      provenance: 'interpolation',
    });
  });

  it('reduces confidence and identifies critical wave gaps', () => {
    const marine = excellentMarine();
    marine.waves = { status: 'error', message: 'provider unavailable' };
    const result = assessForecastIntegrity(marine);
    expect(result.confidence).toBe('low');
    expect(result.missingCriticalInputs).toEqual([
      'waveHeight',
      'wavePeriod',
    ]);
    expect(result.missingInputs).toEqual(
      expect.arrayContaining([
        'waveHeight',
        'waveDirection',
        'wavePeriod',
        'swellHeight',
        'swellDirection',
        'swellPeriod',
      ])
    );
  });

  it('preserves reasonable output when one non-critical field is absent', () => {
    const marine = excellentMarine();
    if (marine.weather.status !== 'ok') throw new Error('fixture');
    marine.weather.data.pressureMb = null;
    const result = assessForecastIntegrity(marine);
    expect(result.completenessPercentage).toBe(93);
    expect(result.missingInputs).toEqual(['pressure']);
    expect(result.missingCriticalInputs).toEqual([]);
  });

  it('marks old provider data stale and reports forecast age', () => {
    const marine = excellentMarine();
    marine.generatedAt = '2026-06-14T14:00:00.000Z';
    for (const section of [
      marine.weather,
      marine.wind,
      marine.waves,
      marine.tide,
    ]) {
      if (section.status === 'ok') {
        section.cachedAt = '2026-06-14T10:00:00.000Z';
      }
    }
    const result = assessForecastIntegrity(marine);
    expect(result.forecastAgeMinutes).toBe(240);
    expect(result.staleInputs).toContain('windSpeed');
    expect(result.staleInputs).toContain('modelledTide');
    expect(result.confidence).toBe('low');
  });
});
