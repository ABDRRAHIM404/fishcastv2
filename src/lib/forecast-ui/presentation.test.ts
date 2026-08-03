import { describe, expect, it } from 'vitest';
import { isUrgentSafetyStatus } from '@/lib/forecast-ui/presentation';

describe('forecast safety presentation', () => {
  it('keeps Dangerous and Unknown states urgent above detailed ordering', () => {
    expect(isUrgentSafetyStatus('Dangerous')).toBe(true);
    expect(isUrgentSafetyStatus('Unknown')).toBe(true);
    expect(isUrgentSafetyStatus('Caution')).toBe(false);
    expect(isUrgentSafetyStatus('Safe')).toBe(false);
  });
});

