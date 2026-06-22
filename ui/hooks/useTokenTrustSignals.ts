import { TrustSignalDisplayState, TrustSignalResult } from './useTrustSignals';

export function useTokenTrustSignalsForAddresses(
  chainId: string | undefined,
  tokenAddresses: string[] | undefined,
): TrustSignalResult[] {
  if (!chainId || !tokenAddresses || !Array.isArray(tokenAddresses)) {
    return [];
  }

  return tokenAddresses.map(() => ({
    state: TrustSignalDisplayState.Unknown,
    label: null,
  }));
}
