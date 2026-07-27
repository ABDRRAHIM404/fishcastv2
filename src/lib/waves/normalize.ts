import 'server-only';
import type { WaveConditions } from '@/types/marine';
import type { OpenMeteoMarineResponse } from '@/lib/waves/client';
import { openMeteoTimeToIso } from '@/lib/tides/derive';
import { deriveWaveMetrics } from '@/lib/waves/derived';

function num(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Maps a raw Open-Meteo Marine payload to WaveConditions (incl. swell). */
export function normalizeWaves(raw: OpenMeteoMarineResponse): WaveConditions {
  const c = raw.current ?? {};
  const observedAt =
    c.time !== undefined
      ? openMeteoTimeToIso(c.time, raw.utc_offset_seconds ?? 0)
      : null;
  // A value without a valid provider timestamp is not a usable current
  // condition. Keep the normalizer pure and surface explicit nulls.
  const currentNumber = (value: number | undefined): number | null =>
    observedAt === null ? null : num(value);
  const waveHeightM = currentNumber(c.wave_height);
  const wavePeriodS = currentNumber(c.wave_period);
  const swellHeightM = currentNumber(c.swell_wave_height);
  const swellDirectionDeg = currentNumber(c.swell_wave_direction);
  const secondarySwellHeightM = currentNumber(c.secondary_swell_wave_height);
  const secondarySwellDirectionDeg = currentNumber(
    c.secondary_swell_wave_direction
  );
  return {
    observedAt: observedAt ?? '1970-01-01T00:00:00.000Z',
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg: currentNumber(c.wave_direction),
    swellHeightM,
    swellPeriodS: currentNumber(c.swell_wave_period),
    swellDirectionDeg,
    secondarySwellHeightM,
    secondarySwellPeriodS: currentNumber(c.secondary_swell_wave_period),
    secondarySwellDirectionDeg,
    seaSurfaceTemperatureC: currentNumber(c.sea_surface_temperature),
    oceanCurrentVelocityKmh: currentNumber(c.ocean_current_velocity),
    oceanCurrentDirectionDeg: currentNumber(c.ocean_current_direction),
    derived: deriveWaveMetrics({
      waveHeightM,
      wavePeriodS,
      swellHeightM,
      swellDirectionDeg,
      secondarySwellHeightM,
      secondarySwellDirectionDeg,
    }),
  };
}
