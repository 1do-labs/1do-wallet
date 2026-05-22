import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  TransactionEnvelopeType,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  isAccountUpgraded,
  EIP_7702_REVOKE_ADDRESS,
  getAccountDelegationAddress,
} from '../../../../shared/lib/eip7702-utils';
import {
  addTransactionAndRouteToConfirmationPage,
  getCode,
} from '../../../store/actions';
import { selectDefaultRpcEndpointByChainId } from '../../../selectors';
import { useConfirmationNavigation } from './useConfirmationNavigation';

export function useEIP7702Account(
  { chainId, onRedirect }: { chainId: Hex; onRedirect?: () => void } = {
    chainId: '0x',
  },
) {
  const dispatch = useDispatch();
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const { confirmations, navigateToId } = useConfirmationNavigation();
  const defaultRpcEndpoint = useSelector((state) =>
    selectDefaultRpcEndpointByChainId(state, chainId),
  ) ?? { defaultRpcEndpoint: {} };
  const { networkClientId } = defaultRpcEndpoint as { networkClientId: string };

  const isRedirectPending = confirmations.some(
    (conf) => conf.id === transactionId,
  );

  const downgradeAccount = useCallback(
    async (address: Hex) => {
      const transactionMeta = (await dispatch(
        addTransactionAndRouteToConfirmationPage(
          {
            authorizationList: [
              {
                address: EIP_7702_REVOKE_ADDRESS,
              },
            ],
            from: address,
            to: address,
            type: TransactionEnvelopeType.setCode,
          },
          {
            networkClientId,
            requireApproval: true,
            type: TransactionType.revokeDelegation,
          },
        ),
      )) as unknown as TransactionMeta;

      if (!transactionMeta?.id) {
        throw new Error('Transaction ID is missing from transaction metadata');
      }

      setTransactionId(transactionMeta.id);
    },
    [dispatch, networkClientId],
  );

  const upgradeAccount = useCallback(
    async (address: Hex, upgradeContractAddress: Hex) => {
      const transactionMeta = (await dispatch(
        addTransactionAndRouteToConfirmationPage(
          {
            authorizationList: [
              {
                address: upgradeContractAddress,
              },
            ],
            from: address,
            to: address,
            type: TransactionEnvelopeType.setCode,
          },
          {
            networkClientId,
            requireApproval: true,
            type: TransactionType.batch,
          },
        ),
      )) as unknown as TransactionMeta;

      if (!transactionMeta?.id) {
        throw new Error('Transaction ID is missing from transaction metadata');
      }

      setTransactionId(transactionMeta.id);
    },
    [dispatch, networkClientId],
  );

  const isUpgraded = useCallback(
    async (address: Hex) => {
      return isAccountUpgraded(address, networkClientId, getCode);
    },
    [networkClientId],
  );

  const getDelegationAddress = useCallback(
    async (address: Hex) => {
      return getAccountDelegationAddress(address, networkClientId, getCode);
    },
    [networkClientId],
  );

  useEffect(() => {
    if (isRedirectPending) {
      navigateToId(transactionId);
      onRedirect?.();
    }
  }, [isRedirectPending, navigateToId, transactionId, onRedirect]);

  return { isUpgraded, getDelegationAddress, downgradeAccount, upgradeAccount };
}

export { EIP_7702_REVOKE_ADDRESS };
