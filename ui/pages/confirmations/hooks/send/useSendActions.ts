import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import {
  CONFIRM_TRANSACTION_ROUTE,
  DEFAULT_ROUTE,
  PREVIOUS_ROUTE,
  SEND_ROUTE,
} from '../../../../helpers/constants/routes';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { SendPages } from '../../constants/send';
import { ConfirmationLoader } from '../useConfirmationNavigation';
import {
  normalizeAmount,
  submitEvmTransaction,
} from '../../utils/send';
import { useSendContext } from '../../context/send';
import { useSendType } from './useSendType';

export const useSendActions = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    asset,
    chainId,
    from,
    hexData,
    maxValueMode,
    toResolved: to,
    updateNonEVMSubmitError,
    value,
  } = useSendContext();
  const { isEvmSendType } = useSendType();

  const handleSubmit = useCallback(async () => {
    if (!asset) {
      return;
    }
    const toAddress = to;

    // Clear any previous submit error
    updateNonEVMSubmitError(undefined);

    if (isEvmSendType) {
      dispatch(
        await submitEvmTransaction({
          asset,
          chainId: chainId as Hex,
          from: from as Hex,
          hexData: hexData as Hex,
          to: toAddress as Hex,
          value: normalizeAmount(value),
        }),
      );
      const params = new URLSearchParams();
      if (maxValueMode) {
        params.set('maxValueMode', String(maxValueMode));
      }
      params.set('loader', ConfirmationLoader.Send);
      const route = `${CONFIRM_TRANSACTION_ROUTE}?${params.toString()}`;
      navigate(route);
    } else {
      navigate(`${SEND_ROUTE}/${SendPages.LOADER}`);
      updateNonEVMSubmitError(t('transactionError'));
      navigate(-1);
    }
  }, [
    asset,
    chainId,
    dispatch,
    from,
    hexData,
    navigate,
    isEvmSendType,
    maxValueMode,
    t,
    to,
    updateNonEVMSubmitError,
    value,
  ]);

  const handleBack = useCallback(() => {
    navigate(PREVIOUS_ROUTE);
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate(DEFAULT_ROUTE);
  }, [navigate]);

  return { handleSubmit, handleCancel, handleBack };
};
