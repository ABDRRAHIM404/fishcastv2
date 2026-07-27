import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fetchOpenMeteoMarine } from '@/lib/waves/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchOpenMeteoMarine', () => {
  it('uses one server request for all supported seven-day marine fields', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL) => Promise<Response>
    >(async () =>
      new Response(JSON.stringify({ current: {}, hourly: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      fetchOpenMeteoMarine(30.12345, -9.54321),
      fetchOpenMeteoMarine(30.12345, -9.54321),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get('timezone')).toBe('Africa/Casablanca');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    const hourly = new Set(url.searchParams.get('hourly')?.split(','));
    expect(hourly).toEqual(
      new Set([
        'wave_height',
        'wave_period',
        'wave_direction',
        'swell_wave_height',
        'swell_wave_period',
        'swell_wave_direction',
        'secondary_swell_wave_height',
        'secondary_swell_wave_period',
        'secondary_swell_wave_direction',
        'sea_surface_temperature',
        'ocean_current_velocity',
        'ocean_current_direction',
        'sea_level_height_msl',
      ])
    );
  });
});
