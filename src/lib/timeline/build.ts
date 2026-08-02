import type {
  ForecastAnchors,
  Timeline,
  TimelinePoint,
} from '@/lib/timeline/types';
import {
  toSamples,
  linearWithinAt,
  circularWithinAt,
  monotoneCubicWithinAt,
  type Sample,
} from '@/lib/timeline/interpolate';
import { detectDailyWindows, detectWindows } from '@/lib/timeline/windows';
import {
  degreesToCompass,
  type MarineConditions,
  type WaveConditions,
} from '@/types/marine';
import type {
  ForecastInputKey,
  InputAvailability,
  InputProvenance,
} from '@/types/forecast';
import { deriveModelledTideConditions } from '@/lib/tides/derive';
import { calculateAstronomy } from '@/lib/daylight/solar';
import { deriveWaveMetrics } from '@/lib/waves/derived';
import { assessForecastIntegrity } from '@/lib/forecast/integrity';
import {
  evaluateForecast,
  type ForecastEvaluationSpot,
} from '@/lib/forecast/evaluate';

export const STEP_MS = 5 * 60 * 1000;
const MAX_INTERPOLATION_GAP_MS = 3 * 60 * 60 * 1000;

/** Builds five-minute marks in a start-inclusive/end-exclusive range. */
export function windowMarks(startMs: number, endMs: number): number[] {
  const marks: number[] = [];
  for (let ms = startMs; ms < endMs; ms += STEP_MS) marks.push(ms);
  return marks;
}

function gapIsSupported(samples: Sample[], ms: number): boolean {
  if (samples.length === 0) return false;
  const exact = samples.some((sample) => sample.ms === ms);
  if (exact) return true;
  let previous: Sample | null = null;
  let next: Sample | null = null;
  for (const sample of samples) {
    if (sample.ms < ms) previous = sample;
    if (sample.ms > ms) {
      next = sample;
      break;
    }
  }
  return (
    previous !== null &&
    next !== null &&
    next.ms - previous.ms <= MAX_INTERPOLATION_GAP_MS
  );
}

function linearValue(samples: Sample[], ms: number): number | null {
  return gapIsSupported(samples, ms) ? linearWithinAt(samples, ms) : null;
}

function circularValue(samples: Sample[], ms: number): number | null {
  return gapIsSupported(samples, ms) ? circularWithinAt(samples, ms) : null;
}

function nearestValue(samples: Sample[], ms: number): number | null {
  if (!gapIsSupported(samples, ms)) return null;
  let nearest = samples[0] ?? null;
  for (const sample of samples) {
    if (
      nearest === null ||
      Math.abs(sample.ms - ms) < Math.abs(nearest.ms - ms)
    ) {
      nearest = sample;
    }
  }
  return nearest?.value ?? null;
}

function tideValue(samples: Sample[], ms: number): number | null {
  return gapIsSupported(samples, ms)
    ? monotoneCubicWithinAt(samples, ms)
    : null;
}

function availabilityAt(
  samples: Sample[],
  ms: number
): InputAvailability {
  if (!gapIsSupported(samples, ms)) return 'missing';
  return samples.some((sample) => sample.ms === ms)
    ? 'available'
    : 'interpolated';
}

function atLeastOneAvailability(
  entries: Array<{ samples: Sample[]; value: number | null }>,
  ms: number
): InputAvailability {
  const present = entries.filter((entry) => entry.value !== null);
  if (present.length === 0) return 'missing';
  return present.some(
    (entry) => availabilityAt(entry.samples, ms) === 'available'
  )
    ? 'available'
    : 'interpolated';
}

