import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { toChecksumAddress } from 'ethereumjs-util';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import {
  getSelectedAccount,
  getShouldHideZeroBalanceTokens,
  getPreferences,
  getMarketData,
  getChainIdsToPoll,
  selectAnyEnabledNetworksAreAvailable,
} from '../../../selectors';
import { getCurrentCurrency } from '../../../ducks/metamask/metamask';

// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { formatValue, isValidAmount } from '../../../../app/scripts/lib/util';
import { useFormatters } from '../../../hooks/useFormatters';
import {
  Display,
  TextColor,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { Box, SensitiveText } from '../../component-library';
import { getCalculatedTokenAmount1dAgo } from '../../../helpers/utils/util';
import { useAccountTotalCrossChainFiatBalance } from '../../../hooks/useAccountTotalCrossChainFiatBalance';
import { useGetFormattedTokensPerChain } from '../../../hooks/useGetFormattedTokensPerChain';
import { Skeleton } from '../../component-library/skeleton';
import { isZeroAmount } from '../../../helpers/utils/number-utils';
import { TokenWithBalance } from '../../multichain/asset-picker-amount/asset-picker-modal/types';

const hasNonZeroFiatBalance = (fiatBalance: string | undefined): boolean => {
  const numericBalance = Number(fiatBalance ?? 0);
  return Number.isFinite(numericBalance) && numericBalance !== 0;
};

export const AggregatedPercentageOverviewCrossChains = ({
  trailingChild,
}: {
  trailingChild: () => JSX.Element | null;
}) => {
  const { formatCurrencyCompact } = useFormatters();
  const fiatCurrency = useSelector(getCurrentCurrency);
  const { privacyMode } = useSelector(getPreferences);
  const selectedAccount = useSelector(getSelectedAccount);
  const shouldHideZeroBalanceTokens = useSelector(
    getShouldHideZeroBalanceTokens,
  );
  const crossChainMarketData = useSelector(getMarketData);
  const allChainIDs = useSelector(getChainIdsToPoll);
  const { formattedTokensWithBalancesPerChain } = useGetFormattedTokensPerChain(
    selectedAccount,
    shouldHideZeroBalanceTokens,
    false,
    allChainIDs,
  );
  const {
    totalFiatBalance: totalFiatCrossChains,
    tokenFiatBalancesCrossChains,
  } = useAccountTotalCrossChainFiatBalance(
    selectedAccount,
    formattedTokensWithBalancesPerChain,
  );
  const anyEnabledNetworksAreAvailable = useSelector(
    selectAnyEnabledNetworksAreAvailable,
  );

  const {
    totalFiat1dAgo: totalFiat1dAgoCrossChains,
    isHistoricalDataAvailable,
  } = useMemo(() => {
    const getPerChainTotalFiat1dAgo = (
      chainId: string,
      tokenFiatBalances: (string | undefined)[],
      tokensWithBalances: TokenWithBalance[],
    ) =>
      tokensWithBalances.reduce(
        (
          result,
          item: { address: string },
          idx: number,
        ): { totalFiat1dAgo: number; isHistoricalDataAvailable: boolean } => {
          const found =
            crossChainMarketData?.[chainId as Hex]?.[
              toChecksumAddress(item.address) as Hex
            ];
          const pricePercentChange1d = found?.pricePercentChange1d;

          const tokenFiat1dAgo = getCalculatedTokenAmount1dAgo(
            tokenFiatBalances[idx],
            pricePercentChange1d,
          );
          const hasRequiredHistoricalData =
            !hasNonZeroFiatBalance(tokenFiatBalances[idx]) ||
            Number.isFinite(pricePercentChange1d);

          return {
            totalFiat1dAgo: result.totalFiat1dAgo + Number(tokenFiat1dAgo),
            isHistoricalDataAvailable:
              result.isHistoricalDataAvailable && hasRequiredHistoricalData,
          };
        },
        { totalFiat1dAgo: 0, isHistoricalDataAvailable: true },
      );

    return tokenFiatBalancesCrossChains.reduce(
      (
        result: {
          totalFiat1dAgo: number;
          isHistoricalDataAvailable: boolean;
        },
        item: {
          chainId: string;
          nativeFiatValue: string;
          tokenFiatBalances: (string | undefined)[];
          tokensWithBalances: TokenWithBalance[];
        },
      ) => {
        const perChainERC20 = getPerChainTotalFiat1dAgo(
          item.chainId,
          item.tokenFiatBalances,
          item.tokensWithBalances,
        );
        const nativePricePercentChange1d =
          crossChainMarketData?.[item.chainId as Hex]?.[
            getNativeTokenAddress(item.chainId as Hex)
          ]?.pricePercentChange1d;

        const nativeFiat1dAgo = getCalculatedTokenAmount1dAgo(
          item.nativeFiatValue,
          nativePricePercentChange1d,
        );
        const hasNativeHistoricalData =
          !hasNonZeroFiatBalance(item.nativeFiatValue) ||
          Number.isFinite(nativePricePercentChange1d);

        return {
          totalFiat1dAgo:
            result.totalFiat1dAgo +
            perChainERC20.totalFiat1dAgo +
            Number(nativeFiat1dAgo),
          isHistoricalDataAvailable:
            result.isHistoricalDataAvailable &&
            perChainERC20.isHistoricalDataAvailable &&
            hasNativeHistoricalData,
        };
      },
      { totalFiat1dAgo: 0, isHistoricalDataAvailable: true },
    ); // Initial total1dAgo is 0
  }, [tokenFiatBalancesCrossChains, crossChainMarketData]);

  const totalCrossChainBalance: number = Number(totalFiatCrossChains);
  const crossChainTotalBalance1dAgo = totalFiat1dAgoCrossChains;

  const amountChangeCrossChains =
    totalCrossChainBalance - crossChainTotalBalance1dAgo;
  const percentageChangeCrossChains =
    crossChainTotalBalance1dAgo === 0
      ? 0
      : (amountChangeCrossChains / crossChainTotalBalance1dAgo) * 100;

  const formattedPercentChangeCrossChains = isHistoricalDataAvailable
    ? formatValue(
        amountChangeCrossChains === 0 ? 0 : percentageChangeCrossChains,
        true,
      )
    : '-';

  let formattedAmountChangeCrossChains = '-';
  if (isHistoricalDataAvailable && isValidAmount(amountChangeCrossChains)) {
    formattedAmountChangeCrossChains =
      (amountChangeCrossChains as number) >= 0 ? '+' : '';

    formattedAmountChangeCrossChains += formatCurrencyCompact(
      amountChangeCrossChains,
      fiatCurrency,
    );
  }

  let color = TextColor.textDefault;

  if (
    isHistoricalDataAvailable &&
    !privacyMode &&
    isValidAmount(amountChangeCrossChains)
  ) {
    if ((amountChangeCrossChains as number) === 0) {
      color = TextColor.textDefault;
    } else if ((amountChangeCrossChains as number) > 0) {
      color = TextColor.successDefault;
    } else {
      color = TextColor.errorDefault;
    }
  } else {
    color = TextColor.textAlternative;
  }

  return (
    <Skeleton
      isLoading={
        !anyEnabledNetworksAreAvailable &&
        isZeroAmount(formattedAmountChangeCrossChains)
      }
    >
      <Box display={Display.Flex} className="gap-1">
        <SensitiveText
          variant={TextVariant.bodyMdMedium}
          color={color}
          data-testid="aggregated-value-change"
          style={{ whiteSpace: 'pre' }}
          isHidden={privacyMode}
          ellipsis
          length="10"
        >
          {formattedAmountChangeCrossChains}
        </SensitiveText>
        <SensitiveText
          variant={TextVariant.bodyMdMedium}
          color={color}
          data-testid="aggregated-percentage-change"
          isHidden={privacyMode}
          ellipsis
          length="10"
        >
          {formattedPercentChangeCrossChains}
        </SensitiveText>
      </Box>
      {trailingChild()}
    </Skeleton>
  );
};
