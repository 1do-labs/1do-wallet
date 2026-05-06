import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { getMetaMaskAccountsOrdered } from '../../selectors';

type UseAccountCreationOnNetworkChangeReturn = {
  hasAnyAccountsInNetwork: (chainId: CaipChainId) => boolean;
};

export const useAccountCreationOnNetworkChange =
  (): UseAccountCreationOnNetworkChangeReturn => {
    const accounts = useSelector(getMetaMaskAccountsOrdered);

    const hasAnyAccountsInNetwork = (chainId: CaipChainId) => {
      return accounts.some(({ scopes }: { scopes: CaipChainId[] }) =>
        scopes.includes(chainId),
      );
    };

    return { hasAnyAccountsInNetwork };
  };
