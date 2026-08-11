import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type CaipChainId, type Hex } from '@metamask/utils';
import TokenCell from '../token-cell';
import { ASSET_CELL_HEIGHT } from '../constants';
import {
  getPreferences,
  getShouldHideZeroBalanceTokens,
} from '../../../../selectors';
import { endTrace, TraceName } from '../../../../../shared/lib/trace';
import { type TokenWithFiatAmount } from '../types';
import { getAllEnabledNetworksForAllNamespaces } from '../../../../selectors/multichain/networks';
import {
  getAssetsBySelectedAccountGroup,
  selectAccountGroupBalanceForEmptyState,
} from '../../../../selectors/assets';
import { SafeChain } from '../../../../pages/settings/networks-tab/networks-form/use-safe-chains';
import { isEvmChainId } from '../../../../../shared/lib/asset-utils';
import { sortAssetsWithPriority } from '../util/sortAssetsWithPriority';
import { VirtualizedList } from '../../../ui/virtualized-list/virtualized-list';

type TokenListProps = {
  onTokenClick: (chainId: string, address: string) => void;
  safeChains?: SafeChain[];
};

const tokenValueSortConfig = {
  key: 'tokenFiatAmount',
  order: 'dsc',
  sortCallback: 'stringNumeric',
} as const;

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
function TokenList({ onTokenClick, safeChains }: TokenListProps) {
  const { privacyMode } = useSelector(getPreferences);
  const shouldHideZeroBalanceTokens = useSelector(
    getShouldHideZeroBalanceTokens,
  );
  const hasBalance = useSelector(selectAccountGroupBalanceForEmptyState);

  const accountGroupIdAssets = useSelector(getAssetsBySelectedAccountGroup);

  const allEnabledNetworksForAllNamespaces = useSelector(
    getAllEnabledNetworksForAllNamespaces,
  );

  const sortedFilteredTokens = useMemo(() => {
    const accountAssetsPreSort = Object.entries(accountGroupIdAssets).flatMap(
      ([chainId, assets]) => {
        if (!allEnabledNetworksForAllNamespaces.includes(chainId)) {
          return [];
        }

        // Mapping necessary to comply with the type. Fields will be overriden with useTokenDisplayInfo
        return assets.filter((asset) => {
          if (shouldHideZeroBalanceTokens && asset.balance === '0') {
            return false;
          }
          return true;
        });
      },
    );

    const accountAssets = sortAssetsWithPriority(
      accountAssetsPreSort,
      tokenValueSortConfig,
    );

    return accountAssets.map((asset) => {
      const token: TokenWithFiatAmount = {
        ...asset,
        tokenFiatAmount: asset.fiat?.balance,
        secondary: null,
        title: asset.name,
        address: 'address' in asset ? asset.address : (asset.assetId as Hex),
        chainId: asset.chainId as Hex,
      };

      return token;
    });
  }, [
    accountGroupIdAssets,
    allEnabledNetworksForAllNamespaces,
    shouldHideZeroBalanceTokens,
  ]);

  useEffect(() => {
    if (sortedFilteredTokens) {
      endTrace({ name: TraceName.AccountOverviewAssetListTab });
    }
  }, [sortedFilteredTokens]);

  const handleTokenClick = (token: TokenWithFiatAmount) => () => {
    // Ensure token has a valid chainId before proceeding
    if (!token.chainId) {
      return;
    }

    // TODO BIP44 Refactor: The route requires evm native tokens to not pass the address
    const tokenAddress =
      isEvmChainId(token.chainId) && token.isNative ? '' : token.address;

    onTokenClick(token.chainId, tokenAddress);
  };

  // Disable virtualization when empty balance state is shown
  if (!hasBalance) {
    return (
      <div className="token-list-non-virtualized">
        {sortedFilteredTokens.map((token) => {
          return (
            <TokenCell
              key={`${token.chainId}-${token.symbol}-${token.address}`}
              token={token}
              privacyMode={privacyMode}
              onClick={handleTokenClick(token)}
              safeChains={safeChains}
            />
          );
        })}
      </div>
    );
  }

  return (
    <VirtualizedList
      data={sortedFilteredTokens}
      estimatedItemSize={ASSET_CELL_HEIGHT}
      overscan={10}
      keyExtractor={(token) =>
        `${token.chainId}-${token.symbol}-${token.address}`
      }
      renderItem={({ item: token }) => {
        return (
          <TokenCell
            token={token}
            privacyMode={privacyMode}
            onClick={handleTokenClick(token)}
            safeChains={safeChains}
          />
        );
      }}
    />
  );
}

export default React.memo(TokenList);
