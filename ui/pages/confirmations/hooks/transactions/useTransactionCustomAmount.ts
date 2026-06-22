import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, type DebouncedFunc } from 'lodash';
import { BigNumber } from 'bignumber.js';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { useConfirmContext } from '../../context/confirm';
import { getTokenAddress } from '../../utils/token-transfer';
import { useUpdateTokenAmount } from './useUpdateTokenAmount';

export const MAX_LENGTH = 28;
const DEBOUNCE_DELAY = 500;

export function useTransactionCustomAmount({
  currency,
  disableUpdate = false,
}: { currency?: string; disableUpdate?: boolean } = {}) {
  const [isInputChanged, setInputChanged] = useState(false);
  const [hasInput, setHasInput] = useState(false);
  const [amountHumanDebounced, setAmountHumanDebounced] = useState('0');

  const { currentConfirmation: transactionMeta } =
    useConfirmContext<TransactionMeta>();
  const { chainId } = transactionMeta ?? {};

  const tokenAddress = getTokenAddress(transactionMeta);
  const tokenFiatRate =
    useTokenFiatRate(tokenAddress, chainId as Hex, currency) ?? 1;
  const balanceUsd = 0;

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  const debounceRef = useRef<DebouncedFunc<(value: string) => void> | null>(
    null,
  );

  // Create and update debounced function
  useEffect(() => {
    // Cancel any existing debounced calls
    debounceRef.current?.cancel();

    // Create new debounced function
    const debouncedFn = debounce((value: string) => {
      setAmountHumanDebounced(value);
      if (!disableUpdate) {
        updateTokenAmountCallback(value);
      }
    }, DEBOUNCE_DELAY);

    // Store in ref
    debounceRef.current = debouncedFn;

    // Cleanup: cancel on unmount or when dependencies change
    return () => {
      debouncedFn.cancel();
    };
  }, [disableUpdate, updateTokenAmountCallback]);

  const [amountFiat, setAmountFiat] = useState('0');

  const amountHuman = useMemo(
    () =>
      new BigNumber(amountFiat || '0')
        .dividedBy(String(tokenFiatRate))
        .toString(10),
    [amountFiat, tokenFiatRate],
  );

  useEffect(() => {
    // Use ref directly to avoid re-running when callback is recreated
    if (debounceRef.current) {
      debounceRef.current(amountHuman);
    }
  }, [amountHuman]);

  useEffect(() => {
    if (amountHumanDebounced !== '0') {
      setInputChanged(true);
    }

    setHasInput(
      Boolean(amountHumanDebounced?.length) && amountHumanDebounced !== '0',
    );
  }, [amountHumanDebounced]);

  const updatePendingAmount = useCallback((value: string) => {
    let newAmount = value.replace(/^0+/u, '') || '0';

    if (newAmount.startsWith('.') || newAmount.startsWith(',')) {
      newAmount = `0${newAmount}`;
    }

    if (newAmount.length >= MAX_LENGTH) {
      return;
    }

    setAmountFiat(newAmount);
  }, []);

  const updatePendingAmountPercentage = useCallback(
    (percentage: number) => {
      if (!balanceUsd) {
        return;
      }

      const newAmountFiat = new BigNumber(percentage)
        .dividedBy(100)
        .times(String(balanceUsd))
        .round(2, BigNumber.ROUND_DOWN)
        .toString(10);

      setAmountFiat(newAmountFiat);

      const newAmountHuman = new BigNumber(newAmountFiat || '0')
        .dividedBy(String(tokenFiatRate))
        .toString(10);

      setAmountHumanDebounced(newAmountHuman);
      if (!disableUpdate) {
        updateTokenAmountCallback(newAmountHuman);
      }
    },
    [balanceUsd, disableUpdate, tokenFiatRate, updateTokenAmountCallback],
  );

  return {
    amountFiat,
    amountHuman,
    amountHumanDebounced,
    hasInput,
    isInputChanged,
    updatePendingAmount,
    updatePendingAmountPercentage,
  };
}
