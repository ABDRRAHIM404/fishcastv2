'use client';

import { useEffect, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import {
  HOME_SEQUENCE_MANIFESTS,
  canvasCoverCrop,
  frameUrl,
  nearestLoadedFrame,
  selectSequenceMode,
  selectSequenceVariant,
  sequenceFrameSample,
  sequenceLoadPriority,
  type HomeSequenceDirection,
  type HomeSequenceFrameSample,
  type HomeSequenceManifest,
  type HomeSequenceMode,
  type HomeSequenceVariant,
} from '@/lib/homepage/sequence';

interface HomepageSequenceCanvasProps {
  active: boolean;
  progress: MotionValue<number>;
  onReady: () => void;
  onFailure: () => void;
}

interface NavigatorWithCapabilityHints extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
}

type DecodedFrame = ImageBitmap | HTMLImageElement;

interface CachedFrame {
  drawable: DecodedFrame;
  lastUsed: number;
}

interface PendingFrame {
  abortController: AbortController;
  generation: number;
  startedAt: number;
}

const FULL_CACHE_LIMIT = 14;
const ECONOMY_CACHE_LIMIT = 8;
const FULL_CONCURRENCY = 3;
const ECONOMY_CONCURRENCY = 2;
const ABORT_SETTLE_MS = 90;
const ABORT_THROTTLE_MS = 140;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function abortError(): DOMException {
  return new DOMException('The frame request was aborted.', 'AbortError');
}

function isImageBitmap(drawable: DecodedFrame): drawable is ImageBitmap {
  return 'close' in drawable && typeof drawable.close === 'function';
}

function releaseFrame(drawable: DecodedFrame): void {
  if (isImageBitmap(drawable)) {
    drawable.close();
    return;
  }
  drawable.src = '';
}

async function decodeHtmlImage(blob: Blob, signal: AbortSignal): Promise<HTMLImageElement> {
  if (signal.aborted) throw abortError();
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanUp = () => signal.removeEventListener('abort', handleAbort);
      const handleAbort = () => {
        cleanUp();
        image.src = '';
        reject(abortError());
      };
      image.onload = () => {
        cleanUp();
        resolve();
      };
      image.onerror = () => {
        cleanUp();
        reject(new Error('The sequence frame could not be decoded.'));
      };
      signal.addEventListener('abort', handleAbort, { once: true });
      image.src = objectUrl;
    });
    if (signal.aborted) throw abortError();
    return image;
  } catch (error) {
    image.src = '';
    throw error;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadFrame(url: string, signal: AbortSignal): Promise<DecodedFrame> {
  const response = await fetch(url, { cache: 'force-cache', signal });
  if (!response.ok) {
    throw new Error(`Sequence frame request failed with status ${response.status}.`);
  }
  const blob = await response.blob();
  if (signal.aborted) throw abortError();

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      if (signal.aborted) {
        bitmap.close();
        throw abortError();
      }
      return bitmap;
    } catch (error) {
      if (isAbortError(error) || signal.aborted) throw abortError();
      // Safari and older browsers can fetch WebP while lacking reliable
      // createImageBitmap support. The same response blob is decoded by Image.
    }
  }

  return decodeHtmlImage(blob, signal);
}

function frameDimensions(frame: DecodedFrame): readonly [number, number] {
  return isImageBitmap(frame)
    ? [frame.width, frame.height]
    : [frame.naturalWidth, frame.naturalHeight];
}

function directionBetween(current: number, previous: number): HomeSequenceDirection {
  if (current > previous) return 'forward';
  if (current < previous) return 'backward';
  return 'stationary';
}

class SequenceRuntime {
  private readonly cache = new Map<number, CachedFrame>();
  private readonly failed = new Set<number>();
  private readonly pending = new Map<number, PendingFrame>();
  private queue: number[] = [];
  private manifest: HomeSequenceManifest = HOME_SEQUENCE_MANIFESTS.mobile;
  private variant: HomeSequenceVariant | null = null;
  private mode: HomeSequenceMode = 'full';
  private sample: HomeSequenceFrameSample = sequenceFrameSample(
    0,
    HOME_SEQUENCE_MANIFESTS.mobile
  )!;
  private targetIndex = 0;
  private previousIndex: number | null = null;
  private direction: HomeSequenceDirection = 'stationary';
  private displayedIndices: readonly number[] = [];
  private lastAbortAt = Number.NEGATIVE_INFINITY;
  private generation = 0;
  private useCounter = 0;
  private inputActive = false;
  private documentHidden = false;
  private readyReported = false;
  private failureReported = false;
  private frameRequest: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeProgress: (() => void) | null = null;

