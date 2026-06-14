/**
 * Pure timeline builder: interpolates anchor forecast series to 5-minute
 * increments across a local day, computes a Phase 6 fishing score at each
 * increment (by synthesizing a MarineConditions object), and detects windows.
 * Deterministic and I/O-free so it is fully unit-testable.
 */
import type {
  ForecastAnchors,
  Timeline,
  TimelinePoint,
} from '@/lib/timeline/types';
import {
  toSamples,
  linearAt,
  circularAt,
  monotoneCubicAt,
} from '@/lib/timeline/interpolate';
import { detectWindows } from '@/lib/timeline/windows';
import { computeScore, gradeFor } from '@/lib/scoring/engine';
import { degreesToCompass, type MarineConditions } from '@/types/marine';

export const STEP_MS = 5 * 60 * 1000;
export const STEPS_PER_DAY = 288;

/** Builds the list of 5-minute epoch marks for a local day start (ms). */
export function dayMarks(dayStartMs: number): number[] {
  const marks: number[] = [];
  for (let i = 0; i < STEPS_PER_DAY; i++) marks.push(dayStartMs + i * STEP_MS);
  return marks;
}

/**
 * Synthesizes a MarineConditions object for a single increment so the timeline
 * score is produced by the exact same Phase 6 engine as the score card.
 * Sections with no interpolated value are marked unavailable.
 */
function synthMarine(
  spotId: string,
  iso: string,
  v: {
    windSpeedKmh: number | null;
    windDirectionDeg: number | null;
    waveHeightM: number | null;
    precipitationMm: number | null;
    cloudCoverPct: number | null;
    tideHeightM: number | null;
    tideRising: 'rising' | 'falling' | null;
  }
): MarineConditions {
  return {
    spotId,
    generatedAt: iso,
    weather:
      v.precipitationMm === null && v.cloudCoverPct === null
        ? { status: 'error', message: 'no data' }
        : {
            status: 'ok',
            cachedAt: iso,
            data: {
              observedAt: iso,
              temperatureC: null,
              apparentTemperatureC: null,
              humidityPct: null,
              cloudCoverPct: v.cloudCoverPct,
              precipitationMm: v.precipitationMm,
              weatherCode: null,
            },
          },
    wind:
      v.windSpeedKmh === null
        ? { status: 'error', message: 'no data' }
        : {
            status: 'ok',
            cachedAt: iso,
            data: {
              observedAt: iso,
              speedKmh: v.windSpeedKmh,
              gustKmh: null,
              directionDeg: v.windDirectionDeg,
              directionCompass: degreesToCompass(v.windDirectionDeg),
            },
          },
    waves:
      v.waveHeightM === null
        ? { status: 'error', message: 'no data' }
        : {
            status: 'ok',
            cachedAt: iso,
            data: {
              observedAt: iso,
              waveHeightM: v.waveHeightM,
              wavePeriodS: null,
              waveDirectionDeg: null,
              swellHeightM: null,
              swellPeriodS: null,
              swellDirectionDeg: null,
            },
          },
    tide:
      v.tideHeightM === null && v.tideRising === null
        ? { status: 'error', message: 'no data' }
        : {
            status: 'ok',
            cachedAt: iso,
            data: {
              observedAt: iso,
              heightM: v.tideHeightM,
              trend: v.tideRising,
              extremes: [],
            },
          },
  };
}

/**
 * Builds the deterministic timeline from anchor series for a spot + local day.
 */
export function buildTimeline(
  spotId: string,
  date: string,
  dayStartMs: number,
  anchors: ForecastAnchors,
  now: Date = new Date()
): Timeline {
  const windSpeed = toSamples(anchors.wind.time, anchors.wind.speedKmh);
  const windDir = toSamples(anchors.wind.time, anchors.wind.directionDeg);
  const wave = toSamples(anchors.waves.time, anchors.waves.heightM);
  const precip = toSamples(
    anchors.weather.time,
    anchors.weather.precipitationMm
  );
  const cloud = toSamples(anchors.weather.time, anchors.weather.cloudCoverPct);
  const tide = toSamples(
    anchors.tide.map((p) => p.time),
    anchors.tide.map((p) => p.heightM)
  );

  const marks = dayMarks(dayStartMs);

  const points: TimelinePoint[] = marks.map((ms, i) => {
    const iso = new Date(ms).toISOString();
    const tideHeightM = monotoneCubicAt(tide, ms);
    const prevTide =
      i > 0 ? monotoneCubicAt(tide, marks[i - 1]!) : null;
    const tideRising =
      tideHeightM === null || prevTide === null
        ? null
        : tideHeightM > prevTide
          ? 'rising'
          : tideHeightM < prevTide
            ? 'falling'
            : null;

    const windSpeedKmh = linearAt(windSpeed, ms);
    const windDirectionDeg = circularAt(windDir, ms);
    const waveHeightM = linearAt(wave, ms);

    const marine = synthMarine(spotId, iso, {
      windSpeedKmh,
      windDirectionDeg,
      waveHeightM,
      precipitationMm: linearAt(precip, ms),
      cloudCoverPct: linearAt(cloud, ms),
      tideHeightM,
      tideRising,
    });
    const score = computeScore(marine).overallScore;

    return {
      time: iso,
      tideHeightM,
      windSpeedKmh,
      windDirectionDeg,
      waveHeightM,
      score,
      grade: gradeFor(Math.round(score * 10)),
    };
  });

  return {
    spotId,
    date,
    points,
    windows: detectWindows(points),
    generatedAt: now.toISOString(),
  };
}
