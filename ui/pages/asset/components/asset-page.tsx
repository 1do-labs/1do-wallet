import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  AvatarNetwork,
  AvatarNetworkSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react';
import { EthMethod } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isCaipChainId } from '@metamask/utils';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { formatChainIdToCaip } from '../../../../shared/lib/chain-utils';
import { AssetType } from '../../../../shared/constants/transaction';
import { endTrace, TraceName } from '../../../../shared/lib/trace';
import { hexToDecimal } from '../../../../shared/lib/conversion.utils';
import { toChecksumHexAddress } from '../../../../shared/lib/hexstring-utils';
import TokenCell from '../../../components/app/assets/token-cell';
import {
  TokenFiatDisplayInfo,
  type TokenWithFiatAmount,
} from '../../../components/app/assets/types';
import { ActivityList } from '../../../components/multichain/activity-v2/activity-list';
import CoinButtons from '../../../components/app/wallet-overview/coin-buttons';
import { AddressCopyButton } from '../../../components/multichain';
import { getCurrentCurrency } from '../../../ducks/metamask/metamask';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useMultichainSelector } from '../../../hooks/useMultichainSelector';
import { transitionBack } from '../../../components/ui/transition';
import { getShowFiatInTestnets } from '../../../selectors';
import {
  getAsset,
  getAssetsBySelectedAccountGroup,
} from '../../../selectors/assets';
import {
  getImageForChainId,
  getMultichainIsTestnet,
  getMultichainNetworkConfigurationsByChainId,
  getMultichainShouldShowFiat,
} from '../../../selectors/multichain';
import { getInternalAccountBySelectedAccountGroupAndCaip } from '../../../selectors/multichain-accounts/account-tree';
import { useSafeChains } from '../../settings/networks-tab/networks-form/use-safe-chains';
import { useCurrentPrice } from '../hooks/useCurrentPrice';
import { isNativeAsset, type Asset } from '../types/asset';
import { AssetMarketDetails } from './asset-market-details';
import AssetChart from './chart/asset-chart';
import TokenButtons from './token-buttons';

