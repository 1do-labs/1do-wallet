import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { I18nContext } from '../../../contexts/i18n';
import {
  Box,
  Button,
  ButtonLink,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  Modal,
  ModalContent,
  ModalContentSize,
  ModalHeader,
  ModalOverlay,
  Text,
} from '../../component-library';
import {
  AlignItems,
  BlockSize,
  Display,
  FlexDirection,
  TextAlign,
  TextColor,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { useBoolean } from '../../../hooks/useBoolean';
import {
  ONEDO_WEBSITE_LINK,
  PRIVACY_POLICY_LINK,
} from '../../../../shared/lib/ui-utils';

export default function TermsOfUsePopup({ onClose, onAccept }) {
  const t = useContext(I18nContext);
  const { value: isTermsOfUseChecked, toggle } = useBoolean();

  return (
    <Modal
      isOpen
      onClose={onClose}
      isClosedOnOutsideClick={false}
      autoFocus={false}
      className="terms-of-use-popup"
    >
      <ModalOverlay />
      <ModalContent size={ModalContentSize.Md} alignItems={AlignItems.center}>
        <ModalHeader onClose={onClose}>
          <Text textAlign={TextAlign.Center} variant={TextVariant.headingMd}>
            {t('termsOfUseTitle')}
          </Text>
        </ModalHeader>
        <Box
          display={Display.Flex}
          className="terms-of-use-popup__body-container"
        >
          <Box className="terms-of-use-popup__body">
            <Text variant={TextVariant.bodySm} marginBottom={4}>
              Please review the current 1do usage terms before continuing.
            </Text>
            <Text variant={TextVariant.bodySm} marginBottom={4}>
              1do is self-custodial wallet software. You control your accounts,
              Secret Recovery Phrase, private keys, signatures, transactions,
              and any custom delegate or smart-account logic you enable.
            </Text>
            <Text variant={TextVariant.bodySm} marginBottom={4}>
              You are responsible for reviewing contract code, RPC endpoints,
              network settings, transaction data, and signatures before
              approval. Blockchain transactions are generally irreversible.
            </Text>
            <Text variant={TextVariant.bodySm} marginBottom={4}>
              Some features may rely on third-party infrastructure such as RPC
              providers, block explorers, price feeds, or websites you choose to
              connect. Those services operate under their own terms, policies,
              and availability constraints.
            </Text>
            <Text variant={TextVariant.bodySm} marginBottom={4}>
              By continuing, you agree to review the latest notices published on{' '}
              <ButtonLink
                href={ONEDO_WEBSITE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                color={TextColor.primaryDefault}
                variant={TextVariant.bodySm}
              >
                1do.io
              </ButtonLink>{' '}
              and acknowledge the current{' '}
              <ButtonLink
                href={PRIVACY_POLICY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                color={TextColor.primaryDefault}
                variant={TextVariant.bodySm}
              >
                privacy notice
              </ButtonLink>{' '}
              before using the wallet.
            </Text>
          </Box>
        </Box>
        <Box
          className="terms-of-use-popup__footer"
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.center}
          marginTop={6}
          marginInline={4}
          paddingTop={6}
          gap={6}
        >
          <Checkbox
            id="terms-of-use__checkbox"
            className="terms-of-use__checkbox"
            data-testid="terms-of-use-checkbox"
            isChecked={isTermsOfUseChecked}
            alignItems={AlignItems.flexStart}
            onChange={toggle}
            label={t('termsOfUseAgreeText')}
          />
          <Button
            data-testid="terms-of-use-agree-button"
            variant={ButtonVariant.Primary}
            width={BlockSize.Full}
            size={ButtonSize.Lg}
            disabled={!isTermsOfUseChecked}
            onClick={onAccept}
          >
            {t('termsOfUseAgree')}
          </Button>
          <Text
            as="p"
            color={TextColor.textAlternative}
            variant={TextVariant.bodySm}
          >
            {t('termsOfUseFooterText')}
          </Text>
        </Box>
      </ModalContent>
    </Modal>
  );
}

TermsOfUsePopup.propTypes = {
  onClose: PropTypes.func,
  onAccept: PropTypes.func.isRequired,
};
