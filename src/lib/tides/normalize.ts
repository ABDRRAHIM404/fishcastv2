import 'server-only';
import type { TideConditions } from '@/types/marine';
import type { OpenMeteoMarineResponse } from '@/lib/waves/client';
import {
  deriveModelledTideConditions,
  toModelledSeaLevelPoints,
} from '@/lib/tides/derive';

/**
 * Maps Open-Meteo Marine's hourly modelled sea-level series to the compatible
 * TideConditions domain model. Returns null when no usable series is present.
 */
export function normalizeTides(
  raw: OpenMeteoMarineResponse,
  now: Date = new Date()
): TideConditions | null {
  const points = toModelledSeaLevelPoints(
    raw.hourly?.time,
    raw.hourly?.sea_level_height_msl,
    raw.utc_offset_seconds ?? 0
  );
  return deriveModelledTideConditions(points, now);
}
