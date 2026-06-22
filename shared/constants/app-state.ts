import { NetworkClientId } from '@metamask/network-controller';
import type { Hex } from 'viem';
import { TraceName } from '../lib/trace';
import { MetaMetricsEventName } from './metametrics';

export enum AccountOverviewTabKey {
  Tokens = 'tokens',
  Nfts = 'nfts',
  Activity = 'activity',
  Runtime = 'runtime',
}

export type AccountOverviewTab = `${AccountOverviewTabKey}`;

export const ACCOUNT_OVERVIEW_TAB_KEY_TO_METAMETRICS_EVENT_NAME_MAP = {
  [AccountOverviewTabKey.Tokens]: MetaMetricsEventName.TokenScreenOpened,
  [AccountOverviewTabKey.Activity]: MetaMetricsEventName.ActivityScreenOpened,
} as const;

export const ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP = {
  [AccountOverviewTabKey.Tokens]: TraceName.AccountOverviewAssetListTab,
  [AccountOverviewTabKey.Nfts]: TraceName.AccountOverviewNftsTab,
  [AccountOverviewTabKey.Activity]: TraceName.AccountOverviewActivityTab,
  [AccountOverviewTabKey.Runtime]: TraceName.AccountOverviewRuntimeTab,
} as const;

export type CarouselSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
  dismissed?: boolean;
  href?: string;
  undismissable?: boolean;
  startDate?: string;
  endDate?: string;
  priorityPlacement?: boolean;
  variableName?: string;
  cardPlacement?: string;
};

export enum PasswordChangeToastType {
  Success = 'success',
  Errored = 'errored',
}

export enum ClaimSubmitToastType {
  Success = 'success',
  Errored = 'errored',
  DraftSaved = 'draft-saved',
  DraftSaveFailed = 'draft-save-failed',
  DraftDeleted = 'draft-deleted',
  DraftDeleteFailed = 'draft-delete-failed',
}

/**
 * Type of storage write error that occurred.
 * Used to show specific error messages in the storage error toast.
 */
export enum StorageWriteErrorType {
  /** A general storage write error */
  Default = 'default',
  /** Device is out of disk space */
  FileErrorNoSpace = 'file-error-no-space',
}

export type NetworkConnectionBanner =
  | { status: 'unknown' | 'available' }
  | {
      status: 'degraded' | 'unavailable';
      networkName: string;
      networkClientId: NetworkClientId;
      chainId: Hex;
      isDefaultRpcEndpoint: boolean;
      /**
       * The index of an available built-in default RPC endpoint in the
       * network's rpcEndpoints array. Only set for custom networks that have
       * a default endpoint available to switch to.
       */
      defaultRpcEndpointIndex?: number;
    };
