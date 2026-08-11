import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import React, { useCallback } from 'react';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
} from '../../../../../components/component-library';
import {
  AlignItems,
  BackgroundColor,
  Display,
  FlexDirection,
  IconColor,
  JustifyContent,
  TextColor,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { useConfirmContext } from '../../../context/confirm';
import { SEND_TRANSACTION_TYPES } from '../../../constants/send';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { AdvancedDetailsButton } from './advanced-details-button';

export const WalletInitiatedHeader = () => {
  const t = useI18nContext();
  const { onCancel } = useConfirmActions();
  const { currentConfirmation } = useConfirmContext<TransactionMeta>();

  const isSendTransaction =
    currentConfirmation?.type &&
    SEND_TRANSACTION_TYPES.includes(currentConfirmation.type);

  const handleBackButtonClick = useCallback(() => {
    const isNativeSend =
      currentConfirmation.type === TransactionType.simpleSend;
    const isERC20TokenSend =
      currentConfirmation.type === TransactionType.tokenMethodTransfer;
    const isNFTTokenSend =
      currentConfirmation.type === TransactionType.tokenMethodTransferFrom ||
      currentConfirmation.type === TransactionType.tokenMethodSafeTransferFrom;

    if (isNativeSend || isERC20TokenSend || isNFTTokenSend) {
      onCancel({
        navigateBackForSend: true,
      });
    }
  }, [currentConfirmation, onCancel]);

  const getHeaderTitle = () => {
    if (isSendTransaction) {
      return null;
    }
    return t('review');
  };

  const headerTitle = getHeaderTitle();

  return (
    <Box
      alignItems={AlignItems.center}
      backgroundColor={BackgroundColor.backgroundDefault}
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      paddingInline={3}
      paddingTop={4}
      paddingBottom={4}
      style={{ zIndex: 2 }}
    >
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        ariaLabel={t('back')}
        size={ButtonIconSize.Md}
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={handleBackButtonClick}
        data-testid="wallet-initiated-header-back-button"
        color={IconColor.iconDefault}
      />
      {headerTitle && (
        <Text variant={TextVariant.headingSm} color={TextColor.inherit}>
          {headerTitle}
        </Text>
      )}
      <AdvancedDetailsButton />
    </Box>
  );
};
