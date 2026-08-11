import { TrustSignalDisplayState, TrustSignalResult } from './useTrustSignals';

export function useOriginTrustSignals(_origin: string): TrustSignalResult {
  return {
    state: TrustSignalDisplayState.Unknown,
    label: null,
  };
}
