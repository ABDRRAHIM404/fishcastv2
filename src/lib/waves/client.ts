import 'server-only';
import { buildUrl, fetchJson } from '@/lib/marine/http';
import { OPEN_METEO_MARINE_URL } from '@/lib/marine/constants';

/** Raw Open-Meteo Marine payload (subset). Internal only. */
export interface OpenMeteoMarineResponse {
  current?: {
    time?: string;
    wave_height?: number;
    wave_period?: number;
    wave_direction?: number;
    swell_wave_height?: number;
    swell_wave_period?: number;
    swell_wave_direction?: number;
  };
}

const CURRENT_FIELDS = [
  'wave_height',
  'wave_period',
  'wave_direction',
  'swell_wave_height',
  'swell_wave_period',
  'swell_wave_direction',
].join(',');

export async function fetchOpenMeteoMarine(
  lat: number,
  lng: number
): Promise<OpenMeteoMarineResponse> {
  const url = buildUrl(OPEN_METEO_MARINE_URL, {
    latitude: lat,
    longitude: lng,
    current: CURRENT_FIELDS,
    timezone: 'auto',
  });
  return fetchJson<OpenMeteoMarineResponse>(url);
}
