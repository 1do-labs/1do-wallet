import { Hex } from '@metamask/utils';

export type SentinelNetwork = {
  name: string;
  group: string;
  chainID: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  network: string;
  explorer: string;
  confirmations: boolean;
  smartTransactions: boolean;
  relayTransactions: boolean;
  hidden: boolean;
  sendBundle: boolean;
};

export type SentinelNetworkMap = Record<string, SentinelNetwork>;

export function setSentinelApiAuth(
  _getter: (() => Promise<string | undefined>) | undefined,
): void {
  // 1do does not use MetaMask Sentinel or Transaction API authentication.
}

export function getSentinelApiHeaders(): HeadersInit {
  return {};
}

export async function getSentinelApiHeadersAsync(): Promise<
  Record<string, string>
> {
  return {};
}

export async function getSentinelNetworkFlags(
  _chainId: Hex,
): Promise<SentinelNetwork | undefined> {
  return undefined;
}

export function buildUrl(_subdomain: string): string {
  throw new Error('MetaMask Sentinel is disabled in 1do');
}

export async function isSendBundleSupported(_chainId: Hex): Promise<boolean> {
  return false;
}

export async function getSendBundleSupportedChains(
  chainIds: Hex[],
): Promise<Record<string, boolean>> {
  return chainIds.reduce<Record<string, boolean>>((acc, chainId) => {
    acc[chainId] = false;
    return acc;
  }, {});
}