function synthMarine(
  spot: ForecastEvaluationSpot,
  iso: string,
  fetchedAt: { forecast: string | null; marine: string | null },
  value: {
    windSpeedKmh: number | null;
    windGustKmh: number | null;
    windDirectionDeg: number | null;
    wave: WaveConditions;
    precipitationMm: number | null;
    cloudCoverPct: number | null;
    pressureMb: number | null;
    pressureTrendMbPerHr: number | null;
    temperatureC: number | null;
    visibilityM: number | null;
    weatherCode: number | null;
    tide: ReturnType<typeof deriveModelledTideConditions>;
  }
): MarineConditions {
  const weatherPresent = [
    value.precipitationMm,
    value.cloudCoverPct,
    value.pressureMb,
    value.temperatureC,
    value.visibilityM,
    value.weatherCode,
  ].some((item) => item !== null);
  const wavePresent = [
    value.wave.waveHeightM,
    value.wave.wavePeriodS,
    value.wave.swellHeightM,
    value.wave.seaSurfaceTemperatureC,
    value.wave.oceanCurrentVelocityKmh,
  ].some((item) => item !== null);
  const astronomy = calculateAstronomy(
    spot.latitude,
    spot.longitude,
    new Date(iso)
  );

  return {
    spotId: spot.id,
    generatedAt: iso,
    weather: weatherPresent
      ? {
          status: 'ok',
          cachedAt: fetchedAt.forecast ?? iso,
          data: {
            observedAt: iso,
            temperatureC: value.temperatureC,
            apparentTemperatureC: null,
            humidityPct: null,
            cloudCoverPct: value.cloudCoverPct,
            precipitationMm: value.precipitationMm,
            pressureMb: value.pressureMb,
            pressureTrendMbPerHr: value.pressureTrendMbPerHr,
            weatherCode: value.weatherCode,
            visibilityM: value.visibilityM,
          },
        }
      : { status: 'error', message: 'no forecast data' },
    wind:
      value.windSpeedKmh !== null ||
      value.windGustKmh !== null ||
      value.windDirectionDeg !== null
        ? {
            status: 'ok',
            cachedAt: fetchedAt.forecast ?? iso,
            data: {
              observedAt: iso,
              speedKmh: value.windSpeedKmh,
              gustKmh: value.windGustKmh,
              directionDeg: value.windDirectionDeg,
              directionCompass: degreesToCompass(value.windDirectionDeg),
            },
          }
        : { status: 'error', message: 'no wind data' },
    waves: wavePresent
      ? {
          status: 'ok',
          cachedAt: fetchedAt.marine ?? iso,
          data: value.wave,
        }
      : { status: 'error', message: 'no wave data' },
    tide: value.tide
      ? {
          status: 'ok',
          cachedAt: fetchedAt.marine ?? iso,
          data: value.tide,
        }
      : { status: 'error', message: 'no modelled sea-level data' },
    astronomy: {
      status: 'ok',
      cachedAt: iso,
      data: astronomy,
    },
  };
}

