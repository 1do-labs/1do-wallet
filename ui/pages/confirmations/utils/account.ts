import { InternalAccount } from '@metamask/keyring-internal-api';

/**
 * Checks if an account is EVM-compatible for send operations.
 * This includes regular EVM accounts, hardware wallets, and private key accounts.
 *
 * @param account - The internal account object to check
 * @returns true if the account can be used for EVM transactions
 */
export const isEVMAccountForSend = (account: InternalAccount): boolean => {
  if (!account) {
    return false;
  }

  if (account.type.startsWith('eip155:')) {
    return true;
  }

  if (account.scopes?.some((scope) => scope.startsWith('eip155:'))) {
    return true;
  }

  return false;
};
