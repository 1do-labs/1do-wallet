import React, { useCallback } from 'react';
import { GasFeeToken, TransactionMeta } from '@metamask/transaction-controller';

import { NATIVE_TOKEN_ADDRESS } from '../../../../../../../../shared/constants/transaction';
import {
  Box,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalContentSize,
  ModalHeader,
  ModalOverlay,
  Text,
} from '../../../../../../../components/component-library';
import {
  AlignItems,
  BackgroundColor,
  BorderRadius,
  Display,
  FlexDirection,
  JustifyContent,
  TextColor,
  TextVariant,
} from '../../../../../../../helpers/constants/design-system';
import { useConfirmContext } from '../../../../../context/confirm';
import { GasFeeTokenListItem } from '../gas-fee-token-list-item';
import { useI18nContext } from '../../../../../../../hooks/useI18nContext';
import { updateSelectedGasFeeToken } from '../../../../../../../store/controller-actions/transaction-controller';
import { useIsInsufficientBalance } from '../../../../../hooks/useIsInsufficientBalance';

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export function GasFeeTokenModal({ onClose }: { onClose?: () => void }) {
  const t = useI18nContext();
  const { currentConfirmation } = useConfirmContext<TransactionMeta>();
  const hasInsufficientNative = useIsInsufficientBalance();

  const {
    id: transactionId,
    gasFeeTokens,
    selectedGasFeeToken,
    excludeNativeTokenForFee,
  } = currentConfirmation;

  const futureNativeSelected = false;

  const gasFeeTokenAddresses =
    gasFeeTokens
      ?.filter((token) => token.tokenAddress !== NATIVE_TOKEN_ADDRESS)
      .map((token) => token.tokenAddress) ?? [];

  const hasGasFeeTokens = gasFeeTokenAddresses.length > 0;

  const handleTokenClick = useCallback(
    async (token: GasFeeToken) => {
      const selectedAddress =
        token.tokenAddress === NATIVE_TOKEN_ADDRESS && !futureNativeSelected
          ? undefined
          : token.tokenAddress;

      await updateSelectedGasFeeToken(transactionId, selectedAddress);

      onClose?.();
    },
    [futureNativeSelected, onClose, transactionId],
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose ?? (() => undefined)}
      isClosedOnOutsideClick={false}
      isClosedOnEscapeKey={false}
    >
      <ModalOverlay data-testid="modal-overlay" />
      <ModalContent size={ModalContentSize.Md}>
        <ModalHeader onClose={onClose}>
          {t('confirmGasFeeTokenModalTitle')}
        </ModalHeader>
        <ModalBody
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          paddingLeft={0}
          paddingRight={0}
        >
          {!excludeNativeTokenForFee && (
            <>
              <Box
                display={Display.Flex}
                flexDirection={FlexDirection.Row}
                justifyContent={JustifyContent.spaceBetween}
                alignItems={AlignItems.center}
                marginInline={4}
              >
                <Title text={t('confirmGasFeeTokenModalPayETH')} noMargin />
              </Box>
              <GasFeeTokenListItem
                tokenAddress={
                  futureNativeSelected ? NATIVE_TOKEN_ADDRESS : undefined
                }
                isSelected={
                  !selectedGasFeeToken ||
                  selectedGasFeeToken?.toLowerCase() === NATIVE_TOKEN_ADDRESS
                }
                onClick={handleTokenClick}
                warning={
                  hasInsufficientNative &&
                  !futureNativeSelected &&
                  t('confirmGasFeeTokenInsufficientBalance')
                }
              />
              {hasGasFeeTokens && (
                <Title text={t('confirmGasFeeTokenModalToken')} />
              )}
            </>
          )}
          {gasFeeTokenAddresses.map((tokenAddress) => (
            <GasFeeTokenListItem
              key={tokenAddress}
              tokenAddress={tokenAddress}
              isSelected={
                selectedGasFeeToken?.toLowerCase() ===
                tokenAddress.toLowerCase()
              }
              // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={handleTokenClick}
            />
          ))}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
function Title({ noMargin, text }: { noMargin?: boolean; text: string }) {
  return (
    <Text
      variant={TextVariant.bodySm}
      color={TextColor.textAlternative}
      marginLeft={noMargin ? 0 : 4}
      marginTop={3}
      marginBottom={3}
    >
      {text}
    </Text>
  );
}
