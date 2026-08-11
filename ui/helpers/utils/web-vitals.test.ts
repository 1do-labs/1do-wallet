// @ts-expect-error suppress CommonJS vs ECMAScript error
import { onINP, onFCP, onLCP, onCLS } from 'web-vitals/attribution';
import {
  initINPObserver,
  initFCPObserver,
  initLCPObserver,
  initCLSObserver,
  initWebVitals,
  getWebVitalsMetrics,
  resetWebVitalsMetrics,
} from './web-vitals';

jest.mock('web-vitals/attribution', () => ({
  onINP: jest.fn(),
  onFCP: jest.fn(),
  onLCP: jest.fn(),
  onCLS: jest.fn(),
}));

const observers = [
  {
    initialize: initINPObserver,
    observer: onINP as jest.Mock,
    value: 150,
    metric: 'inp',
    rating: 'inpRating',
  },
  {
    initialize: initFCPObserver,
    observer: onFCP as jest.Mock,
    value: 800,
    metric: 'fcp',
    rating: 'fcpRating',
  },
  {
    initialize: initLCPObserver,
    observer: onLCP as jest.Mock,
    value: 2000,
    metric: 'lcp',
    rating: 'lcpRating',
  },
  {
    initialize: initCLSObserver,
    observer: onCLS as jest.Mock,
    value: 0.05,
    metric: 'cls',
    rating: 'clsRating',
  },
] as const;

describe('web-vitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWebVitalsMetrics();
  });

  for (const { initialize, observer, value, metric, rating } of observers) {
    it(`registers and stores ${metric} measurements locally`, () => {
      initialize();

      expect(observer).toHaveBeenCalledWith(expect.any(Function), {
        reportAllChanges: true,
      });

      observer.mock.calls[0][0]({ value, attribution: {} });

      expect(getWebVitalsMetrics()).toMatchObject({
        [metric]: value,
        [rating]: 'good',
      });
    });
  }

  it('initializes all observers', () => {
    initWebVitals();

    expect(onINP).toHaveBeenCalledTimes(1);
    expect(onFCP).toHaveBeenCalledTimes(1);
    expect(onLCP).toHaveBeenCalledTimes(1);
    expect(onCLS).toHaveBeenCalledTimes(1);
  });

  it('registers local benchmark hooks in test mode', () => {
    const originalEnv = process.env.IN_TEST;
    const originalStateHooks = globalThis.stateHooks;
    process.env.IN_TEST = 'true';
    globalThis.stateHooks = {} as typeof stateHooks;

    initWebVitals();

    expect(globalThis.stateHooks.getWebVitalsMetrics).toBe(getWebVitalsMetrics);
    expect(globalThis.stateHooks.resetWebVitalsMetrics).toBe(
      resetWebVitalsMetrics,
    );

    process.env.IN_TEST = originalEnv;
    globalThis.stateHooks = originalStateHooks;
  });
});
