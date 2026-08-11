/**
 * Performance observers for production and benchmark instrumentation.
 *
 * Long Task observer detects main thread blocking (>50ms). Total Blocking
 * Time (TBT) is derived as the sum of (duration - 50ms) for each task.
 *
 * `PerformanceObserver` for `longtask` entries IS supported on
 * `chrome-extension://` pages, unlike paint-based metrics (LCP, FCP).
 * This makes Long Task / TBT the primary production performance signal
 * for browser extensions.
 *
 * @see https://web.dev/articles/long-tasks-devtools
 * @see https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time
 */

/**
 * Entry from PerformanceObserver for longtask entries.
 */
type LongTaskEntry = {
  name: string;
  duration: number;
  startTime: number;
};

/**
 * Accumulated metrics for Long Tasks.
 */
export type LongTaskMetrics = {
  /** Total count of long tasks observed */
  count: number;
  /** Sum of all long task durations in milliseconds */
  totalDuration: number;
  /** Maximum single long task duration in milliseconds */
  maxDuration: number;
  /** Total Blocking Time in milliseconds, accumulated incrementally */
  tbt: number;
  /** Individual task entries (capped at 50) */
  tasks: LongTaskEntry[];
};

/**
 * Extended metrics including TBT rating.
 */
export type LongTaskMetricsWithTBT = LongTaskMetrics & {
  /** TBT rating based on Lighthouse desktop thresholds */
  tbtRating: 'good' | 'needs-improvement' | 'poor';
};

/** Maximum number of individual tasks to store */
const MAX_TASKS_STORED = 50;

/** Long task threshold in milliseconds */
const LONG_TASK_THRESHOLD_MS = 50;

/** TBT threshold for "good" rating in milliseconds */
const TBT_GOOD_THRESHOLD_MS = 200;

/** TBT threshold for "needs improvement" rating in milliseconds */
const TBT_NEEDS_IMPROVEMENT_THRESHOLD_MS = 600;

let longTaskMetrics: LongTaskMetrics = {
  count: 0,
  totalDuration: 0,
  maxDuration: 0,
  tbt: 0,
  tasks: [],
};

let observer: PerformanceObserver | null = null;

/**
 * Set up Long Task observer for main thread blocking detection.
 * Long tasks are any JS execution >50ms that blocks user interaction.
 *
 * @param sampleRate - Percentage of sessions to track (0-1, default 0.1 = 10%)
 * @returns Cleanup function to disconnect the observer
 */
export function setupLongTaskObserver(sampleRate: number = 0.1): () => void {
  if (
    Math.random() > sampleRate // NOSONAR: intentional — performance sampling, not security
  ) {
    return () => {
      // No-op cleanup for non-sampled sessions
    };
  }

  if (!('PerformanceObserver' in globalThis)) {
    // Silent no-op in non-browser environments (Node/Jest)
    return () => {
      // No-op cleanup
    };
  }

  // Prevent duplicate observers
  if (observer) {
    return () => {
      disconnectLongTaskObserver();
    };
  }

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskMetrics.count += 1;
        longTaskMetrics.totalDuration += entry.duration;
        longTaskMetrics.maxDuration = Math.max(
          longTaskMetrics.maxDuration,
          entry.duration,
        );
        longTaskMetrics.tbt += Math.max(
          0,
          entry.duration - LONG_TASK_THRESHOLD_MS,
        );

        // Store up to MAX_TASKS_STORED tasks for analysis
        if (longTaskMetrics.tasks.length < MAX_TASKS_STORED) {
          longTaskMetrics.tasks.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
  } catch (error) {
    // Reset observer to allow future retry attempts
    observer = null;
    console.warn('[Performance] Failed to setup Long Task observer:', error);
  }

  return () => {
    disconnectLongTaskObserver();
  };
}

/**
 * Disconnect the Long Task observer.
 */
export function disconnectLongTaskObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * Get current Long Task metrics.
 *
 * @param reset - If true, resets the metrics after retrieval
 * @returns Current long task metrics
 */
export function getLongTaskMetrics(reset: boolean = false): LongTaskMetrics {
  const result = { ...longTaskMetrics, tasks: [...longTaskMetrics.tasks] };

  if (reset) {
    resetLongTaskMetrics();
  }

  return result;
}

/**
 * Reset Long Task metrics to initial state.
 */
export function resetLongTaskMetrics(): void {
  longTaskMetrics = {
    count: 0,
    totalDuration: 0,
    maxDuration: 0,
    tbt: 0,
    tasks: [],
  };
}

/**
 * Get TBT rating based on Lighthouse thresholds.
 *
 * @param tbt - Total Blocking Time in milliseconds
 * @returns Rating: 'good' (<200ms), 'needs-improvement' (200-600ms), or 'poor' (>600ms)
 * @see https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time/#what-is-a-good-tbt-score
 */
export function getTBTRating(
  tbt: number,
): 'good' | 'needs-improvement' | 'poor' {
  if (tbt < TBT_GOOD_THRESHOLD_MS) {
    return 'good';
  }
  if (tbt < TBT_NEEDS_IMPROVEMENT_THRESHOLD_MS) {
    return 'needs-improvement';
  }
  return 'poor';
}

/**
 * Get Long Task metrics with derived TBT.
 *
 * @param reset - If true, resets the metrics after retrieval
 * @returns Metrics including TBT value and rating
 */
export function getLongTaskMetricsWithTBT(
  reset: boolean = false,
): LongTaskMetricsWithTBT {
  const metrics = getLongTaskMetrics(reset);

  return {
    ...metrics,
    tbtRating: getTBTRating(metrics.tbt),
  };
}

/**
 * Expose Long Task metrics on stateHooks for E2E testing.
 * Call this from ui/index.js after stateHooks is initialized.
 */
export function exposeLongTaskMetricsForTesting(): void {
  if (
    (process.env.IN_TEST || process.env.METAMASK_DEBUG) &&
    globalThis.stateHooks
  ) {
    globalThis.stateHooks.getLongTaskMetrics = getLongTaskMetrics;
    globalThis.stateHooks.getLongTaskMetricsWithTBT = getLongTaskMetricsWithTBT;
    globalThis.stateHooks.resetLongTaskMetrics = resetLongTaskMetrics;
  }
}
