import { TransactionStatus } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

/**
 * With this list we can detect if a transaction is still in progress.
 */
export const IN_PROGRESS_TRANSACTION_STATUSES = [
  TransactionStatus.unapproved,
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
];

export const SIGNING_METHODS = Object.freeze([
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
]);

/**
 * Transaction Group Status is a MetaMask construct to track the status of groups
 * of transactions.
 */
export enum TransactionGroupStatus {
  /**
   * A cancel type transaction in the group was confirmed
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  cancelled = 'cancelled',
  /**
   * The primaryTransaction of the group has a status that is one of
   * TransactionStatus.approved, TransactionStatus.unapproved or
   * TransactionStatus.submitted
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  pending = 'pending',
}

/**
 * Types that are specific to the transaction approval amount.
 */
export enum TransactionApprovalAmountType {
  /** The user has edited the token amount. */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  custom = 'custom',
  /** The selected amount (either custom or dappProposed) is 0. */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  revoke = 'revoke',
  /** The dapp proposed token amount. */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  dappProposed = 'dapp_proposed',
}

/**
 * Transaction Group Category is a MetaMask construct to categorize the intent
 * of a group of transactions for purposes of displaying in the UI
 */
export enum TransactionGroupCategory {
  /**
   * Transaction group representing a request for an allowance of a token to
   * spend on the user's behalf.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  approval = 'approval',
  /**
   * Transaction group representing an interaction with a smart contract's methods.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interaction = 'interaction',
  /**
   * Transaction group representing a deposit/incoming transaction. This
   * category maps 1:1 with TransactionType.incoming.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  receive = 'receive',
  /**
   * Transaction group representing the network native currency being sent from
   * the user.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  send = 'send',
  /**
   * Transaction group representing a signature request This currently only
   * shows up in the UI when its pending user approval in the UI. Once the user
   * approves or rejects it will no longer show in activity.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  signatureRequest = 'signature-request',
  /**
   * Transaction group representing a token swap. This
   * transaction group's primary currency changes depending on context. If the
   * user is viewing an asset page for a token received from a swap, the
   * primary currency will be the received token. Otherwise the token exchanged
   * will be shown.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  swap = 'swap',
  /**
   * Transaction group representing a token swap where the final token is sent to another address.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  swapAndSend = 'swapAndSend',
  /**
   * Transaction group representing a token bridge,
   * where the final token is sent to another chain.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  bridge = 'bridge',
  /**
   * Transaction group representing a redeposit (a send to ourselves), mainly used for consolidation.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  redeposit = 'redeposit',
}

/**
 * The types of assets that a user can send
 *
 * @type {AssetTypes}
 */
export enum AssetType {
  /** The native asset for the current network, such as ETH */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  native = 'NATIVE',
  /** An ERC20 token */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  token = 'TOKEN',
  /** An ERC721 or ERC1155 token. */
  NFT = 'NFT',
  /**
   * A transaction interacting with a contract that isn't a token method
   * interaction will be marked as dealing with an unknown asset type.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  unknown = 'UNKNOWN',
}

/**
 * Describes the standard which a token conforms to.
 */
export enum TokenStandard {
  /**
   * @deprecated Use `ERC20` from `@metamask/controller-utils` instead.
   */
  ERC20 = 'ERC20',
  /**
   * @deprecated Use `ERC721` from `@metamask/controller-utils` instead.
   */
  ERC721 = 'ERC721',
  /**
   * @deprecated Use `ERC1155` from `@metamask/controller-utils` instead.
   */
  ERC1155 = 'ERC1155',
  /** Not a token, but rather the base asset of the selected chain. */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  none = 'NONE',
}

// To be moved to @metamask/rpc-errors in future.
export enum EIP5792ErrorCode {
  UnsupportedNonOptionalCapability = 5700,
  UnsupportedChainId = 5710,
  UnknownBundleId = 5730,
  RejectedUpgrade = 5750,
}

export const APPROVAL_METHOD_NAMES = [
  'approve',
  'increaseAllowance',
  'setApprovalForAll',
];

// 4-byte selector for setApprovalForAll(address,bool) (ERC-721 + ERC-1155)
export const SET_APPROVAL_FOR_ALL = '0xa22cb465' as const;

export const NATIVE_TOKEN_ADDRESS = '0x0'.padEnd(42, '0') as Hex;

export const POLYGON_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000001010' as Hex;
