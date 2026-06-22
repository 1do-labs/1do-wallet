import React, { useCallback, useContext, useState } from 'react';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react';
import { Hex } from '@metamask/utils';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '../../../component-library';
import { ReceiveModal } from '../../../multichain/receive-modal';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../../shared/constants/metametrics';
import { MetaMetricsContext } from '../../../../contexts/metametrics';
import { trace, TraceName } from '../../../../../shared/lib/trace';

type AddFundsToken = {
  address: string;
  symbol: string;
};

const AddFundsModal = ({
  onClose,
  token,
  chainId,
  payerAddress,
}: {
  onClose: () => void;
  token: AddFundsToken;
  chainId: string | number;
  payerAddress: Hex;
}) => {
  const t = useI18nContext();
  const { trackEvent } = useContext(MetaMetricsContext);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const handleReceiveOnClick = useCallback(() => {
    trace({ name: TraceName.ReceiveModal });
    trackEvent({
      event: MetaMetricsEventName.NavReceiveButtonClicked,
      category: MetaMetricsEventCategory.Navigation,
      properties: {
        text: 'Receive',
        location: 'Add Funds',
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        chain_id: chainId,
      },
    });

    setShowReceiveModal(true);
  }, [chainId, trackEvent]);

  const buttonRow = ({
    label,
    iconName,
    onClick,
    id,
    disabled = false,
  }: {
    label: string;
    iconName: IconName;
    onClick: () => void;
    id: string;
    disabled?: boolean;
  }) => {
    return (
      <Box
        asChild
        data-testid={id}
        className="add-funds-modal__row flex items-center w-full gap-3 p-4"
        onClick={onClick}
      >
        <button disabled={disabled}>
          <Icon
            name={iconName}
            size={IconSize.Lg}
            color={IconColor.IconAlternative}
          />
          <Text variant={TextVariant.BodyMd}>{label}</Text>
        </button>
      </Box>
    );
  };

  return (
    <Modal
      isOpen
      onClose={() => undefined}
      data-testid="add-funds-modal"
      className="add-funds-modal"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader onClose={onClose}>{t('addFunds')}</ModalHeader>
        <ModalBody
          className="add-funds-modal__body"
          paddingLeft={0}
          paddingRight={0}
        >
          {buttonRow({
            id: 'add-funds-modal-receive-crypto-button',
            label: t('addFundsModalReceiveTokens'),
            iconName: IconName.QrCode,
            onClick: handleReceiveOnClick,
          })}
          {showReceiveModal && (
            <ReceiveModal
              address={payerAddress}
              onClose={() => setShowReceiveModal(false)}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default AddFundsModal;
