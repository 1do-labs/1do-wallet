import React, { useCallback, useMemo, useState } from 'react';
import { Hex } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { TransactionMeta } from '@metamask/transaction-controller';
import {
  Box,
  ButtonLink,
  ButtonLinkSize,
  ButtonPrimary,
  ButtonPrimarySize,
  Text,
} from '../../component-library';
import {
  AlignItems,
  Display,
  JustifyContent,
  BlockSize,
  TextVariant,
  TextColor,
  BackgroundColor,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import ZENDESK_URLS from '../../../helpers/constants/zendesk-url';
import { useEIP7702Networks } from '../../../pages/confirmations/hooks/useEIP7702Networks';
import { useEIP7702Account } from '../../../pages/confirmations/hooks/useEIP7702Account';
import { useBatchAuthorizationRequests } from '../../../pages/confirmations/hooks/useBatchAuthorizationRequests';
import { SmartContractAccountToggle } from '../smart-contract-account-toggle';
import Preloader from '../../ui/icon/preloader';
import { CONFIRM_TRANSACTION_ROUTE } from '../../../helpers/constants/routes';
import { unconfirmedTransactionsListSelector } from '../../../selectors';
import { setRedirectAfterDefaultPage } from '../../../ducks/history/history';
import { getCurrentChainId } from '../../../../shared/lib/selectors/networks';
import { useOneDoSmartAccountStatus } from '../../../hooks/accounts/useOneDoSmartAccountStatus';

type SmartContractAccountToggleSectionProps = {
  address: string;
  returnToPage?: string; // Optional page to return to after transaction
};

export const SmartContractAccountToggleSection = ({
  address,
  returnToPage,
}: SmartContractAccountToggleSectionProps) => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [pendingUpgrade, setPendingUpgrade] = useState(false);
  const { network7702List, pending } = useEIP7702Networks(address);
  const selectedChainId = useSelector(getCurrentChainId);
  const currentNetwork =
    network7702List?.find(
      (network) =>
        network.chainIdHex === selectedChainId &&
        network.upgradeContractAddress,
    ) ?? network7702List?.find((network) => network.upgradeContractAddress);
  const targetChainId = currentNetwork?.chainIdHex ?? ('0x' as Hex);
  const { upgradeAccount } = useEIP7702Account({
    chainId: targetChainId,
    onRedirect: () => null,
  });
  const { hasPendingRequests } = useBatchAuthorizationRequests(
    address as Hex,
    targetChainId,
  );
  const {
    isActive,
    pendingUpgradeTransaction,
    refresh: refreshSmartAccountStatus,
    setActive: setSmartAccountActive,
  } = useOneDoSmartAccountStatus({
    address: address as Hex,
    chainId: targetChainId,
    enabled: Boolean(currentNetwork?.upgradeContractAddress),
  });
  const unconfirmedTransactions = useSelector(
    unconfirmedTransactionsListSelector,
  );

  const findAndRedirectToTransaction = useCallback(() => {
    if (pendingUpgradeTransaction?.id) {
      navigate(`${CONFIRM_TRANSACTION_ROUTE}/${pendingUpgradeTransaction.id}`);
      return true;
    }

    const matchingTransactions = unconfirmedTransactions.filter(
      (tx: TransactionMeta) =>
        tx.txParams?.from === address && tx.chainId === targetChainId,
    );

    if (matchingTransactions.length === 0) {
      return false;
    }

    const latestTransaction = matchingTransactions.sort(
      (a: TransactionMeta, b: TransactionMeta) => b.time - a.time,
    )[0];

    if (returnToPage) {
      const redirectPath =
        returnToPage === '/account-details'
          ? `${returnToPage}/${address}`
          : returnToPage;
      dispatch(setRedirectAfterDefaultPage({ path: redirectPath, address }));
    }

    navigate(`${CONFIRM_TRANSACTION_ROUTE}/${latestTransaction.id}`);
    return true;
  }, [
    unconfirmedTransactions,
    address,
    targetChainId,
    pendingUpgradeTransaction?.id,
    navigate,
    returnToPage,
    dispatch,
  ]);

  const handleUpgradeClick = useCallback(async () => {
    if (
      !currentNetwork?.upgradeContractAddress ||
      hasPendingRequests ||
      pendingUpgradeTransaction ||
      isActive
    ) {
      findAndRedirectToTransaction();
      return;
    }

    setPendingUpgrade(true);
    try {
      if (await refreshSmartAccountStatus()) {
        setSmartAccountActive(true);
        return;
      }
      await upgradeAccount(
        address as Hex,
        currentNetwork.upgradeContractAddress,
      );
      findAndRedirectToTransaction();
    } finally {
      setPendingUpgrade(false);
    }
  }, [
    address,
    currentNetwork?.upgradeContractAddress,
    findAndRedirectToTransaction,
    hasPendingRequests,
    pendingUpgradeTransaction,
    isActive,
    refreshSmartAccountStatus,
    setSmartAccountActive,
    upgradeAccount,
  ]);

  const isUpgradeButtonDisabled =
    pending ||
    pendingUpgrade ||
    !currentNetwork?.upgradeContractAddress ||
    currentNetwork.isSupported ||
    isActive;

  const networkList = useMemo(() => {
    if (pending) {
      return (
        <Box
          paddingTop={12}
          paddingBottom={12}
          display={Display.Flex}
          justifyContent={JustifyContent.center}
          alignItems={AlignItems.center}
          data-testid="network-loader"
        >
          <Preloader size={24} />
        </Box>
      );
    }

    return (
      <Box>
        {network7702List.map((network) => (
          <SmartContractAccountToggle
            key={network.chainIdHex}
            networkConfig={network}
            address={address as Hex}
            returnToPage={returnToPage}
          />
        ))}
      </Box>
    );
  }, [pending, network7702List, address, returnToPage]);

  return (
    <Box
      width={BlockSize.Full}
      backgroundColor={BackgroundColor.backgroundSection}
      paddingTop={3}
      paddingBottom={4}
      paddingLeft={4}
      paddingRight={2}
      style={{ borderRadius: '8px' }}
    >
      <Box paddingRight={2}>
        <Text variant={TextVariant.bodyMdMedium} marginBottom={2}>
          {t('enableSmartContractAccount')}
        </Text>
        <Text color={TextColor.textAlternative} variant={TextVariant.bodySm}>
          {t('enableSmartContractAccountDescription')}{' '}
          <ButtonLink
            onClick={() => {
              global.platform.openTab({
                url: ZENDESK_URLS.ACCOUNT_UPGRADE,
              });
            }}
            size={ButtonLinkSize.Sm}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: '22px',
              fontSize: '14px',
              lineHeight: '22px',
              verticalAlign: 'baseline',
            }}
          >
            {t('learnMoreUpperCase')}
          </ButtonLink>
        </Text>
        <ButtonPrimary
          block
          marginTop={4}
          size={ButtonPrimarySize.Lg}
          loading={pendingUpgrade}
          disabled={isUpgradeButtonDisabled}
          onClick={handleUpgradeClick}
          data-testid="smart-account-upgrade-button"
        >
          {t('upgradeSmartAccount')}
        </ButtonPrimary>
      </Box>
      <Box>{networkList}</Box>
    </Box>
  );
};
