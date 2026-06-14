import { describe, it, expect } from 'vitest';
import { computeScore, gradeFor } from '@/lib/scoring/engine';
import {
  excellentMarine,
  poorMarine,
  emptyMarine,
} from '@/lib/scoring/__fixtures__/marine';
import { ENABLED_FACTORS } from '@/lib/scoring/constants';

describe('computeScore', () => {
  it('scores high-quality conditions near the top of the scale', () => {
    const result = computeScore(excellentMarine());
    expect(result.percentage).toBeGreaterThanOrEqual(85);
    expect(result.overallScore).toBeGreaterThanOrEqual(8.5);
    expect(['A+', 'A']).toContain(result.grade);
  });

  it('scores poor conditions near the bottom of the scale', () => {
    const result = computeScore(poorMarine());
    expect(result.percentage).toBeLessThanOrEqual(25);
    expect(result.grade).toBe('D');
  });

  it('is deterministic: identical input yields identical output', () => {
    const a = computeScore(excellentMarine());
    const b = computeScore(excellentMarine());
    expect(a).toEqual(b);
  });

  it('returns a factor entry for every enabled factor', () => {
    const result = computeScore(excellentMarine());
    for (const key of ENABLED_FACTORS) {
      expect(result.factors.some((f) => f.key === key)).toBe(true);
    }
  });

  it('effective weights of available factors sum to ~1', () => {
    const result = computeScore(excellentMarine());
    const total = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('handles all-missing provider data: zero score, grade D, weights 0', () => {
    const result = computeScore(emptyMarine());
    expect(result.percentage).toBe(0);
    expect(result.overallScore).toBe(0);
    expect(result.grade).toBe('D');
    for (const f of result.factors) {
      expect(f.unavailable).toBe(true);
      expect(f.weight).toBe(0);
      expect(f.score).toBeNull();
    }
  });

  it('renormalizes weights when some factors are missing', () => {
    const marine = excellentMarine();
    marine.waves = { status: 'error', message: 'down' }; // drops wave + swell
    const result = computeScore(marine);
    const total = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(total).toBeCloseTo(1, 5);
    expect(result.factors.find((f) => f.key === 'wave')?.weight).toBe(0);
    expect(result.factors.find((f) => f.key === 'swell')?.weight).toBe(0);
  });

  it('keeps percentage within [0, 100] and score within [0, 10]', () => {
    for (const m of [excellentMarine(), poorMarine(), emptyMarine()]) {
      const r = computeScore(m);
      expect(r.percentage).toBeGreaterThanOrEqual(0);
      expect(r.percentage).toBeLessThanOrEqual(100);
      expect(r.overallScore).toBeGreaterThanOrEqual(0);
      expect(r.overallScore).toBeLessThanOrEqual(10);
    }
  });
});

describe('gradeFor', () => {
  it('maps percentages to the expected grade bands', () => {
    expect(gradeFor(95)).toBe('A+');
    expect(gradeFor(80)).toBe('A');
    expect(gradeFor(70)).toBe('B');
    expect(gradeFor(50)).toBe('C');
    expect(gradeFor(10)).toBe('D');
    expect(gradeFor(0)).toBe('D');
  });
});