  constructor(
    private readonly root: HTMLDivElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
    private readonly progress: MotionValue<number>,
    private readonly reportReady: () => void,
    private readonly reportFailure: () => void
  ) {}

  mount(): void {
    this.documentHidden = document.hidden;
    this.unsubscribeProgress = this.progress.on('change', this.handleProgress);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.measure();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.measure);
      this.resizeObserver.observe(this.root);
    } else {
      window.addEventListener('resize', this.measure, { passive: true });
    }
  }

  destroy(): void {
    this.unsubscribeProgress?.();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.measure);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.abortPending();
    this.clearCache();
  }

  setActive(active: boolean): void {
    if (this.inputActive === active) return;
    this.inputActive = active;
    if (!this.canWork()) {
      this.pauseRequests();
      return;
    }
    this.scheduleWork();
  }

  private canWork(): boolean {
    return this.inputActive && !this.documentHidden && this.mode !== 'static';
  }

  private readonly handleVisibilityChange = () => {
    this.documentHidden = document.hidden;
    if (!this.canWork()) {
      this.pauseRequests();
      return;
    }
    this.scheduleWork();
  };

  private readonly handleProgress = (value: number) => {
    const nextSample = sequenceFrameSample(value, this.manifest);
    if (!nextSample || nextSample.position === this.sample.position) return;
    const oldPosition = this.sample.position;
    const oldIndex = this.targetIndex;
    this.sample = nextSample;
    this.previousIndex = oldIndex;
    this.targetIndex = nextSample.nearestIndex;
    this.direction = directionBetween(nextSample.position, oldPosition);
    if (this.canWork()) this.scheduleWork();
  };

  private readonly measure = () => {
    const bounds = this.root.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const nextVariant = selectSequenceVariant({
      width: bounds.width,
      height: bounds.height,
      previousVariant: this.variant,
    });
    const navigatorHints = navigator as NavigatorWithCapabilityHints;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const candidateMode = selectSequenceMode({
      canvas2d: true,
      reducedMotion,
      width: bounds.width,
      height: bounds.height,
      saveData: navigatorHints.connection?.saveData,
      effectiveType: navigatorHints.connection?.effectiveType,
      hardwareConcurrency: navigatorHints.hardwareConcurrency,
      deviceMemory: navigatorHints.deviceMemory,
    });

    // A runtime resize may lower the budget, but does not opportunistically
    // upgrade it and trigger a wider request fan-out during the same visit.
    if (this.mode === 'full' || candidateMode === 'static') this.mode = candidateMode;
    if (this.mode === 'static') {
      this.pauseRequests();
      this.fail();
      return;
    }

    if (this.variant !== nextVariant) {
      this.switchVariant(nextVariant);
    }
    this.resizeCanvas(bounds.width, bounds.height);
    if (this.canWork()) this.scheduleWork();
  };

  private switchVariant(variant: HomeSequenceVariant): void {
    this.generation += 1;
    this.abortPending();
    this.clearCache();
    this.failed.clear();
    this.queue = [];
    this.variant = variant;
    this.manifest = HOME_SEQUENCE_MANIFESTS[variant];
    this.sample = sequenceFrameSample(this.progress.get(), this.manifest)!;
    this.targetIndex = this.sample.nearestIndex;
    this.previousIndex = null;
    this.direction = 'stationary';
    this.displayedIndices = [];
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private resizeCanvas(width: number, height: number): void {
    const dprCap = this.mode === 'full' ? 1.6 : 1;
    const sourceScale = Math.min(
      this.manifest.sourceWidth / width,
      this.manifest.sourceHeight / height
    );
    const scale = Math.max(
      0.25,
      Math.min(window.devicePixelRatio || 1, dprCap, sourceScale)
    );
    const pixelWidth = Math.max(1, Math.round(width * scale));
    const pixelHeight = Math.max(1, Math.round(height * scale));
    if (this.canvas.width === pixelWidth && this.canvas.height === pixelHeight) return;
    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = this.mode === 'full' ? 'high' : 'medium';
    this.drawBestFrame();
  }

  private scheduleWork(): void {
    if (this.frameRequest !== null || !this.canWork()) return;
    this.frameRequest = requestAnimationFrame(() => {
      this.frameRequest = null;
      if (!this.canWork()) return;
      this.drawBestFrame();
      this.reprioritize();
      this.pumpQueue();
    });
  }

  private reprioritize(): void {
    const priorities = sequenceLoadPriority({
      manifest: this.manifest,
      targetIndex: this.targetIndex,
      previousIndex: this.previousIndex,
      sample: this.sample,
      direction: this.direction,
      mode: this.mode,
    });
    // The desired resident window cannot exceed the decoded cache. Once every
    // desired frame is resident, the queue therefore settles instead of
    // repeatedly decoding and evicting its own tail.
    const planLimit = this.mode === 'full' ? FULL_CACHE_LIMIT : ECONOMY_CACHE_LIMIT;
    this.queue = priorities.slice(0, planLimit).filter(
      (index) => !this.cache.has(index) && !this.pending.has(index) && !this.failed.has(index)
    );

    const exactIndices = new Set([
      this.sample.lowerIndex,
      this.sample.upperIndex,
    ]);
    const exactTargetBlocked = [...exactIndices].some(
      (index) => (
        !this.cache.has(index) &&
        !this.pending.has(index) &&
        !this.failed.has(index)
      )
    );
    const concurrency = this.mode === 'full' ? FULL_CONCURRENCY : ECONOMY_CONCURRENCY;
    if (!exactTargetBlocked || this.pending.size < concurrency) return;

    const now = performance.now();
    if (now - this.lastAbortAt < ABORT_THROTTLE_MS) return;
    const staleRequest = [...this.pending.entries()]
      .filter(([, request]) => now - request.startedAt >= ABORT_SETTLE_MS)
      .filter(([index]) => !exactIndices.has(index))
      .sort(([left], [right]) => (
        Math.abs(right - this.sample.position) - Math.abs(left - this.sample.position)
      ))[0];
    if (staleRequest) {
      this.lastAbortAt = now;
      staleRequest[1].abortController.abort();
    }
  }

  private pumpQueue(): void {
    if (!this.canWork()) return;
    const concurrency = this.mode === 'full' ? FULL_CONCURRENCY : ECONOMY_CONCURRENCY;
    while (this.pending.size < concurrency) {
      const index = this.queue.shift();
      if (index === undefined) break;
      this.requestFrame(index);
    }
  }

  private requestFrame(index: number): void {
    const url = frameUrl(this.manifest, index);
    if (!url) {
      this.failed.add(index);
      return;
    }

    const abortController = new AbortController();
    const requestGeneration = this.generation;
    const request = {
      abortController,
      generation: requestGeneration,
      startedAt: performance.now(),
    };
    this.pending.set(index, request);
    void loadFrame(url, abortController.signal).then(
      (drawable) => {
        const pending = this.pending.get(index);
        if (pending === request) this.pending.delete(index);
        if (
          abortController.signal.aborted ||
          pending !== request ||
          pending.generation !== this.generation ||
          requestGeneration !== this.generation
        ) {
          releaseFrame(drawable);
          this.pumpQueue();
          return;
        }

        this.cache.set(index, { drawable, lastUsed: ++this.useCounter });
        this.evictCache();
        this.scheduleWork();
        this.pumpQueue();
      },
      (error: unknown) => {
        if (this.pending.get(index) === request) this.pending.delete(index);
        if (!isAbortError(error) && !abortController.signal.aborted) {
          this.failed.add(index);
          if (!this.readyReported && this.cache.size === 0 && this.failed.size >= 4) {
            this.fail();
          }
        }
        this.pumpQueue();
      }
    );
  }

  private drawBestFrame(): void {
    if (this.cache.size === 0 || this.canvas.width <= 0 || this.canvas.height <= 0) return;
    const lower = this.cache.get(this.sample.lowerIndex);
    const upper = this.cache.get(this.sample.upperIndex);
    if (
      this.mode === 'full' &&
      lower &&
      upper &&
      this.sample.lowerIndex !== this.sample.upperIndex
    ) {
      const lowerDrawn = this.drawFrame(lower, 1);
      const upperDrawn = lowerDrawn && this.drawFrame(upper, this.sample.mix);
      this.context.globalAlpha = 1;
      if (lowerDrawn && upperDrawn) {
        lower.lastUsed = ++this.useCounter;
        upper.lastUsed = ++this.useCounter;
        this.displayedIndices = [this.sample.lowerIndex, this.sample.upperIndex];
        this.markReady();
        return;
      }
    }

    const bestIndex = nearestLoadedFrame(
      this.targetIndex,
      [...this.cache.keys()],
      this.manifest.frameIds.length,
      this.direction
    );
    if (bestIndex === null) return;
    const cached = this.cache.get(bestIndex);
    if (!cached) return;

    if (!this.drawFrame(cached, 1)) return;
    this.context.globalAlpha = 1;
    cached.lastUsed = ++this.useCounter;
    this.displayedIndices = [bestIndex];
    this.markReady();
  }

  private drawFrame(cached: CachedFrame, opacity: number): boolean {
    const [sourceWidth, sourceHeight] = frameDimensions(cached.drawable);
    const crop = canvasCoverCrop(
      sourceWidth,
      sourceHeight,
      this.canvas.width,
      this.canvas.height
    );
    if (crop.sourceWidth <= 0 || crop.sourceHeight <= 0) return false;

    this.context.globalAlpha = Math.min(1, Math.max(0, opacity));
    this.context.drawImage(
      cached.drawable,
      crop.sourceX,
      crop.sourceY,
      crop.sourceWidth,
      crop.sourceHeight,
      crop.destinationX,
      crop.destinationY,
      crop.destinationWidth,
      crop.destinationHeight
    );
    return true;
  }

  private markReady(): void {
    if (!this.readyReported) {
      this.readyReported = true;
      this.reportReady();
    }
  }

  private evictCache(): void {
    const limit = this.mode === 'full' ? FULL_CACHE_LIMIT : ECONOMY_CACHE_LIMIT;
    if (this.cache.size <= limit) return;
    const protectedIndices = new Set([
      this.targetIndex,
      this.sample.lowerIndex,
      this.sample.upperIndex,
      ...this.displayedIndices,
    ]);
    const candidates = [...this.cache.entries()]
      .filter(([index]) => !protectedIndices.has(index))
      .sort(([leftIndex, left], [rightIndex, right]) => {
        const distanceDifference =
          Math.abs(rightIndex - this.targetIndex) - Math.abs(leftIndex - this.targetIndex);
        return distanceDifference || left.lastUsed - right.lastUsed;
      });

    while (this.cache.size > limit) {
      const candidate = candidates.shift();
      if (!candidate) break;
      const [index, cached] = candidate;
      this.cache.delete(index);
      releaseFrame(cached.drawable);
    }
  }

  private pauseRequests(): void {
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.queue = [];
    this.abortPending();
  }

  private abortPending(): void {
    for (const request of this.pending.values()) request.abortController.abort();
    this.pending.clear();
  }

  private clearCache(): void {
    for (const cached of this.cache.values()) releaseFrame(cached.drawable);
    this.cache.clear();
  }

  private fail(): void {
    if (this.failureReported) return;
    this.failureReported = true;
    this.mode = 'static';
    this.pauseRequests();
    this.reportFailure();
  }
}

export function HomepageSequenceCanvas({
  active,
  progress,
  onReady,
  onFailure,
}: HomepageSequenceCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SequenceRuntime | null>(null);
  const readyCallbackRef = useRef(onReady);
  const failureCallbackRef = useRef(onFailure);

  useEffect(() => {
    readyCallbackRef.current = onReady;
    failureCallbackRef.current = onFailure;
  }, [onFailure, onReady]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });
    if (!root || !canvas || !context) {
      failureCallbackRef.current();
      return;
    }

    const runtime = new SequenceRuntime(
      root,
      canvas,
      context,
      progress,
      () => readyCallbackRef.current(),
      () => failureCallbackRef.current()
    );
    runtimeRef.current = runtime;
    runtime.mount();
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [progress]);

  useEffect(() => {
    runtimeRef.current?.setActive(active);
  }, [active]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
