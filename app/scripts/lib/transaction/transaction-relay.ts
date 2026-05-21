import { AuthorizationList } from '@metamask/transaction-controller';
import { type SentinelMeta } from '@metamask/smart-transactions-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import { jsonRpcRequest } from '../../../../shared/lib/rpc.utils';
import getFetchWithTimeout from '../../../../shared/lib/fetch-with-timeout';
import {
  buildUrl,
  getSentinelApiHeadersAsync,
  getSentinelNetworkFlags,
} from './sentinel-api';

const log = createProjectLogger('transaction-relay');

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
  request: RelaySubmitRequest,
): Promise<RelaySubmitResponse> {
  const { chainId } = request;

  const url = await getRelayUrl(chainId);

  if (!url) {
    throw new Error(`Chain not supported by transaction relay - ${chainId}`);
  }

  log('Request', url, request);

  const headers = await getSentinelApiHeadersAsync();

  const response = (await jsonRpcRequest(url, RELAY_RPC_METHOD, [request], {
    headers,
  })) as RelaySubmitResponse;

  log('Response', response);

  return response;
}

export async function waitForRelayResult(
  request: RelayWaitRequest,
): Promise<RelayWaitResponse> {
  const {
    chainId,
    interval,
    timeout = DEFAULT_RELAY_WAIT_TIMEOUT_MS,
    uuid,
  } = request;

  const baseUrl = await getRelayUrl(chainId);

  if (!baseUrl) {
    throw new Error(`Chain not supported by transaction relay - ${chainId}`);
  }

  const url = `${baseUrl}smart-transactions/${uuid}`;

  return new Promise<RelayWaitResponse>((resolve, reject) => {
    const timers: {
      intervalId?: ReturnType<typeof setInterval>;
      timeoutId?: ReturnType<typeof setTimeout>;
    } = {};

    const cleanup = () => {
      if (timers.intervalId) {
        clearInterval(timers.intervalId);
      }

      if (timers.timeoutId) {
        clearTimeout(timers.timeoutId);
      }
    };

    timers.intervalId = setInterval(async () => {
      try {
        const headers = await getSentinelApiHeadersAsync();
        const result = await pollResult(url, headers);

        if (
          result.status !== RelayStatus.Pending &&
          (result.status !== RelayStatus.Success || result.transactionHash)
        ) {
          cleanup();
          resolve(result);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    }, interval);

    timers.timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Transaction relay timed out after ${timeout}ms`));
    }, timeout);
  });
}

export async function isRelaySupported(chainId: Hex): Promise<boolean> {
  return Boolean(await getRelayUrl(chainId));
}

async function pollResult(
  url: string,
  headers: HeadersInit = {},
): Promise<RelayWaitResponse> {
  log('Polling request', url);

  const response = await getFetchWithTimeout()(url, { headers });

  log('Polling response', response);

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Failed to fetch relay transaction status: ${response.status} - ${errorBody}`,
    );
  }

  const data = await response.json();
  const transaction = data?.transactions[0];
  const { hash: transactionHash, status } = transaction || {};

  return {
    status,
    transactionHash,
  };
}

async function getRelayUrl(chainId: Hex): Promise<string | undefined> {
  const networkData = await getSentinelNetworkFlags(chainId);

  if (!networkData?.relayTransactions) {
    log('Chain is not supported', chainId);
    return undefined;
  }

  return buildUrl(networkData.network);
}