// TODO BIP44 Refactor: BIP-44 has been enabled and is stable, this page needs a significant refactor to remove confusing branching logic
const AssetPage = ({
  asset,
  optionsButton,
}: {
  asset: Asset;
  optionsButton: React.ReactNode;
}) => {
  const t = useI18nContext();
  const navigate = useNavigate();
  const currency = useSelector(getCurrentCurrency);
  const accountGroupIdAssets = useSelector(getAssetsBySelectedAccountGroup);
  const caipChainId = isCaipChainId(asset.chainId)
    ? asset.chainId
    : formatChainIdToCaip(asset.chainId);
  const selectedAccount = useSelector((state) =>
    getInternalAccountBySelectedAccountGroupAndCaip(state, caipChainId),
  ) as InternalAccount;

  useEffect(() => {
    endTrace({ name: TraceName.AssetDetails });
  }, []);

  const { chainId, type, symbol, name, image } = asset;

  const isSigningEnabled = selectedAccount.methods.includes(
    EthMethod.SignTransaction,
  );

  const isTestnet = useMultichainSelector(getMultichainIsTestnet);
  const shouldShowFiat = useMultichainSelector(getMultichainShouldShowFiat);
  const isMainnet = !isTestnet;
  // Check if show conversion is enabled
  const showFiatInTestnets = useSelector(getShowFiatInTestnets);

  const showFiat =
    shouldShowFiat && (isMainnet || (isTestnet && showFiatInTestnets));

  let address =
    (() => {
      if (type === AssetType.token) {
        return toChecksumHexAddress(asset.address);
      }
      return getNativeTokenAddress(chainId);
    })() ?? '';

  const shouldShowContractAddress = type === AssetType.token;
  const contractAddress = (() => {
    if (shouldShowContractAddress) {
      return toChecksumHexAddress(asset.address);
    }
    return '';
  })();

  const { currentPrice } = useCurrentPrice(asset);

  const assetWithBalance = accountGroupIdAssets[chainId]?.find(
    (item) => item.assetId.toLowerCase() === address.toLowerCase(),
  );

  address = assetWithBalance?.assetId || address;
  const assetId = assetWithBalance?.assetId || '';
  const balance = assetWithBalance?.balance ?? '0';
  const tokenFiatAmount = assetWithBalance?.fiat?.balance ?? 0;
  const tokenHexBalance = assetWithBalance?.rawBalance as string;

  const networkConfigurationsByChainId = useSelector(
    getMultichainNetworkConfigurationsByChainId,
  );
  const networkName = networkConfigurationsByChainId[chainId]?.name;
  const tokenChainImage = getImageForChainId(chainId);

  const bip44Asset = useSelector((state) => getAsset(state, address, chainId));
  const rwaData =
    assetWithBalance?.rwaData ?? bip44Asset?.rwaData ?? asset.rwaData;
  const updatedAsset: Asset = {
    ...asset,
    rwaData,
    balance: {
      value: hexToDecimal(tokenHexBalance),
      display: balance,
      fiat: String(tokenFiatAmount),
    },
  };

  const tokenWithFiatAmount = {
    address,
    chainId,
    symbol,
    image,
    title: name ?? symbol,
    tokenFiatAmount: showFiat ? tokenFiatAmount : null,
    string: balance ? balance.toString() : '',
    decimals: asset.decimals,
    aggregators:
      type === AssetType.token && asset.aggregators ? asset.aggregators : [],
    isNative: type === AssetType.native,
    balance,
    secondary: balance ? Number(balance) : 0,
    accountType: bip44Asset?.accountType,
    assetId: bip44Asset?.assetId ?? assetId,
    rwaData,
  };
  const { safeChains } = useSafeChains();
  const assetDisplayName =
    name && symbol && name !== symbol
      ? `${name} (${symbol})`
      : (name ?? symbol);
  const assetNameElement = (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      data-testid="asset-name"
    >
      {assetDisplayName}
    </Text>
  );

  const isUpdatedAssetNative = isNativeAsset(updatedAsset);
  const tokenAsset = isUpdatedAssetNative ? null : updatedAsset;

  return (
    <Box className="asset__content">
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        paddingBottom={3}
        paddingLeft={2}
        paddingRight={4}
        className="pt-4 sticky top-0 z-10 bg-background-default"
      >
        <Box flexDirection={BoxFlexDirection.Row}>
          <ButtonIcon
            color={IconColor.IconDefault}
            size={ButtonIconSize.Sm}
            ariaLabel={t('back') as string}
            iconName={IconName.ArrowLeft}
            onClick={() => transitionBack(() => navigate(-1))}
            className="asset-page__back-button"
          />
        </Box>
        {optionsButton}
      </Box>
      <Box paddingLeft={4}>{assetNameElement}</Box>
      <AssetChart
        chainId={chainId}
        address={address}
        currentPrice={currentPrice}
        currency={currency}
        asset={tokenWithFiatAmount as TokenFiatDisplayInfo}
      />
      <Box marginTop={4} paddingLeft={4} paddingRight={4}>
        {isUpdatedAssetNative ? (
          <CoinButtons
            {...{
              account: selectedAccount,
              trackingLocation: 'asset-page',
              isSigningEnabled,
              chainId,
            }}
          />
        ) : null}
        {tokenAsset ? <TokenButtons token={tokenAsset} /> : null}
      </Box>
      <Box flexDirection={BoxFlexDirection.Column} paddingTop={3}>
        <Text
          variant={TextVariant.HeadingSm}
          className="asset-page__balance-heading"
        >
          {t('yourBalance')}
        </Text>
        {[AssetType.token, AssetType.native].includes(type) && (
          <TokenCell
            key={`${symbol}-${address}`}
            token={tokenWithFiatAmount as TokenWithFiatAmount}
            safeChains={safeChains}
          />
        )}
        <Box marginTop={6} flexDirection={BoxFlexDirection.Column} gap={4}>
          {[AssetType.token, AssetType.native].includes(type) && (
            <Box
              flexDirection={BoxFlexDirection.Column}
              paddingLeft={4}
              paddingRight={4}
            >
              <Text
                variant={TextVariant.HeadingSm}
                className="asset-page__details-heading"
              >
                {t('tokenDetails')}
              </Text>
              <Box flexDirection={BoxFlexDirection.Column} gap={2}>
                {renderRow(
                  t('network'),
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                    data-testid="asset-network"
                  >
                    <AvatarNetwork
                      src={tokenChainImage}
                      name={networkName}
                      size={AvatarNetworkSize.Xs}
                    />
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {networkName}
                    </Text>
                  </Box>,
                )}
                {shouldShowContractAddress && (
                  <Box>
                    {renderRow(
                      t('contractAddress'),
                      <AddressCopyButton address={contractAddress} shorten />,
                    )}
                    <Box flexDirection={BoxFlexDirection.Column} gap={2}>
                      {asset.decimals !== undefined &&
                        renderRow(
                          t('tokenDecimal'),
                          <Text
                            variant={TextVariant.BodyMd}
                            fontWeight={FontWeight.Medium}
                          >
                            {asset.decimals}
                          </Text>,
                        )}
                      {asset.aggregators && asset.aggregators.length > 0 && (
                        <Box>
                          <Text
                            variant={TextVariant.BodyMd}
                            fontWeight={FontWeight.Medium}
                            color={TextColor.TextAlternative}
                          >
                            {t('tokenList')}
                          </Text>
                          <Text
                            variant={TextVariant.BodyMd}
                            fontWeight={FontWeight.Medium}
                          >
                            {asset.aggregators
                              .map((agg) =>
                                agg.replace(/^metamask$/iu, 'MetaMask'),
                              )
                              .join(', ')}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
          <AssetMarketDetails asset={updatedAsset} address={address} />
          <Box className="asset-page__divider" />
          <Box marginBottom={4}>
            <Text
              variant={TextVariant.HeadingSm}
              className="asset-page__activity-heading"
            >
              {t('yourActivity')}
            </Text>
            <ActivityList
              filter={{
                chainId: caipChainId,
                assetScope:
                  type === AssetType.native
                    ? {
                        kind: 'native',
                      }
                    : { kind: 'token', tokenAddress: address },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

function renderRow(leftColumn: string, rightColumn: ReactNode) {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
    >
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
      >
        {leftColumn}
      </Text>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {rightColumn}
      </Text>
    </Box>
  );
}

export default AssetPage;
