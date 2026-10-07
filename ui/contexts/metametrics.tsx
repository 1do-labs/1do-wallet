import { createContext } from 'react';

export type UITrackEventMethod = (
  event: unknown,
  properties?: unknown,
) => Promise<void>;

/**
 * Analytics context kept for components and stories that provide their own
 * tracking stub. Production analytics is handled by the analytics controller.
 */
export const MetaMetricsContext = createContext<unknown>(undefined);
