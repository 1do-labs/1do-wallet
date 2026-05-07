import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import {
  Modal,
  ModalContent,
  ModalOverlay,
  ModalHeader,
  Text,
  IconName,
  type ModalProps,
} from '../../component-library';
import {
  TextVariant,
  TextAlign,
} from '../../../helpers/constants/design-system';
import {
  getMultichainCurrentNetwork,
  getMultichainDefaultToken,
} from '../../../selectors/multichain';
import useRamps, {
  RampsMetaMaskEntry,
} from '../../../hooks/ramps/useRamps/useRamps';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { ChainId } from '../../../../shared/constants/network';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import FundingMethodItem from './funding-method-item';

type FundingMethodModalProps = Omit<ModalProps, 'children'> & {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onClickReceive: () => void;
};

export const FundingMethodModal: React.FC<FundingMethodModalProps> = ({
  isOpen,
  onClose,
  title,
  onClickReceive,
  ...props
}) => {
  const t = useI18nContext();
  const { trackEvent } = useContext(MetaMetricsContext);
  const { openBuyCryptoInPdapp } = useRamps();
  const { chainId } = useSelector(getMultichainCurrentNetwork);
  const { symbol } = useSelector(getMultichainDefaultToken);
  const handleBuyCryptoClick = () => {
    trackEvent({
      event: MetaMetricsEventName.NavBuyButtonClicked,
      category: MetaMetricsEventCategory.Navigation,
      properties: {
        location: RampsMetaMaskEntry?.TokensBanner,
        text: 'Buy crypto',
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        chain_id: chainId,
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        token_symbol: symbol,
      },
    });
    openBuyCryptoInPdapp(chainId as ChainId | CaipChainId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...props}>
      <ModalOverlay />
      <ModalContent modalDialogProps={{ padding: 0 }}>
        <ModalHeader paddingBottom={2} onClose={onClose}>
          <Text variant={TextVariant.headingSm} textAlign={TextAlign.Center}>
            {title}
          </Text>
        </ModalHeader>
        <FundingMethodItem
          icon={IconName.Card}
          title={t('tokenMarketplace')}
          description={t('debitCreditPurchaseOptions')}
          onClick={handleBuyCryptoClick}
        />
        <FundingMethodItem
          icon={IconName.Received}
          title={t('receiveCrypto')}
          description={t('depositCrypto')}
          onClick={onClickReceive}
        />
      </ModalContent>
    </Modal>
  );
};
