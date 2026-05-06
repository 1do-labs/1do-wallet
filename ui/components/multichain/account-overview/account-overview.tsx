import React from 'react';
import { useSelector } from 'react-redux';
import { EthAccountType } from '@metamask/keyring-api';
import { getSelectedInternalAccount } from '../../../selectors';
import { AccountOverviewEth } from './account-overview-eth';
import { AccountOverviewUnknown } from './account-overview-unknown';
import { AccountOverviewCommonProps } from './common';

export type AccountOverviewProps = AccountOverviewCommonProps & {
  useExternalServices: boolean;
};

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export function AccountOverview(props: AccountOverviewProps) {
  const account = useSelector(getSelectedInternalAccount);

  const renderAccountOverviewOption = () => {
    switch (account.type) {
      case EthAccountType.Eoa:
      case EthAccountType.Erc4337:
        return <AccountOverviewEth {...props}></AccountOverviewEth>;
      default:
        return <AccountOverviewUnknown {...props}></AccountOverviewUnknown>;
    }
  };

  return <>{renderAccountOverviewOption()}</>;
}
