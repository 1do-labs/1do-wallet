import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
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
import {
  BtcMethod,
  EthMethod,
  SolMethod,
  TrxAccountType,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  type CaipAssetType,
  isCaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AssetType } from '../../../../shared/constants/transaction';
import { isEvmChainId } from '../../../../shared/lib/asset-utils';
import { endTrace, TraceName } from '../../../../shared/lib/trace';
import { hexToDecimal } from '../../../../shared/lib/conversion.utils';
import { toChecksumHexAddress } from '../../../../shared/lib/hexstring-utils';
import TokenCell from '../../../components/app/assets/token-cell';
import { MarketClosedModal } from '../../../components/app/assets/market-closed-modal';
import {
  TokenFiatDisplayInfo,
  type TokenWithFiatAmount,
} from '../../../components/app/assets/types';
import { ActivityList } from '../../../components/multichain/activity-v2/activity-list';
import CoinButtons from '../../../components/app/wallet-overview/coin-buttons';
import { StockBadge } from '../../../components/app/assets/stock-badge/stock-badge';
import { AddressCopyButton } from '../../../components/multichain';
import { getCurrentCurrency } from '../../../ducks/metamask/metamask';
import { getIsNativeTokenBuyable } from '../../../ducks/ramps';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useMultichainSelector } from '../../../hooks/useMultichainSelector';
import { transitionBack } from '../../../components/ui/transition';
import {
  getIsBridgeChain,
  getIsSwapsChain,
  getShowFiatInTestnets,
} from '../../../selectors';
import {
  getAsset,
  getAssetsBySelectedAccountGroup,
  getMultichainNativeAssetType,
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
import { useRWAToken } from '../../bridge/hooks/useRWAToken';
import { isMusdToken } from '../../../components/app/musd/constants';
import { useMusdMerklPosition } from '../../../hooks/musd';
import { selectIsMusdConversionFlowEnabled } from '../../../selectors/musd';
import { AssetMarketDetails } from './asset-market-details';
import AssetChart from './chart/asset-chart';
import { MarketClosedActionButton } from './market-closed-action-button';
import MusdBonusSection from './musd-bonus-section';
import MusdConvertSection from './musd-convert-section';
import MusdPositionSection from './musd-position-section';
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
  const isBuyableChain = useSelector(getIsNativeTokenBuyable);
  const isEvm = isEvmChainId(asset.chainId);
  // TODO BIP44 Refactor: This selector does not work with BIP44 enabled, pass the information in the asset object
  const nativeAssetType = useSelector(getMultichainNativeAssetType);
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

  const isSwapsChain = useSelector((state) => getIsSwapsChain(state, chainId));
  const isBridgeChain = useSelector((state) =>
    getIsBridgeChain(state, chainId),
  );

  const isSigningEnabled =
    selectedAccount.methods.includes(EthMethod.SignTransaction) ||
    selectedAccount.methods.includes(EthMethod.SignUserOperation) ||
    selectedAccount.methods.includes(SolMethod.SignTransaction) ||
    selectedAccount.methods.includes(BtcMethod.SignPsbt) ||
    selectedAccount.type === TrxAccountType.Eoa;

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
        return isEvm ? toChecksumHexAddress(asset.address) : asset.address;
      }
      return isEvm ? getNativeTokenAddress(chainId) : nativeAssetType;
    })() ?? '';

  const shouldShowContractAddress = type === AssetType.token;
  const isMusdAssetPage =
    shouldShowContractAddress &&
    isEvm &&
    isMusdToken(asset.address ?? undefined);
  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabled,
  );
  const showMusdEnhancedPage = isMusdAssetPage && isMusdConversionFlowEnabled;
  const {
    aggregatedFiat: musdAggregatedFiat,
    hasAnyBalance: musdHasAnyBalance,
  } = useMusdMerklPosition(showMusdEnhancedPage);
  const contractAddress = (() => {
    if (shouldShowContractAddress) {
      return isEvm
        ? toChecksumHexAddress(asset.address)
        : parseCaipAssetType(address as CaipAssetType).assetReference;
    }
    return '';
  })();

  const { currentPrice } = useCurrentPrice(asset);

  const assetWithBalance = accountGroupIdAssets[chainId]?.find(
    (item) =>
      item.assetId.toLowerCase() === address.toLowerCase() ||
      // TODO: This is a workaround for non-evm native assets, as the address that is received here is blank
      (!address && !isEvm && item.isNative),
  );

  // Display historical data for non-evm token without a balance
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
    address: isEvm ? address : assetId,
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
  const { isStockToken: checkIsStockToken, isTokenTradingOpen } = useRWAToken();
  const isStockToken = checkIsStockToken(updatedAsset);
  const isMarketClosed = isStockToken && !isTokenTradingOpen(updatedAsset);
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

  const [isMarketClosedModalOpen, setIsMarketClosedModalOpen] = useState(false);
  const handleOpenMarketClosedModal = () => {
    setIsMarketClosedModalOpen(true);
  };

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
      <Box paddingLeft={4}>
        {isStockToken ? (
          <Box alignItems={BoxAlignItems.Center} gap={2}>
            {assetNameElement}
            <StockBadge isMarketClosed={isMarketClosed} />
          </Box>
        ) : (
          assetNameElement
        )}
      </Box>
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
              isBuyableChain,
              isSigningEnabled,
              isSwapsChain,
              isBridgeChain,
              chainId,
              disableSendForNonEvm: true,
            }}
          />
        ) : null}
        {tokenAsset ? (
          <TokenButtons
            token={tokenAsset}
            disableSendForNonEvm
            isMarketClosed={isMarketClosed}
          />
        ) : null}
        {isMarketClosed && tokenAsset ? (
          <Box marginTop={4}>
            <MarketClosedActionButton onClick={handleOpenMarketClosedModal} />
          </Box>
        ) : null}
      </Box>
      <Box flexDirection={BoxFlexDirection.Column} paddingTop={3}>
        {showMusdEnhancedPage ? (
          <>
            <MusdPositionSection
              balanceDisplay={balance}
              fiatValue={showFiat ? tokenFiatAmount : null}
              showFiat={showFiat}
            />
            <MusdBonusSection
              chainId={chainId}
              tokenAddress={contractAddress as `0x${string}`}
              positionFiatValue={showFiat ? musdAggregatedFiat : null}
              showFiat={showFiat}
              hasPositiveBalance={musdHasAnyBalance}
            />
            <MusdConvertSection />
          </>
        ) : (
          <>
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
          </>
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
                      {isMusdAssetPage
                        ? renderRow(
                            t('tokenStandard'),
                            <Text
                              variant={TextVariant.BodyMd}
                              fontWeight={FontWeight.Medium}
                            >
                              ERC-20
                            </Text>,
                          )
                        : null}
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
                        ...(!isEvm && { caipAssetType: address }),
                      }
                    : { kind: 'token', tokenAddress: address },
              }}
            />
          </Box>
        </Box>
      </Box>
      <MarketClosedModal
        isOpen={isMarketClosedModalOpen}
        onClose={() => setIsMarketClosedModalOpen(false)}
      />
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
