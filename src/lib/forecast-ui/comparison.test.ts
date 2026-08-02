import { describe, expect, it } from 'vitest';
import { sortComparisonItems } from '@/lib/forecast-ui/comparison';
import type { ForecastComparisonItem } from '@/lib/forecast-ui/types';
import type { SafetyStatus } from '@/lib/safety/types';

function item(
  name: string,
  status: SafetyStatus,
  score: number,
  completeness = 100
): ForecastComparisonItem {
  return {
    spot: { id: name, slug: name, name, displayName: name },
    timestamp: '2026-08-02T12:00:00.000Z',
    fishing: {
      score,
      scoreOutOfTen: score / 10,
      label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Moderate',
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
    },
    safety: {
      score: status === 'Unknown' ? null : 80,
      status,
      warnings: [],
      primaryWarning: null,
      containsDangerous: status === 'Dangerous',
    },
    waveHeightM: 1,
    wavePeriodS: 9,
    windSpeedKmh: 12,
    windRelationship: 'cross-shore',
    confidence: {
      completenessPercentage: completeness,
      label: completeness >= 90 ? 'high' : 'medium',
      missingInputs: [],
      missingCriticalInputs: [],
      forecastAgeMinutes: 10,
    },
    bestWindow: null,
  };
}

describe('spot comparison ordering', () => {
  it('ranks safety before fishing quality, then completeness', () => {
    const sorted = sortComparisonItems([
      item('danger-high-score', 'Dangerous', 95),
      item('safe-low-score', 'Safe', 60),
      item('safe-high-score', 'Safe', 80, 70),
      item('caution', 'Caution', 90),
    ]);
    expect(sorted.map((entry) => entry.spot.id)).toEqual([
      'safe-high-score',
      'safe-low-score',
      'caution',
      'danger-high-score',
    ]);
  });
});

