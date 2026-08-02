import { describe, expect, it } from 'vitest';
import {
  formatValue,
  tideMovementLabel,
  wavePeriodLabel,
  windLabel,
} from '@/lib/forecast-ui/labels';

describe('forecast number and label formatting', () => {
  it('pairs numeric values with units and deterministic plain-language labels', () => {
    expect(`${formatValue(1.4, ' m', 1)} · ${wavePeriodLabel(12)}`).toBe(
      '1.4 m · Long period'
    );
    expect(`${formatValue(14, ' km/h')} · ${windLabel(14)}`).toBe(
      '14 km/h · Moderate'
    );
    expect(tideMovementLabel('rising', 0.18)).toBe('Moderate movement');
  });

  it('uses an explicit dash for missing values', () => {
    expect(formatValue(null, ' m')).toBe('—');
    expect(wavePeriodLabel(null)).toBe('Unavailable');
  });
});

