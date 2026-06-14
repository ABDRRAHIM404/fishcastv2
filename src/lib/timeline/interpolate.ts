/**
 * Pure interpolation helpers for the marine timeline. Deterministic and free of
 * I/O. Anchor series are interpolated to arbitrary timestamps:
 *  - linear for wind speed / wave height / score inputs,
 *  - circular shortest-arc for wind direction,
 *  - monotone-cubic (Fritsch-Carlson) for the tide curve so it reads naturally.
 */

/** A numeric anchor sample at a given epoch (ms). */
export interface Sample {
  ms: number;
  value: number;
}

/** Builds clean numeric samples from parallel time + value arrays. */
export function toSamples(
  time: string[],
  values: (number | null)[]
): Sample[] {
  const out: Sample[] = [];
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    const v = values[i];
    if (t === undefined || v === null || v === undefined || Number.isNaN(v)) {
      continue;
    }
    const ms = new Date(t).getTime();
    if (!Number.isNaN(ms)) out.push({ ms, value: v });
  }
  return out.sort((a, b) => a.ms - b.ms);
}

/** Finds the bracketing [lo, hi] index pair for `ms` in sorted samples. */
function bracket(samples: Sample[], ms: number): [number, number] | null {
  if (samples.length === 0) return null;
  if (ms <= samples[0]!.ms) return [0, 0];
  const last = samples.length - 1;
  if (ms >= samples[last]!.ms) return [last, last];
  for (let i = 0; i < last; i++) {
    if (ms >= samples[i]!.ms && ms <= samples[i + 1]!.ms) return [i, i + 1];
  }
  return [last, last];
}

/** Linear interpolation at `ms`. Returns null when no samples exist. */
export function linearAt(samples: Sample[], ms: number): number | null {
  const b = bracket(samples, ms);
  if (!b) return null;
  const [lo, hi] = b;
  const a = samples[lo]!;
  const c = samples[hi]!;
  if (lo === hi || a.ms === c.ms) return a.value;
  const t = (ms - a.ms) / (c.ms - a.ms);
  return a.value + (c.value - a.value) * t;
}

/**
 * Circular (shortest-arc) interpolation for angles in degrees. Interpolates
 * across the 0/360 boundary correctly. Returns null when no samples exist.
 */
export function circularAt(samples: Sample[], ms: number): number | null {
  const b = bracket(samples, ms);
  if (!b) return null;
  const [lo, hi] = b;
  const a = samples[lo]!;
  const c = samples[hi]!;
  if (lo === hi || a.ms === c.ms) return ((a.value % 360) + 360) % 360;
  const t = (ms - a.ms) / (c.ms - a.ms);
  const delta = ((c.value - a.value + 540) % 360) - 180; // shortest signed arc
  const result = a.value + delta * t;
  return ((result % 360) + 360) % 360;
}

/**
 * Monotone cubic (Fritsch-Carlson) interpolation, ideal for tide curves: it
 * passes through every anchor and never overshoots between them. Falls back to
 * linear with < 3 samples.
 */
export function monotoneCubicAt(samples: Sample[], ms: number): number | null {
  const n = samples.length;
  if (n === 0) return null;
  if (n < 3) return linearAt(samples, ms);

  const b = bracket(samples, ms);
  if (!b) return null;
  const [lo, hi] = b;
  if (lo === hi) return samples[lo]!.value;

  // Secant slopes between consecutive points.
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = samples[i + 1]!.ms - samples[i]!.ms;
    dx.push(h);
    slope.push(h === 0 ? 0 : (samples[i + 1]!.value - samples[i]!.value) / h);
  }

  // Tangents (Fritsch-Carlson).
  const m: number[] = new Array(n).fill(0);
  m[0] = slope[0] ?? 0;
  m[n - 1] = slope[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1]!;
    const s1 = slope[i]!;
    if (s0 * s1 <= 0) {
      m[i] = 0;
    } else {
      m[i] = (s0 + s1) / 2;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const s = slope[i]!;
    if (s === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const a = m[i]! / s;
      const bb = m[i + 1]! / s;
      const hyp = a * a + bb * bb;
      if (hyp > 9) {
        const tau = 3 / Math.sqrt(hyp);
        m[i] = tau * a * s;
        m[i + 1] = tau * bb * s;
      }
    }
  }

  // Hermite basis on [lo, hi].
  const h = dx[lo]!;
  const t = h === 0 ? 0 : (ms - samples[lo]!.ms) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return (
    h00 * samples[lo]!.value +
    h10 * h * m[lo]! +
    h01 * samples[hi]!.value +
    h11 * h * m[hi]!
  );
}