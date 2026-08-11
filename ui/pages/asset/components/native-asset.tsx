import React, { useContext } from 'react';
import { Token } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import { getAccountLink } from '@metamask/etherscan-link';
import { Hex, isCaipChainId } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { formatChainIdToCaip } from '../../../../shared/lib/chain-utils';
import {
  getRpcPrefsForCurrentProvider,
  getSelectedInternalAccount,
  getNativeCurrencyForChain,
} from '../../../selectors';
import { getProviderConfig } from '../../../../shared/lib/selectors/networks';
import { AssetType } from '../../../../shared/constants/transaction';
import { useIsOriginalNativeTokenSymbol } from '../../../hooks/useIsOriginalNativeTokenSymbol';
import { getURLHostName } from '../../../helpers/utils/util';
import { getMultichainAccountUrl } from '../../../helpers/utils/multichain/blockExplorer';
import { useMultichainSelector } from '../../../hooks/useMultichainSelector';
import { getMultichainNetwork } from '../../../selectors/multichain';
import { isEvmChainId } from '../../../../shared/lib/asset-utils';
import { getInternalAccountBySelectedAccountGroupAndCaip } from '../../../selectors/multichain-accounts/account-tree';
import AssetOptions from './asset-options';
import AssetPage from './asset-page';

const NativeAsset = ({ token, chainId }: { token: Token; chainId: Hex }) => {
  const { symbol } = token;
  const image = getNativeCurrencyForChain(chainId);
  const { type } = useSelector(getProviderConfig) ?? {};
  const { address } = useSelector(getSelectedInternalAccount);
  const rpcPrefs = useSelector(getRpcPrefsForCurrentProvider);

  const caipChainId = isCaipChainId(chainId)
    ? chainId
    : formatChainIdToCaip(chainId);
  // TODO BIP44: The new selector returns the accountId, when BIP44 is fully enabled we can fetch the asset higher up and ensure it's passed here
  const selectedAccount = useSelector((state) =>
    getInternalAccountBySelectedAccountGroupAndCaip(state, caipChainId),
  ) as InternalAccount;
  const multichainNetworkForSelectedAccount = useMultichainSelector(
    getMultichainNetwork,
    selectedAccount,
  );
  const isEvm = isEvmChainId(chainId);
  const addressLink = getMultichainAccountUrl(
    selectedAccount.address,
    multichainNetworkForSelectedAccount,
  );

  const accountLink = isEvm
    ? getAccountLink(address, chainId, rpcPrefs)
    : addressLink;
  const isOriginalNativeSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    symbol,
    type,
  );

  return (
    <AssetPage
      asset={{
        chainId,
        type: AssetType.native,
        symbol,
        image,
        decimals: token.decimals,
        isOriginalNativeSymbol: isOriginalNativeSymbol === true,
      }}
      optionsButton={
        <AssetOptions
          isNativeAsset={true}
          onClickBlockExplorer={() => {
            global.platform.openTab({
              url: accountLink,
            });
          }}
        />
      }
    />
  );
};

export default NativeAsset;
