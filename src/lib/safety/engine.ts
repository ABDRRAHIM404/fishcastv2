import type { ForecastIntegrity, ForecastInputKey } from '@/types/forecast';
import type { MarineConditions } from '@/types/marine';
import {
  getSpotExposure,
  interpretDirections,
} from '@/lib/spots/exposure';
import { SAFETY_THRESHOLDS, THUNDERSTORM_CODES } from '@/lib/safety/constants';
import type {
  SafetyResult,
  SafetySpotInput,
  SafetyWarning,
} from '@/lib/safety/types';

const PRIMARY_SAFETY_INPUTS: ForecastInputKey[] = [
  'windSpeed',
  'waveHeight',
];
const REQUIRED_SAFETY_INPUTS: ForecastInputKey[] = [
  'windSpeed',
  'windGusts',
  'windDirection',
  'waveHeight',
  'wavePeriod',
  'swellHeight',
  'swellDirection',
  'modelledTide',
  'weather',
  'daylight',
];

function addWarning(
  warnings: SafetyWarning[],
  code: string,
  severity: SafetyWarning['severity'],
  message: string
): void {
  if (warnings.some((warning) => warning.code === code)) return;
  warnings.push({ code, severity, message });
}

function statusExplanation(
  status: SafetyResult['status'],
  criticalCount: number,
  missingCount: number
): string {
  if (status === 'Dangerous') {
    return `${criticalCount} critical safety warning${
      criticalCount === 1 ? '' : 's'
    } detected. Do not rely on the fishing-quality score.`;
  }
  if (status === 'Unknown') {
    return 'Primary marine safety data is missing, so conditions cannot be classified safely.';
  }
  if (status === 'Caution') {
    return missingCount > 0
      ? 'Proceed cautiously: some safety inputs are missing or conditions require extra care.'
      : 'Conditions require extra care; review every warning before fishing.';
  }
  return 'No configured safety threshold is currently triggered. Continue normal coastal precautions.';
}

