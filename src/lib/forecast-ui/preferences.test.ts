import { describe, expect, it } from 'vitest';
import {
  FORECAST_TABLE_GROUPS,
  MOBILE_DEFAULT_EXPANDED_GROUPS,
  isForecastTableMode,
  parseForecastTablePreference,
} from '@/lib/forecast-ui/preferences';

describe('forecast table preferences', () => {
  it('uses compact progressive disclosure on mobile and detail on desktop', () => {
    expect(parseForecastTablePreference(null, 'mobile')).toEqual({
      mode: 'compact',
      expandedGroups: [...MOBILE_DEFAULT_EXPANDED_GROUPS],
    });
    expect(parseForecastTablePreference(null, 'desktop')).toEqual({
      mode: 'detailed',
      expandedGroups: [...FORECAST_TABLE_GROUPS],
    });
  });

  it('validates modes and filters invalid stored groups', () => {
    expect(isForecastTableMode('compact')).toBe(true);
    expect(isForecastTableMode('dense')).toBe(false);
    expect(
      parseForecastTablePreference(
        JSON.stringify({
          version: 1,
          mode: 'detailed',
          expandedGroups: ['fishing', 'unknown', 'tide', 'tide'],
        }),
        'mobile'
      )
    ).toEqual({ mode: 'detailed', expandedGroups: ['fishing', 'tide'] });
  });

  it('recovers safely from corrupt local storage', () => {
    expect(parseForecastTablePreference('not-json', 'mobile').mode).toBe(
      'compact'
    );
  });
});