/** Builds a deterministic timeline for the exact requested Casablanca day. */
export function buildTimeline(
  spot: ForecastEvaluationSpot,
  date: string,
  startMs: number,
  endMs: number,
  anchors: ForecastAnchors,
  now: Date = new Date()
): Timeline {
  const windSpeed = toSamples(anchors.wind.time, anchors.wind.speedKmh);
  const windGust = toSamples(anchors.wind.time, anchors.wind.gustKmh);
  const windDirection = toSamples(
    anchors.wind.time,
    anchors.wind.directionDeg
  );
  const waveHeight = toSamples(anchors.waves.time, anchors.waves.heightM);
  const wavePeriod = toSamples(anchors.waves.time, anchors.waves.periodS);
  const waveDirection = toSamples(
    anchors.waves.time,
    anchors.waves.directionDeg
  );
  const swellHeight = toSamples(
    anchors.waves.time,
    anchors.waves.swellHeightM
  );
  const swellPeriod = toSamples(
    anchors.waves.time,
    anchors.waves.swellPeriodS
  );
  const swellDirection = toSamples(
    anchors.waves.time,
    anchors.waves.swellDirectionDeg
  );
  const secondarySwellHeight = toSamples(
    anchors.waves.time,
    anchors.waves.secondarySwellHeightM
  );
  const secondarySwellPeriod = toSamples(
    anchors.waves.time,
    anchors.waves.secondarySwellPeriodS
  );
  const secondarySwellDirection = toSamples(
    anchors.waves.time,
    anchors.waves.secondarySwellDirectionDeg
  );
  const seaSurfaceTemperature = toSamples(
    anchors.waves.time,
    anchors.waves.seaSurfaceTemperatureC
  );
  const oceanCurrentVelocity = toSamples(
    anchors.waves.time,
    anchors.waves.oceanCurrentVelocityKmh
  );
  const oceanCurrentDirection = toSamples(
    anchors.waves.time,
    anchors.waves.oceanCurrentDirectionDeg
  );
  const precipitation = toSamples(
    anchors.weather.time,
    anchors.weather.precipitationMm
  );
  const cloud = toSamples(
    anchors.weather.time,
    anchors.weather.cloudCoverPct
  );
  const pressure = toSamples(
    anchors.weather.time,
    anchors.weather.pressureMb
  );
  const temperature = toSamples(
    anchors.weather.time,
    anchors.weather.temperatureC
  );
  const visibility = toSamples(
    anchors.weather.time,
    anchors.weather.visibilityM
  );
  const weatherCode = toSamples(
    anchors.weather.time,
    anchors.weather.weatherCode
  );
  const tideSamples = toSamples(
    anchors.tide.points.map((point) => point.time),
    anchors.tide.points.map((point) => point.heightM)
  );

  const marks = windowMarks(startMs, endMs);
  const generatedAt = now.toISOString();
  const points: TimelinePoint[] = marks.map((ms, index) => {
    const iso = new Date(ms).toISOString();
    const windSpeedKmh = linearValue(windSpeed, ms);
    const windGustKmh = linearValue(windGust, ms);
    const windDirectionDeg = circularValue(windDirection, ms);
    const waveHeightM = linearValue(waveHeight, ms);
    const wavePeriodS = linearValue(wavePeriod, ms);
    const waveDirectionDeg = circularValue(waveDirection, ms);
    const swellHeightM = linearValue(swellHeight, ms);
    const swellPeriodS = linearValue(swellPeriod, ms);
    const swellDirectionDeg = circularValue(swellDirection, ms);
    const secondarySwellHeightM = linearValue(secondarySwellHeight, ms);
    const secondarySwellPeriodS = linearValue(secondarySwellPeriod, ms);
    const secondarySwellDirectionDeg = circularValue(
      secondarySwellDirection,
      ms
    );
    const seaSurfaceTemperatureC = linearValue(
      seaSurfaceTemperature,
      ms
    );
    const oceanCurrentVelocityKmh = linearValue(
      oceanCurrentVelocity,
      ms
    );
    const oceanCurrentDirectionDeg = circularValue(
      oceanCurrentDirection,
      ms
    );
    const precipitationMm = linearValue(precipitation, ms);
    const cloudCoverPct = linearValue(cloud, ms);
    const pressureMb = linearValue(pressure, ms);
    const previousPressure =
      index > 0 ? linearValue(pressure, marks[index - 1]!) : null;
    const pressureTrendMbPerHr =
      pressureMb === null || previousPressure === null
        ? null
        : (pressureMb - previousPressure) * 12;
    const temperatureC = linearValue(temperature, ms);
    const visibilityM = linearValue(visibility, ms);
    const weatherCodeValue = nearestValue(weatherCode, ms);
    const tideHeightM = tideValue(tideSamples, ms);
    const tide =
      tideHeightM === null
        ? null
        : deriveModelledTideConditions(
            anchors.tide.points,
            new Date(ms)
          );
    if (tide) tide.heightM = tideHeightM;

    const waveMetrics = deriveWaveMetrics({
      waveHeightM,
      wavePeriodS,
      swellHeightM,
      swellDirectionDeg,
      secondarySwellHeightM,
      secondarySwellDirectionDeg,
    });
    const wave: WaveConditions = {
      observedAt: iso,
      waveHeightM,
      wavePeriodS,
      waveDirectionDeg,
      swellHeightM,
      swellPeriodS,
      swellDirectionDeg,
      secondarySwellHeightM,
      secondarySwellPeriodS,
      secondarySwellDirectionDeg,
      seaSurfaceTemperatureC,
      oceanCurrentVelocityKmh,
      oceanCurrentDirectionDeg,
      derived: waveMetrics,
    };
    const marine = synthMarine(
      spot,
      iso,
      {
        forecast: anchors.weather.fetchedAt ?? anchors.wind.fetchedAt,
        marine: anchors.waves.fetchedAt ?? anchors.tide.fetchedAt,
      },
      {
        windSpeedKmh,
        windGustKmh,
        windDirectionDeg,
        wave,
        precipitationMm,
        cloudCoverPct,
        pressureMb,
        pressureTrendMbPerHr,
        temperatureC,
        visibilityM,
        weatherCode: weatherCodeValue,
        tide,
      }
    );

    const availability: Partial<
      Record<ForecastInputKey, InputAvailability>
    > = {
      windSpeed: availabilityAt(windSpeed, ms),
      windGusts: availabilityAt(windGust, ms),
      windDirection: availabilityAt(windDirection, ms),
      waveHeight: availabilityAt(waveHeight, ms),
      waveDirection: availabilityAt(waveDirection, ms),
      wavePeriod: availabilityAt(wavePeriod, ms),
      swellHeight: availabilityAt(swellHeight, ms),
      swellDirection: availabilityAt(swellDirection, ms),
      swellPeriod: availabilityAt(swellPeriod, ms),
      modelledTide: availabilityAt(tideSamples, ms),
      weather: atLeastOneAvailability(
        [
          { samples: precipitation, value: precipitationMm },
          { samples: cloud, value: cloudCoverPct },
          { samples: weatherCode, value: weatherCodeValue },
        ],
        ms
      ),
      pressure: availabilityAt(pressure, ms),
      temperature: availabilityAt(temperature, ms),
      daylight: 'available',
    };
    const provenance: Partial<
      Record<ForecastInputKey, InputProvenance>
    > = { daylight: 'calculated' };
    const integrity = assessForecastIntegrity(marine, {
      evaluatedAt: generatedAt,
      defaultAvailability: 'interpolated',
      availability,
      provenance,
    });
    const evaluation = evaluateForecast(marine, spot, integrity);

    return {
      time: iso,
      tideHeightM: tide?.heightM ?? null,
      tideTrend: tide?.trend ?? null,
      tideRateMPerHour: tide?.rateMPerHour ?? null,
      tideDailyRangeM: tide?.dailyRangeM ?? null,
      tideMinutesToNextExtreme: tide?.minutesToNextExtreme ?? null,
      tideNextExtremeState: tide?.extremes[0]?.state ?? null,
      tideNextExtremeTime: tide?.extremes[0]?.time ?? null,
      windSpeedKmh,
      windGustKmh,
      windDirectionDeg,
      waveHeightM,
      wavePeriodS,
      waveDirectionDeg,
      swellHeightM,
      swellPeriodS,
      swellDirectionDeg,
      secondarySwellHeightM,
      secondarySwellPeriodS,
      secondarySwellDirectionDeg,
      seaSurfaceTemperatureC,
      oceanCurrentVelocityKmh,
      oceanCurrentDirectionDeg,
      temperatureC,
      precipitationMm,
      cloudCoverPct,
      pressureMb,
      pressureTrendMbPerHr,
      visibilityM,
      weatherCode: weatherCodeValue,
      daylightState:
        marine.astronomy?.status === 'ok'
          ? marine.astronomy.data.daylightState
          : 'unknown',
      sunrise:
        marine.astronomy?.status === 'ok'
          ? marine.astronomy.data.sunrise
          : null,
      sunset:
        marine.astronomy?.status === 'ok'
          ? marine.astronomy.data.sunset
          : null,
      civilDawn:
        marine.astronomy?.status === 'ok'
          ? marine.astronomy.data.civilDawn
          : null,
      civilDusk:
        marine.astronomy?.status === 'ok'
          ? marine.astronomy.data.civilDusk
          : null,
      waveMetrics,
      interpretation: evaluation.interpretation,
      integrity,
      safety: evaluation.safety,
      score: evaluation.fishing.overallScore,
      grade: evaluation.fishing.grade,
      label: evaluation.fishing.label,
    };
  });

  const windows = detectWindows(points);
  const dailyWindows = detectDailyWindows(points);
  const recommendedWindow = windows[0] ?? null;

  return {
    schemaVersion: 3,
    spotId: spot.id,
    date,
    range: {
      start: new Date(startMs).toISOString(),
      endExclusive: new Date(endMs).toISOString(),
      timeZone: 'Africa/Casablanca',
    },
    points,
    windows,
    dailyWindows,
    recommendedWindow,
    noRecommendedWindowReason: recommendedWindow
      ? null
      : 'No recommended window: quality, safety, or confidence requirements were not met.',
    generatedAt,
    sourceTimestamps: {
      forecastFetchedAt:
        anchors.weather.fetchedAt ?? anchors.wind.fetchedAt,
      marineFetchedAt: anchors.waves.fetchedAt ?? anchors.tide.fetchedAt,
    },
    tideMetadata: {
      source: 'open-meteo-modelled',
      datum: 'mean-sea-level',
      providerIntervalMinutes: 60,
      timelineIntervalMinutes: 5,
      interpolation: 'monotone-cubic',
    },
  };
}
