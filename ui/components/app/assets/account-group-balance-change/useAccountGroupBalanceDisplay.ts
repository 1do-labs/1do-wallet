import { type BalanceChangePeriod } from '@metamask/assets-controllers';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getPrivacyMode } from '../../../../selectors';
import { TextColor } from '../../../../helpers/constants/design-system';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../selectors/assets';
import { determineBalanceColor, isValidAmount } from './get-display-balance';

const BALANCE_COMPARISON_TOLERANCE = 1e-8;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const useAccountGroupBalanceDisplay = (period: BalanceChangePeriod) => {
  const privacyMode = useSelector(getPrivacyMode);

  // Memoized selector for the specified period
  const changeSelector = useMemo(
    () => selectBalanceChangeBySelectedAccountGroup(period),
    [period],
  );

  // Get the data
  const portfolioChange = useSelector(changeSelector);
  const selectedGroupBalance = useSelector(selectBalanceBySelectedAccountGroup);
  const { amountChangeInUserCurrency, percentChange } = portfolioChange ?? {};

  // Balance-change aggregation omits assets whose historical percentage is
  // unavailable. If that makes its current total differ from the complete
  // spot balance, the aggregate change is incomplete and must not be shown as
  // a real zero-percent change.
  const currentBalance = selectedGroupBalance?.totalBalanceInUserCurrency;
  const portfolioCurrentBalance = portfolioChange?.currentTotalInUserCurrency;
  const isHistoricalDataUnavailable =
    isFiniteNumber(currentBalance) &&
    currentBalance > 0 &&
    (!isFiniteNumber(portfolioCurrentBalance) ||
      Math.abs(currentBalance - (portfolioCurrentBalance as number)) >
        BALANCE_COMPARISON_TOLERANCE);

  const displayAmountChange = isHistoricalDataUnavailable
    ? undefined
    : (amountChangeInUserCurrency ?? 0);
  const displayPercentChange = isHistoricalDataUnavailable
    ? undefined
    : (percentChange ?? 0);

  const valueChange: number | undefined = [
    isValidAmount(displayAmountChange) && displayAmountChange,
    isValidAmount(displayPercentChange) && displayPercentChange,
  ].find((v): v is number => v !== false);

  const color = useMemo(() => {
    if (
      displayAmountChange === undefined &&
      displayPercentChange === undefined
    ) {
      return TextColor.textAlternative;
    }
    return determineBalanceColor(valueChange, privacyMode);
  }, [displayAmountChange, displayPercentChange, valueChange, privacyMode]);

  return {
    privacyMode,
    color,
    amountChange: displayAmountChange,
    percentChange:
      displayPercentChange === undefined
        ? undefined
        : displayPercentChange / 100,
    portfolioChange,
  };
};
