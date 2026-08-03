import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fetchOpenMeteoForecast } from '@/lib/weather/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchOpenMeteoForecast', () => {
  it('coalesces identical current weather and wind requests', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL) => Promise<Response>
    >(async () =>
      new Response(JSON.stringify({ current: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      fetchOpenMeteoForecast(30.11111, -9.22222),
      fetchOpenMeteoForecast(30.11111, -9.22222),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get('timezone')).toBe('Africa/Casablanca');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('current')).toContain('wind_speed_10m');
    expect(url.searchParams.get('current')).toContain('temperature_2m');
  });
});
