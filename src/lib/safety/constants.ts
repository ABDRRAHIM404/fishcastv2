/** Conservative, reviewable coastal shore-fishing thresholds. */
export const SAFETY_THRESHOLDS = {
  waveHeightM: { caution: 1.5, dangerous: 2.5 },
  wavePeriodS: { long: 12, dangerous: 15 },
  swellHeightM: { caution: 1.5, dangerous: 2.5 },
  wavePowerKwPerM: { caution: 12, dangerous: 25 },
  waveSteepness: { caution: 0.045, dangerous: 0.065 },
  windSpeedKmh: { caution: 30, dangerous: 45 },
  windGustKmh: { caution: 45, dangerous: 60 },
  offshoreWindKmh: { caution: 20, dangerous: 35 },
  precipitationMm: { caution: 5, dangerous: 10 },
  visibilityM: { caution: 3000, dangerous: 1000 },
  tidalRangeM: { caution: 2.2, dangerous: 3.2 },
} as const;

export const THUNDERSTORM_CODES = new Set([95, 96, 99]);

