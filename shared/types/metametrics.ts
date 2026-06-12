import type { Provider } from '@metamask/network-controller';
import type { FetchGasFeeEstimateOptions } from '@metamask/gas-fee-controller';
import type { SmartTransaction } from '@metamask/smart-transactions-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from 'viem';
import type { MetaMetricsEventFragment } from '../constants/metametrics';
import type { TokenStandard } from '../constants/transaction';
import type { HardwareKeyringType } from '../constants/hardware-wallets';
import type { ScanAddressResponse } from '../lib/trust-signals';

export type TransactionMetricsRequest = {
  getTransactionUIMetricsFragment: (
    transactionId: string,
  ) => Partial<MetaMetricsEventFragment> | undefined;
  upsertTransactionUIMetricsFragment: (
    transactionId: string,
    payload: Partial<MetaMetricsEventFragment>,
  ) => void;
  getAccountBalance: (account: Hex, chainId: Hex) => Hex;
  getAccountType: (
    address: string,
  ) => Promise<'hardware' | 'imported' | 'MetaMask'>;
  getDeviceModel: (
    address: string,
  ) => Promise<'ledger' | 'lattice' | 'N/A' | string>;
  getHardwareTypeForMetric: (address: string) => Promise<HardwareKeyringType>;
  // According to the type GasFeeState returned from getEIP1559GasFeeEstimates
  // doesn't include some properties used in transaction metrics assembly,
  // hence returning any here to avoid type errors.
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEIP1559GasFeeEstimates(options?: FetchGasFeeEstimateOptions): Promise<any>;
  getParticipateInMetrics: () => boolean;
  getSelectedAddress: () => string;
  getTokenStandardAndDetails: () => Promise<{
    decimals?: string;
    balance?: string;
    symbol?: string;
    standard?: TokenStandard;
  }>;
  getTransaction: (transactionId: string) => TransactionMeta;
  provider: Provider;
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackEvent: (payload: any) => void;
  getIsSmartTransaction: (chainId: Hex) => boolean;
  getSmartTransactionsPreferenceEnabled: () => boolean;
  getSmartTransactionsEnabled: (chainId: Hex) => boolean;
  getSmartTransactionByMinedTxHash: (
    txhash: string | undefined,
  ) => SmartTransaction;
  getMethodData: (data: string) => Promise<{ name: string }>;
  getIsConfirmationAdvancedDetailsOpen: () => boolean;
  getHDEntropyIndex: () => number;
  getNetworkRpcUrl: (chainId: Hex) => string;
  getFeatureFlags: () => Record<string, unknown>;
  getPna25Acknowledged: () => boolean;
  getAddressSecurityAlertResponse: (
    cacheKey: string,
  ) => ScanAddressResponse | undefined;
  getSecurityAlertsEnabled: () => boolean;
};

export type TransactionEventPayload = {
  transactionMeta: TransactionMeta;
  actionId?: string;
  error?: string;
};

export type TransactionMetaEventPayload = TransactionMeta & {
  actionId?: string;
  error?: string;
};
