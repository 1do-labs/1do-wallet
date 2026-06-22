import { AuthorizationList } from '@metamask/transaction-controller';
import { type SentinelMeta } from '@metamask/smart-transactions-controller';
import { Hex } from '@metamask/utils';

export type RelaySubmitRequest = {
  authorizationList?: AuthorizationList;
  chainId: Hex;
  data: Hex;
  to: Hex;
  metadata?: SentinelMeta;
};

export type RelayWaitRequest = {
  chainId: Hex;
  interval: number;
  timeout?: number;
  uuid: string;
};

export type RelaySubmitResponse = {
  uuid: string;
};

export type RelayWaitResponse = {
  transactionHash?: Hex;
  status: string;
};

export enum RelayStatus {
  Pending = 'PENDING',
  Success = 'VALIDATED',
}

export const RELAY_RPC_METHOD = 'eth_sendRelayTransaction';
export const DEFAULT_RELAY_WAIT_TIMEOUT_MS = 2 * 60 * 1000;

export async function submitRelayTransaction(
  _request: RelaySubmitRequest,
): Promise<RelaySubmitResponse> {
  throw new Error('Transaction relay is disabled in 1do');
}

export async function waitForRelayResult(
  _request: RelayWaitRequest,
): Promise<RelayWaitResponse> {
  throw new Error('Transaction relay is disabled in 1do');
}

export async function isRelaySupported(_chainId: Hex): Promise<boolean> {
  return false;
}
