import { useState, useEffect, useCallback } from 'react';

import { Numeric } from '../../../../../shared/lib/Numeric';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import {
  fromTokenMinUnitsNumeric,
  isValidPositiveNumericString,
  normalizeAmount,
} from '../../utils/send';
import { useSendContext } from '../../context/send';
import { Asset, AssetStandard } from '../../types/send';
import { useBalance } from './useBalance';

export const useAmountValidation = () => {
  const t = useI18nContext();
  const { asset, value } = useSendContext();
  const { rawBalanceNumeric } = useBalance();
  const [amountError, setAmountError] = useState<string | undefined>(undefined);

  const setAndReturnError = useCallback((errorMessage: string | undefined) => {
    setAmountError(errorMessage);
    return errorMessage;
  }, []);

  const validateAmountAsync = useCallback(async () => {
    if (!value) {
      return setAndReturnError(undefined);
    }

    const normalizedValue = normalizeAmount(value);

    const validations = [
      () => validatePositiveNumericString(normalizedValue, t),
      () => validateERC1155Balance(asset as Asset, normalizedValue, t),
      () =>
        validateTokenBalance(
          normalizedValue,
          rawBalanceNumeric,
          asset?.decimals,
          t,
        ),
    ];

    for (const validation of validations) {
      const error = await Promise.resolve(validation());
      if (error) {
        return setAndReturnError(error);
      }
    }

    return setAndReturnError(undefined);
  }, [asset, rawBalanceNumeric, t, value, setAndReturnError]);

  useEffect(() => {
    validateAmountAsync();
  }, [validateAmountAsync]);

  return { amountError };
};

export function validateERC1155Balance(
  asset: Asset,
  value: string | undefined,
  t: ReturnType<typeof useI18nContext>,
): string | undefined {
  if (asset?.standard !== AssetStandard.ERC1155) {
    return undefined;
  }

  if (asset?.balance && value) {
    const valueInt = parseInt(value, 10);
    const balanceInt = parseInt(asset.balance.toString(), 10);
    if (valueInt > balanceInt) {
      return t('insufficientFundsSend');
    }
  }

  return undefined;
}

export function validateTokenBalance(
  amount: string,
  rawBalanceNumeric: Numeric,
  decimals: number | undefined,
  t: ReturnType<typeof useI18nContext>,
): string | undefined {
  const amountInputNumeric = fromTokenMinUnitsNumeric(amount, 10, decimals);
  if (rawBalanceNumeric.lessThan(amountInputNumeric)) {
    return t('insufficientFundsSend');
  }
  return undefined;
}

export function validatePositiveNumericString(
  value: string,
  t: ReturnType<typeof useI18nContext>,
): string | undefined {
  if (!isValidPositiveNumericString(value)) {
    return t('invalidValue');
  }
  return undefined;
}
