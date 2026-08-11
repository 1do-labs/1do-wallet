import { TransactionMeta } from '@metamask/transaction-controller';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useAsyncResult } from '../../../hooks/useAsync';
import { forceUpdateMetamaskState } from '../../../store/actions';
import { updateSelectedGasFeeToken } from '../../../store/controller-actions/transaction-controller';
import { useConfirmContext } from '../context/confirm';

export function useAutomaticGasFeeTokenSelect() {
  const dispatch = useDispatch();
  const [firstCheck, setFirstCheck] = useState(true);

  const { currentConfirmation: transactionMeta } =
    useConfirmContext<TransactionMeta>();

  const {
    gasFeeTokens,
    id: transactionId,
    selectedGasFeeToken,
    excludeNativeTokenForFee,
  } = transactionMeta;

  const firstGasFeeTokenAddress = gasFeeTokens?.[0]?.tokenAddress;

  const selectFirstToken = useCallback(async () => {
    await updateSelectedGasFeeToken(transactionId, firstGasFeeTokenAddress);
    await forceUpdateMetamaskState(dispatch);
  }, [dispatch, transactionId, firstGasFeeTokenAddress]);

  /**
   * Selecting first gas fee token when `selectedGasFeeToken` is set but
   * actually doesn't exist in the gasFeeTokens list.
   * Since this logic is introduced with Tempo we use `excludeNativeTokenForFee`
   * (only be set for Tempo as of now) to reduce regression risks.
   */
  const hasSelectedGasFeeTokenNotInList =
    excludeNativeTokenForFee &&
    selectedGasFeeToken &&
    !gasFeeTokens?.find(
      ({ tokenAddress }) =>
        tokenAddress.toLocaleLowerCase() ===
        selectedGasFeeToken.toLocaleLowerCase(),
    );

  const shouldSelect =
    Boolean(firstGasFeeTokenAddress) && hasSelectedGasFeeTokenNotInList;

  useAsyncResult(async () => {
    if (!gasFeeTokens || !transactionId || !firstCheck) {
      return;
    }

    if (shouldSelect) {
      await selectFirstToken();
      setFirstCheck(false);
    }
  }, [
    shouldSelect,
    selectFirstToken,
    firstCheck,
    gasFeeTokens,
    transactionId,
    firstGasFeeTokenAddress,
  ]);
}