/** Pure safety evaluator. Fishing quality is intentionally not an input. */
export function computeSafety(
  marine: MarineConditions,
  integrity: ForecastIntegrity,
  spot: SafetySpotInput
): SafetyResult {
  const wind = marine.wind.status === 'ok' ? marine.wind.data : null;
  const waves = marine.waves.status === 'ok' ? marine.waves.data : null;
  const weather = marine.weather.status === 'ok' ? marine.weather.data : null;
  const tide = marine.tide.status === 'ok' ? marine.tide.data : null;
  const astronomy =
    marine.astronomy?.status === 'ok' ? marine.astronomy.data : null;
  const exposure = getSpotExposure(spot.slug);
  const direction = interpretDirections(
    wind?.directionDeg ?? null,
    waves?.swellDirectionDeg ?? waves?.waveDirectionDeg ?? null,
    exposure
  );
  const warnings: SafetyWarning[] = [];

  if (waves?.waveHeightM !== null && waves?.waveHeightM !== undefined) {
    if (waves.waveHeightM >= SAFETY_THRESHOLDS.waveHeightM.dangerous) {
      addWarning(
        warnings,
        'dangerous-wave-height',
        'critical',
        `Estimated wave height ${waves.waveHeightM.toFixed(1)} m exceeds the dangerous threshold.`
      );
    } else if (waves.waveHeightM >= SAFETY_THRESHOLDS.waveHeightM.caution) {
      addWarning(
        warnings,
        'elevated-wave-height',
        'warning',
        `Estimated wave height ${waves.waveHeightM.toFixed(1)} m requires caution.`
      );
    }
  }

  const longestWavePeriod =
    waves &&
    (waves.wavePeriodS !== null || waves.swellPeriodS !== null)
      ? Math.max(waves.wavePeriodS ?? 0, waves.swellPeriodS ?? 0)
      : null;
  if (longestWavePeriod !== null) {
    const significantHeight = Math.max(
      waves?.waveHeightM ?? 0,
      waves?.swellHeightM ?? 0
    );
    if (
      longestWavePeriod >= SAFETY_THRESHOLDS.wavePeriodS.dangerous &&
      significantHeight >= 1
    ) {
      addWarning(
        warnings,
        'long-period-swell',
        'critical',
        `Long-period waves (${longestWavePeriod.toFixed(0)} s) can produce powerful surges.`
      );
    } else if (
      longestWavePeriod >= SAFETY_THRESHOLDS.wavePeriodS.long &&
      significantHeight >= 0.7
    ) {
      addWarning(
        warnings,
        'long-period-swell',
        'warning',
        `Long-period waves (${longestWavePeriod.toFixed(0)} s) may surge farther ashore.`
      );
    }
  }

  if (waves?.swellHeightM !== null && waves?.swellHeightM !== undefined) {
    if (waves.swellHeightM >= SAFETY_THRESHOLDS.swellHeightM.dangerous) {
      addWarning(
        warnings,
        'dangerous-swell-height',
        'critical',
        `Swell height ${waves.swellHeightM.toFixed(1)} m exceeds the dangerous threshold.`
      );
    } else if (
      waves.swellHeightM >= SAFETY_THRESHOLDS.swellHeightM.caution
    ) {
      addWarning(
        warnings,
        'elevated-swell-height',
        'warning',
        `Swell height ${waves.swellHeightM.toFixed(1)} m requires caution.`
      );
    } else if (
      direction.swell === 'head-on' &&
      waves.swellHeightM >= 1.2
    ) {
      addWarning(
        warnings,
        'head-on-swell',
        'warning',
        'The provisional exposure model indicates swell arriving head-on.'
      );
    }
  }

  const power = waves?.derived.estimatedPowerKwPerM ?? null;
  if (power !== null) {
    if (power >= SAFETY_THRESHOLDS.wavePowerKwPerM.dangerous) {
      addWarning(
        warnings,
        'high-wave-power',
        'critical',
        `Estimated wave-power indicator ${power.toFixed(1)} kW/m is very high.`
      );
    } else if (power >= SAFETY_THRESHOLDS.wavePowerKwPerM.caution) {
      addWarning(
        warnings,
        'elevated-wave-power',
        'warning',
        `Estimated wave-power indicator ${power.toFixed(1)} kW/m is elevated.`
      );
    }
  }

  const steepness = waves?.derived.estimatedSteepness ?? null;
  if (steepness !== null) {
    if (steepness >= SAFETY_THRESHOLDS.waveSteepness.dangerous) {
      addWarning(
        warnings,
        'steep-waves',
        'critical',
        'Estimated wave steepness indicates a very steep, unstable sea state.'
      );
    } else if (steepness >= SAFETY_THRESHOLDS.waveSteepness.caution) {
      addWarning(
        warnings,
        'steep-waves',
        'warning',
        'Estimated wave steepness indicates choppy or unstable conditions.'
      );
    }
  }

  if (waves?.derived.crossingSwell) {
    const severe =
      (waves.secondarySwellHeightM ?? 0) >= 1 &&
      (waves.swellHeightM ?? 0) >= 1.5;
    addWarning(
      warnings,
      'crossing-swell',
      severe ? 'critical' : 'warning',
      `Primary and secondary swell cross at approximately ${(
        waves.derived.crossingAngleDeg ?? 0
      ).toFixed(0)}°.`
    );
  }

  if (wind?.speedKmh !== null && wind?.speedKmh !== undefined) {
    if (wind.speedKmh >= SAFETY_THRESHOLDS.windSpeedKmh.dangerous) {
      addWarning(
        warnings,
        'strong-wind',
        'critical',
        `Wind ${wind.speedKmh.toFixed(0)} km/h exceeds the dangerous threshold.`
      );
    } else if (wind.speedKmh >= SAFETY_THRESHOLDS.windSpeedKmh.caution) {
      addWarning(
        warnings,
        'strong-wind',
        'warning',
        `Wind ${wind.speedKmh.toFixed(0)} km/h requires caution.`
      );
    }

    if (direction.wind === 'offshore') {
      if (wind.speedKmh >= SAFETY_THRESHOLDS.offshoreWindKmh.dangerous) {
        addWarning(
          warnings,
          'offshore-wind',
          'critical',
          'The provisional exposure model indicates strong offshore wind that can carry people or equipment away from shore.'
        );
      } else if (
        wind.speedKmh >= SAFETY_THRESHOLDS.offshoreWindKmh.caution
      ) {
        addWarning(
          warnings,
          'offshore-wind',
          'warning',
          'The provisional exposure model indicates offshore wind that can carry people or equipment away from shore.'
        );
      }
    }
  }

  if (wind?.gustKmh !== null && wind?.gustKmh !== undefined) {
    if (wind.gustKmh >= SAFETY_THRESHOLDS.windGustKmh.dangerous) {
      addWarning(
        warnings,
        'dangerous-gusts',
        'critical',
        `Gusts ${wind.gustKmh.toFixed(0)} km/h exceed the dangerous threshold.`
      );
    } else if (wind.gustKmh >= SAFETY_THRESHOLDS.windGustKmh.caution) {
      addWarning(
        warnings,
        'strong-gusts',
        'warning',
        `Gusts ${wind.gustKmh.toFixed(0)} km/h require caution.`
      );
    }
  }

  if (weather?.weatherCode !== null && weather?.weatherCode !== undefined) {
    if (THUNDERSTORM_CODES.has(weather.weatherCode)) {
      addWarning(
        warnings,
        'thunderstorm',
        'critical',
        'Thunderstorm conditions are indicated. Leave exposed coastal areas.'
      );
    }
  }

  if (
    weather?.precipitationMm !== null &&
    weather?.precipitationMm !== undefined
  ) {
    if (
      weather.precipitationMm >=
      SAFETY_THRESHOLDS.precipitationMm.dangerous
    ) {
      addWarning(
        warnings,
        'heavy-rain',
        'critical',
        'Heavy rain can reduce footing, visibility and safe access.'
      );
    } else if (
      weather.precipitationMm >=
      SAFETY_THRESHOLDS.precipitationMm.caution
    ) {
      addWarning(
        warnings,
        'heavy-rain',
        'warning',
        'Rain may reduce footing, visibility and safe access.'
      );
    }
  }

  if (weather?.visibilityM !== null && weather?.visibilityM !== undefined) {
    if (weather.visibilityM <= SAFETY_THRESHOLDS.visibilityM.dangerous) {
      addWarning(
        warnings,
        'poor-visibility',
        'critical',
        `Visibility is approximately ${Math.round(weather.visibilityM)} m.`
      );
    } else if (
      weather.visibilityM <= SAFETY_THRESHOLDS.visibilityM.caution
    ) {
      addWarning(
        warnings,
        'reduced-visibility',
        'warning',
        `Visibility is reduced to approximately ${Math.round(
          weather.visibilityM
        )} m.`
      );
    }
  }

  if (tide?.dailyRangeM !== null && tide?.dailyRangeM !== undefined) {
    if (tide.dailyRangeM >= SAFETY_THRESHOLDS.tidalRangeM.dangerous) {
      addWarning(
        warnings,
        'large-tidal-range',
        'critical',
        'The modelled daily tidal range is unusually large.'
      );
    } else if (
      tide.dailyRangeM >= SAFETY_THRESHOLDS.tidalRangeM.caution
    ) {
      addWarning(
        warnings,
        'large-tidal-range',
        'warning',
        'The modelled daily tidal range may alter access and currents quickly.'
      );
    }
  }
  if (
    tide?.trend === 'rising' &&
    tide.minutesToNextExtreme !== null &&
    tide.minutesToNextExtreme <= 60 &&
    (tide.dailyRangeM ?? 0) >= 1.5
  ) {
    addWarning(
      warnings,
      'rising-tide-access',
      'warning',
      'A rising modelled tide near high water may reduce exit routes and rock-platform clearance.'
    );
  }

  if (
    astronomy?.daylightState === 'night' &&
    (spot.spotType === 'rocks' ||
      spot.difficultyLevel === 'advanced' ||
      spot.difficultyLevel === 'expert')
  ) {
    addWarning(
      warnings,
      'difficult-terrain-at-night',
      'warning',
      'Night conditions compound the spot’s terrain and access difficulty.'
    );
  }

  const hazardText = Object.values(spot.difficultyFactors ?? {})
    .join(' ')
    .toLowerCase();
  if (
    spot.spotType === 'rocks' ||
    /swell|current|exposure|hard/.test(hazardText)
  ) {
    addWarning(
      warnings,
      'static-spot-hazard',
      'warning',
      'Static spot hazards require local knowledge and conservative positioning.'
    );
  }

  const unavailable = new Set([
    ...integrity.missingInputs,
    ...integrity.staleInputs,
  ]);
  const missingSafetyInputs = REQUIRED_SAFETY_INPUTS.filter((key) =>
    unavailable.has(key)
  );
  const primaryMissing = PRIMARY_SAFETY_INPUTS.some((key) =>
    unavailable.has(key)
  );
  const criticalWarnings = warnings.filter(
    (warning) => warning.severity === 'critical'
  );

  let status: SafetyResult['status'];
  if (criticalWarnings.length > 0) status = 'Dangerous';
  else if (primaryMissing) status = 'Unknown';
  else if (warnings.length > 0 || missingSafetyInputs.length > 0) {
    status = 'Caution';
  } else {
    status = 'Safe';
  }

  const warningPenalty = warnings.reduce(
    (sum, warning) => sum + (warning.severity === 'critical' ? 35 : 12),
    0
  );
  const missingPenalty = missingSafetyInputs.length * 5;
  const rawScore = Math.max(
    0,
    Math.min(100, 100 - warningPenalty - missingPenalty)
  );
  const score =
    status === 'Unknown'
      ? null
      : status === 'Dangerous'
        ? Math.min(39, rawScore)
        : status === 'Caution'
          ? Math.min(74, rawScore)
          : Math.max(75, rawScore);
  const confidence =
    missingSafetyInputs.length > 0 ? 'low' : integrity.confidence;
  const limitations: string[] = [];
  if (!exposure) {
    limitations.push('No spot exposure profile is available.');
  } else {
    limitations.push(exposure.editorialNote);
    if (exposure.staticHazards.length > 0) {
      limitations.push(
        `Static hazards requiring local verification: ${exposure.staticHazards.join(
          ', '
        )}.`
      );
    }
  }

  return {
    score,
    status,
    warnings,
    criticalWarnings,
    missingSafetyInputs,
    confidence,
    completenessPercentage: integrity.completenessPercentage,
    explanation: statusExplanation(
      status,
      criticalWarnings.length,
      missingSafetyInputs.length
    ),
    direction,
    limitations,
  };
}
