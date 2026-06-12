import React, {
  Component,
  createContext,
  useRef,
  useContext,
  useMemo,
  type ReactNode,
  type MutableRefObject,
  type ComponentType,
} from 'react';
import type { Span } from '@sentry/types';

import {
  type UnsanitizedMetaMetricsEventPayload,
  type MetaMetricsEventOptions,
} from '../../shared/constants/metametrics';
import type {
  TraceName,
  TraceRequest,
  EndTraceRequest,
  TraceCallback,
} from '../../shared/lib/trace';

/**
 * UI-specific event payload that omits fields added by the provider
 */
export type UIMetricsEventPayload = Omit<
  UnsanitizedMetaMetricsEventPayload,
  'environmentType' | 'page' | 'referrer'
>;

/**
 * Method signature for tracking MetaMetrics events from the UI
 */
export type UITrackEventMethod = (
  payload: UIMetricsEventPayload,
  options?: MetaMetricsEventOptions,
) => Promise<void>;

/**
 * Method signature for starting a buffered trace
 */
export type UITraceMethod = <Result>(
  request: TraceRequest,
  fn?: TraceCallback<Result>,
) => Promise<Result | undefined>;

/**
 * Method signature for ending a buffered trace
 */
export type UIEndTraceMethod = (request: EndTraceRequest) => void;

/**
 * Serialized parent context for RPC communication.
 * Used when passing trace context across process boundaries.
 */
export type SerializedTraceParentContext = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _name: TraceName;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _id?: string;
};

/**
 * Parent context for traces - can be a Sentry Span or serialized format for RPC
 */
export type TraceParentContext = Span | SerializedTraceParentContext | null;

/**
 * The value provided by MetaMetricsContext
 */
export type MetaMetricsContextValue = {
  trackEvent: UITrackEventMethod;
  bufferedTrace: UITraceMethod;
  bufferedEndTrace: UIEndTraceMethod;
  onboardingParentContext: MutableRefObject<TraceParentContext>;
};

const defaultContextValue: MetaMetricsContextValue = {
  trackEvent: () => Promise.resolve(),
  bufferedTrace: () => Promise.resolve(undefined),
  bufferedEndTrace: () => undefined,
  onboardingParentContext: { current: null },
};

export const MetaMetricsContext =
  createContext<MetaMetricsContextValue>(defaultContextValue);

type MetaMetricsProviderProps = {
  children: ReactNode;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export function MetaMetricsProvider({ children }: MetaMetricsProviderProps) {
  const onboardingParentContext = useRef<TraceParentContext>(null);

  const contextValue = useMemo(
    () => ({
      trackEvent: defaultContextValue.trackEvent,
      bufferedTrace: defaultContextValue.bufferedTrace,
      bufferedEndTrace: defaultContextValue.bufferedEndTrace,
      onboardingParentContext,
    }),
    [],
  );

  return (
    <MetaMetricsContext.Provider value={contextValue}>
      {children}
    </MetaMetricsContext.Provider>
  );
}

type LegacyChildContext = {
  trackEvent: UITrackEventMethod;
  bufferedTrace: UITraceMethod;
  bufferedEndTrace: UIEndTraceMethod;
};

type LegacyMetaMetricsProviderProps = {
  children?: ReactNode;
};

/**
 * Legacy context provider for class components using the old context API
 *
 * @deprecated Use MetaMetricsContext with useContext hook instead
 */
export class LegacyMetaMetricsProvider extends Component<LegacyMetaMetricsProviderProps> {
  static contextType = MetaMetricsContext;

  // eslint-disable-next-line react/static-property-placement
  static childContextTypes = {
    // This has to be different than the type name for the old metametrics file
    // using the same name would result in whichever was lower in the tree to be
    // used.
    trackEvent: (): null => null,
    bufferedTrace: (): null => null,
    bufferedEndTrace: (): null => null,
  };

  getChildContext(): LegacyChildContext {
    const context = this.context as MetaMetricsContextValue;
    return {
      trackEvent: context.trackEvent,
      bufferedTrace: context.bufferedTrace,
      bufferedEndTrace: context.bufferedEndTrace,
    };
  }

  render() {
    return this.props.children;
  }
}

/**
 * Props injected by withMetaMetrics HOC
 */
export type WithMetaMetricsProps = MetaMetricsContextValue;

/**
 * HOC for class components to access MetaMetricsContext
 *
 * @param WrappedComponent - Component to wrap
 * @returns Wrapped component with MetaMetrics context
 */
export function withMetaMetrics<Props extends Record<string, unknown>>(
  WrappedComponent: ComponentType<Props>,
): ComponentType<Omit<Props, keyof WithMetaMetricsProps>> {
  const WithMetaMetrics = (props: Omit<Props, keyof WithMetaMetricsProps>) => {
    const {
      trackEvent,
      bufferedTrace,
      bufferedEndTrace,
      onboardingParentContext,
    } = useContext(MetaMetricsContext);

    return (
      <WrappedComponent
        {...(props as Props)}
        trackEvent={trackEvent}
        bufferedTrace={bufferedTrace}
        bufferedEndTrace={bufferedEndTrace}
        onboardingParentContext={onboardingParentContext}
      />
    );
  };

  WithMetaMetrics.displayName = `withMetaMetrics(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithMetaMetrics;
}
