/**
 * Pure, deterministic species suitability engine. Cross-references a species'
 * preferred_conditions against the current normalized MarineConditions and
 * decides whether the species is "favored now".
 *
 * Rules:
 *  - Only evaluates fields PRESENT in preferred_conditions (never invents data).
 *  - A constraint passes when the live datum satisfies it; if the required live
 *    datum is unavailable, that constraint is treated as NOT met (so we never
 *    over-promise).
 *  - `favored` is true only when at least one constraint is specified AND every
 *    specified constraint is met.
 *  - No I/O, no randomness.
 */
import type { PreferredConditions } from '@/types/species';
import type { MarineConditions } from '@/types/marine';

export interface SuitabilityResult {
  favored: boolean;
  reason: string | null;
}

/** Derives a coarse time-of-day bucket from an hour (local). */
export function timeOfDayBucket(hour: number): string {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

/**
 * Evaluates suitability. `now` is injectable for deterministic tests.
 */
export function evaluateSuitability(
  pc: PreferredConditions | null,
  marine: MarineConditions,
  now: Date = new Date()
): SuitabilityResult {
  if (!pc) return { favored: false, reason: null };

  const reasons: string[] = [];
  let constraints = 0;
  let allMet = true;

  // Tide state
  if (typeof pc.tide_state === 'string' && pc.tide_state.length > 0) {
    constraints++;
    const tide = marine.tide.status === 'ok' ? marine.tide.data : null;
    const want = pc.tide_state.toLowerCase();
    let met = false;
    if (tide) {
      if (want === 'rising' || want === 'falling') {
        met = tide.trend === want;
      } else if (want === 'high' || want === 'low') {
        // Approximate: nearest upcoming extreme matches the desired state.
        met = tide.extremes[0]?.state === want;
      }
    }
    if (met) reasons.push(`${want} tide`);
    else allMet = false;
  }

  // Wind ceiling
  if (typeof pc.wind_max_kmh === 'number') {
    constraints++;
    const wind = marine.wind.status === 'ok' ? marine.wind.data : null;
    const met =
      wind?.speedKmh !== null &&
      wind?.speedKmh !== undefined &&
      wind.speedKmh <= pc.wind_max_kmh;
    if (met) reasons.push(`light wind`);
    else allMet = false;
  }

  // Wave ceiling
  if (typeof pc.wave_max_m === 'number') {
    constraints++;
    const waves = marine.waves.status === 'ok' ? marine.waves.data : null;
    const met =
      waves?.waveHeightM !== null &&
      waves?.waveHeightM !== undefined &&
      waves.waveHeightM <= pc.wave_max_m;
    if (met) reasons.push(`calm seas`);
    else allMet = false;
  }

  // Time of day
  if (Array.isArray(pc.time_of_day) && pc.time_of_day.length > 0) {
    constraints++;
    const bucket = timeOfDayBucket(now.getHours());
    const met = pc.time_of_day.map((t) => t.toLowerCase()).includes(bucket);
    if (met) reasons.push(bucket);
    else allMet = false;
  }

  if (constraints === 0) return { favored: false, reason: null };

  const favored = allMet;
  return {
    favored,
    reason: favored && reasons.length > 0 ? reasons.join(', ') : null,
  };
}
