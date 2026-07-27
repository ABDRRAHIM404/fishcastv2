import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { normalizeWaves } from '@/lib/waves/normalize';

describe('normalizeWaves', () => {
  it('defensively maps every supported Open-Meteo current field', () => {
    const result = normalizeWaves({
      utc_offset_seconds: 3600,
      current: {
        time: 1_781_434_800,
        wave_height: 0.8,
        wave_period: 9,
        wave_direction: 275,
        swell_wave_height: 0.7,
        swell_wave_period: 11,
        swell_wave_direction: 280,
        secondary_swell_wave_height: 0.3,
        secondary_swell_wave_period: 7,
        secondary_swell_wave_direction: 10,
        sea_surface_temperature: 20.5,
        ocean_current_velocity: 0.6,
        ocean_current_direction: 185,
      },
    });
    expect(result).toMatchObject({
      // Unix provider timestamps are already absolute; response offsets do not
      // get applied a second time.
      observedAt: '2026-06-14T11:00:00.000Z',
      waveHeightM: 0.8,
      wavePeriodS: 9,
      waveDirectionDeg: 275,
      swellHeightM: 0.7,
      swellPeriodS: 11,
      swellDirectionDeg: 280,
      secondarySwellHeightM: 0.3,
      secondarySwellPeriodS: 7,
      secondarySwellDirectionDeg: 10,
      seaSurfaceTemperatureC: 20.5,
      oceanCurrentVelocityKmh: 0.6,
      oceanCurrentDirectionDeg: 185,
    });
    expect(result.derived.estimatedWavelengthM).not.toBeNull();
  });

  it('turns unsupported or non-finite values into explicit nulls', () => {
    const result = normalizeWaves({
      current: {
        time: 1_781_434_800,
        wave_height: Number.NaN,
        wave_period: Number.POSITIVE_INFINITY,
      },
    });
    expect(result.waveHeightM).toBeNull();
    expect(result.wavePeriodS).toBeNull();
    expect(result.secondarySwellHeightM).toBeNull();
    expect(result.derived.seaState).toBe('unknown');
  });

  it('does not accept current values without a valid provider timestamp', () => {
    const result = normalizeWaves({
      current: { wave_height: 0.4, wave_period: 8 },
    });
    expect(result.observedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(result.waveHeightM).toBeNull();
    expect(result.wavePeriodS).toBeNull();
  });
});
