import 'server-only';
import type { WaveConditions } from '@/types/marine';
import type { OpenMeteoMarineResponse } from '@/lib/waves/client';

function num(value: number | undefined): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/** Maps a raw Open-Meteo Marine payload to WaveConditions (incl. swell). */
export function normalizeWaves(raw: OpenMeteoMarineResponse): WaveConditions {
  const c = raw.current ?? {};
  return {
    observedAt: c.time ?? new Date().toISOString(),
    waveHeightM: num(c.wave_height),
    wavePeriodS: num(c.wave_period),
    waveDirectionDeg: num(c.wave_direction),
    swellHeightM: num(c.swell_wave_height),
    swellPeriodS: num(c.swell_wave_period),
    swellDirectionDeg: num(c.swell_wave_direction),
  };
}
