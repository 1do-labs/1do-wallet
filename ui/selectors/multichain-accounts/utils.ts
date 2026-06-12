import { CaipChainId } from '@metamask/utils';
import { AccountGroupId, AccountWalletId } from '@metamask/account-api';

/**
 * Sanitizes an EIP-155 chain ID to the correct format.
 *
 * @param chainId - The chain ID to sanitize.
 * @returns The sanitized chain ID.
 */
export const getSanitizedChainId = (chainId: CaipChainId) => {
  if (chainId.startsWith('eip155')) {
    return 'eip155:0';
  }
  return chainId;
};

/**
 * Extracts the wallet ID from an account group ID.
 *
 * @param accountGroupId - The account group ID to extract the wallet ID from.
 * @returns The extracted wallet ID.
 */
export const extractWalletIdFromGroupId = (
  accountGroupId: AccountGroupId,
): AccountWalletId => {
  if (!accountGroupId) {
    throw new Error('Account group ID is required');
  }

  return accountGroupId.split('/')[0] as AccountWalletId;
};
