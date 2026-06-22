'use no memo';
// TODO: Fix - Calling `useTrustSignals` from `useTrustSignal`, which is not a component, violates the rules of hooks.

import { NameType } from '@metamask/name-controller';

export type UseTrustSignalRequest = {
  value: string;
  type: NameType;
  chainId?: string;
};

export enum TrustSignalDisplayState {
  Loading = 'Loading',
  Malicious = 'malicious',
  Petname = 'petname',
  Verified = 'verified',
  Warning = 'warning',
  Recognized = 'recognized',
  Unknown = 'unknown',
}

export type TrustSignalResult = {
  state: TrustSignalDisplayState;
  label: string | null;
};

/**
 * Hook to retrieve trust signal information for a single address.
 *
 * This hook fetches security alert data for a given Ethereum address and chain,
 * and returns the trust state (e.g., malicious, verified, unknown) along with
 * any associated label.
 *
 * @param value - The address or value to check for trust signals.
 * @param type - The type of the value (e.g., NameType.ETHEREUM_ADDRESS).
 * @param chainId - The chain ID where the address is being used. While technically
 * optional for compatibility, omitting this parameter will result in an unknown
 * trust signal being returned.
 * @returns An object containing the trust signal display state and label.
 */
export function useTrustSignal(
  value: string,
  type: NameType,
  chainId: string | undefined,
): TrustSignalResult {
  return useTrustSignals([{ value, type, chainId }])[0];
}

export function useTrustSignals(
  requests: UseTrustSignalRequest[],
): TrustSignalResult[] {
  return requests.map(() => ({
    state: TrustSignalDisplayState.Unknown,
    label: null,
  }));
}
