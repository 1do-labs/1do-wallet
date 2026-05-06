import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  getAccountGroupNameByInternalAccount,
  getToChain,
} from '../../../ducks/bridge/selectors';
import {
  getInternalAccountBySelectedAccountGroupAndCaip,
  getWalletIdAndNameByAccountAddress,
} from '../../../selectors/multichain-accounts/account-tree';
import type { DestinationAccount } from '../prepare/types';

/**
 * Hook to provide the default internal destination account for a bridge quote, and the state for the destination account picker modal
 *
 * @returns The default destination account and its setter, and the state for the
 * destination account picker modal and its setter.
 */
export const useDestinationAccount = () => {
  const [selectedDestinationAccount, setSelectedDestinationAccount] =
    useState<DestinationAccount | null>(null);
  const [isDestinationAccountPickerOpen, setIsDestinationAccountPickerOpen] =
    useState(false);
  const toChain = useSelector(getToChain);

  // For EVM-only bridging, use the destination chain's internal account.
  const defaultInternalDestinationAccount = useSelector((state) =>
    toChain?.chainId
      ? getInternalAccountBySelectedAccountGroupAndCaip(
          state,
          formatChainIdToCaip(toChain.chainId),
        )
      : null,
  );

  const displayName = useSelector((state) =>
    getAccountGroupNameByInternalAccount(
      state,
      defaultInternalDestinationAccount,
    ),
  );

  const walletName = useSelector((state) =>
    defaultInternalDestinationAccount?.address
      ? getWalletIdAndNameByAccountAddress(
          state,
          defaultInternalDestinationAccount?.address,
        )?.name
      : null,
  );

  useEffect(() => {
    if (defaultInternalDestinationAccount) {
      setSelectedDestinationAccount({
        ...defaultInternalDestinationAccount,
        walletName: walletName ?? '',
        isExternal: false,
        displayName: displayName ?? '',
      });
      setIsDestinationAccountPickerOpen(false);
    } else {
      // Open the account picker when no matching destination account is available.
      setSelectedDestinationAccount(null);
      setIsDestinationAccountPickerOpen(true);
    }
  }, [defaultInternalDestinationAccount, displayName, walletName]);

  return {
    selectedDestinationAccount,
    setSelectedDestinationAccount,
    isDestinationAccountPickerOpen,
    setIsDestinationAccountPickerOpen,
  };
};
