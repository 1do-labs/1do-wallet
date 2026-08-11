import {
  getTBTRating,
  getLongTaskMetrics,
  getLongTaskMetricsWithTBT,
  resetLongTaskMetrics,
  setupLongTaskObserver,
  disconnectLongTaskObserver,
  exposeLongTaskMetricsForTesting,
} from './performance-observers';

describe('performance-observers', () => {
  beforeEach(() => {
    resetLongTaskMetrics();
    disconnectLongTaskObserver();
    jest.clearAllMocks();
  });

  describe('getTBTRating', () => {
    it('returns "good" for TBT < 200ms', () => {
      expect(getTBTRating(0)).toBe('good');
      expect(getTBTRating(100)).toBe('good');
      expect(getTBTRating(199)).toBe('good');
    });

    it('returns "needs-improvement" for TBT 200-600ms', () => {
      expect(getTBTRating(200)).toBe('needs-improvement');
      expect(getTBTRating(400)).toBe('needs-improvement');
      expect(getTBTRating(599)).toBe('needs-improvement');
    });

    it('returns "poor" for TBT >= 600ms', () => {
      expect(getTBTRating(600)).toBe('poor');
      expect(getTBTRating(1000)).toBe('poor');
    });
  });

  describe('getLongTaskMetrics', () => {
    it('returns initial empty metrics', () => {
      const metrics = getLongTaskMetrics();
      expect(metrics).toEqual({
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        tbt: 0,
        tasks: [],
      });
    });

    it('returns a copy of metrics (not the original)', () => {
      const metrics1 = getLongTaskMetrics();
      const metrics2 = getLongTaskMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1.tasks).not.toBe(metrics2.tasks);
    });

    it('resets metrics when reset=true is passed', () => {
      const metrics = getLongTaskMetrics(true);

      expect(metrics).toEqual({
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        tbt: 0,
        tasks: [],
      });

      const afterReset = getLongTaskMetrics();
      expect(afterReset.count).toBe(0);
    });
  });

  describe('getLongTaskMetricsWithTBT', () => {
    it('includes TBT calculation', () => {
      const metrics = getLongTaskMetricsWithTBT();

      expect(metrics).toHaveProperty('tbt');
      expect(metrics).toHaveProperty('tbtRating');
      expect(metrics.tbt).toBe(0);
      expect(metrics.tbtRating).toBe('good');
    });

    it('resets metrics when reset=true is passed', () => {
      const metrics = getLongTaskMetricsWithTBT(true);

      expect(metrics.tbt).toBe(0);

      const afterReset = getLongTaskMetrics();
      expect(afterReset.count).toBe(0);
    });
  });

  describe('resetLongTaskMetrics', () => {
    it('resets metrics to initial state', () => {
      resetLongTaskMetrics();
      const metrics = getLongTaskMetrics();

      expect(metrics.count).toBe(0);
      expect(metrics.totalDuration).toBe(0);
      expect(metrics.maxDuration).toBe(0);
      expect(metrics.tbt).toBe(0);
      expect(metrics.tasks).toEqual([]);
    });
  });

  describe('setupLongTaskObserver', () => {
    const originalPerformanceObserver = globalThis.PerformanceObserver;
    const originalRandom = Math.random;

    afterEach(() => {
      globalThis.PerformanceObserver =
        originalPerformanceObserver as typeof PerformanceObserver;
      Math.random = originalRandom;
    });

    it('creates observer when sampled', () => {
      Math.random = () => 0; // Always sample
      const mockObserve = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        observe = mockObserve;

        disconnect = jest.fn();
      };

      const cleanup = setupLongTaskObserver(1);
      expect(typeof cleanup).toBe('function');
      expect(mockObserve).toHaveBeenCalledWith({
        type: 'longtask',
        buffered: true,
      });
    });

    it('does not create observer when not sampled', () => {
      Math.random = () => 0.5; // 50% > 10% sample rate
      const mockConstructor = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        constructor() {
          mockConstructor();
        }

        observe = jest.fn();

        disconnect = jest.fn();
      };

      const cleanup = setupLongTaskObserver(0.1);
      expect(typeof cleanup).toBe('function');
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it('does not create observer when PerformanceObserver is unavailable', () => {
      Math.random = () => 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).PerformanceObserver;

      const cleanup = setupLongTaskObserver(1);
      expect(typeof cleanup).toBe('function');
    });

    it('accumulates metrics when observer callback fires', () => {
      Math.random = () => 0;
      let capturedCallback: (list: { getEntries: () => object[] }) => void;

      const mockObserve = jest.fn();
      const mockDisconnect = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        constructor(cb: (list: { getEntries: () => object[] }) => void) {
          capturedCallback = cb;
        }

        observe = mockObserve;

        disconnect = mockDisconnect;
      };

      setupLongTaskObserver(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      capturedCallback!({
        getEntries: () => [
          { name: 'self', duration: 120, startTime: 100 },
          { name: 'self', duration: 80, startTime: 300 },
        ],
      });

      const metrics = getLongTaskMetrics();
      expect(metrics.count).toBe(2);
      expect(metrics.totalDuration).toBe(200);
      expect(metrics.maxDuration).toBe(120);
      // TBT = (120 - 50) + (80 - 50) = 70 + 30 = 100ms
      expect(metrics.tbt).toBe(100);
      expect(metrics.tasks).toHaveLength(2);
    });

    it('returns disconnect cleanup for duplicate observer calls', () => {
      Math.random = () => 0;
      const mockObserve = jest.fn();
      const mockDisconnect = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        observe = mockObserve;

        disconnect = mockDisconnect;
      };

      setupLongTaskObserver(1);
      const cleanup2 = setupLongTaskObserver(1);

      // Second call should still return a valid cleanup
      expect(typeof cleanup2).toBe('function');
      // observe should only have been called once (first setup)
      expect(mockObserve).toHaveBeenCalledTimes(1);
    });

    it('handles observer.observe throwing an error', () => {
      Math.random = () => 0;
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        observe() {
          throw new Error('longtask not supported');
        }

        disconnect = jest.fn();
      };

      const cleanup = setupLongTaskObserver(1);
      expect(typeof cleanup).toBe('function');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Performance] Failed to setup Long Task observer:',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('caps stored tasks at MAX_TASKS_STORED (50) but accumulates all TBT', () => {
      Math.random = () => 0;
      let capturedCallback: (list: { getEntries: () => object[] }) => void;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        constructor(cb: (list: { getEntries: () => object[] }) => void) {
          capturedCallback = cb;
        }

        observe = jest.fn();

        disconnect = jest.fn();
      };

      setupLongTaskObserver(1);

      // 60 tasks, each with duration = 60 + i (range: 60-119ms)
      // Blocking time per task = duration - 50ms = (10 + i)ms
      // Total TBT = sum(10..69) = 60 * (10 + 69) / 2 = 2370ms
      const entries = Array.from({ length: 60 }, (_, i) => ({
        name: 'self',
        duration: 60 + i,
        startTime: i * 100,
      }));

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      capturedCallback!({ getEntries: () => entries });

      const metrics = getLongTaskMetrics();
      expect(metrics.count).toBe(60);
      expect(metrics.tasks).toHaveLength(50);
      // TBT accounts for all 60 tasks, not just the 50 stored
      expect(metrics.tbt).toBe(2370);
    });

    it('disconnects observer on cleanup', () => {
      Math.random = () => 0;
      const mockDisconnect = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PerformanceObserver = class {
        observe = jest.fn();

        disconnect = mockDisconnect;
      };

      const cleanup = setupLongTaskObserver(1);
      cleanup();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('exposeLongTaskMetricsForTesting', () => {
    const originalStateHooks = globalThis.stateHooks;
    const originalInTest = process.env.IN_TEST;
    const originalMetaMaskDebug = process.env.METAMASK_DEBUG;

    afterEach(() => {
      globalThis.stateHooks = originalStateHooks;
      process.env.IN_TEST = originalInTest;
      if (originalMetaMaskDebug === undefined) {
        delete process.env.METAMASK_DEBUG;
      } else {
        process.env.METAMASK_DEBUG = originalMetaMaskDebug;
      }
    });

    it('exposes metrics functions on stateHooks when IN_TEST is set', () => {
      process.env.IN_TEST = 'true';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).stateHooks = {};

      exposeLongTaskMetricsForTesting();

      expect(globalThis.stateHooks.getLongTaskMetrics).toBe(getLongTaskMetrics);
      expect(globalThis.stateHooks.getLongTaskMetricsWithTBT).toBe(
        getLongTaskMetricsWithTBT,
      );
      expect(globalThis.stateHooks.resetLongTaskMetrics).toBe(
        resetLongTaskMetrics,
      );
    });

    it('does not expose when stateHooks is not available', () => {
      process.env.IN_TEST = 'true';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).stateHooks;

      // Should not throw
      expect(() => exposeLongTaskMetricsForTesting()).not.toThrow();
    });

    it('does not expose when not in test mode', () => {
      delete process.env.IN_TEST;
      delete process.env.METAMASK_DEBUG;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).stateHooks = {};

      exposeLongTaskMetricsForTesting();

      expect(globalThis.stateHooks.getLongTaskMetrics).toBeUndefined();
    });
  });
});
