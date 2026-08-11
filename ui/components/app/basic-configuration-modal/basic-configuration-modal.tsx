import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconSize,
  IconName,
  IconColor,
  TextColor,
  Checkbox,
} from '@metamask/design-system-react';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { toggleExternalServices } from '../../../store/actions';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  Modal,
  ModalBody,
  ModalFooter,
} from '../../component-library';
import { Display } from '../../../helpers/constants/design-system';
import { getUseExternalServices } from '../../../selectors';
import {
  hideBasicFunctionalityModal,
  onboardingToggleBasicFunctionalityOff,
} from '../../../ducks/app/app';
import { ONBOARDING_PRIVACY_SETTINGS_ROUTE } from '../../../helpers/constants/routes';
import { useBoolean } from '../../../hooks/useBoolean';

export function BasicConfigurationModal() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const isExternalServicesEnabled = useSelector(getUseExternalServices);

  const { pathname } = useLocation();
  const onboardingFlow = useMemo(() => {
    return pathname === ONBOARDING_PRIVACY_SETTINGS_ROUTE;
  }, [pathname]);

  const { value: hasAgreed, toggle } = useBoolean();

  const closeModal = () => {
    dispatch(hideBasicFunctionalityModal());
  };

  const handleToggle = () => {
    if (onboardingFlow) {
      dispatch(onboardingToggleBasicFunctionalityOff());
    } else {
      dispatch(toggleExternalServices(!isExternalServicesEnabled));
    }
    closeModal();
  };

  return (
    <Modal onClose={closeModal} data-testid="dapp-permission-modal" isOpen>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader onClose={closeModal} paddingBottom={4}>
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            gap={4}
          >
            <Icon
              size={IconSize.Xl}
              name={IconName.Danger}
              color={IconColor.ErrorDefault}
            />
            <Text variant={TextVariant.HeadingSm}>
              {isExternalServicesEnabled
                ? t('basicConfigurationModalHeadingOff')
                : t('basicConfigurationModalHeadingOn')}
            </Text>
          </Box>
        </ModalHeader>

        <ModalBody
          display={Display.Flex}
          paddingBottom={2}
          className="flex-col gap-6"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {isExternalServicesEnabled
              ? t('basicConfigurationModalDisclaimerOffPart1')
              : t('basicConfigurationModalDisclaimerOn')}
          </Text>
          {isExternalServicesEnabled && (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {t('basicConfigurationModalDisclaimerOffPart2')}
            </Text>
          )}
          {isExternalServicesEnabled && (
            <Checkbox
              id="basic-configuration-checkbox"
              data-testid="basic-configuration-checkbox"
              isSelected={hasAgreed}
              onChange={toggle}
              label={t('basicConfigurationModalCheckbox')}
            />
          )}
        </ModalBody>

        <ModalFooter>
          <Box className="flex gap-4">
            <Button
              size={ButtonSize.Lg}
              className="w-full"
              variant={ButtonVariant.Secondary}
              data-testid="basic-configuration-modal-cancel-button"
              onClick={closeModal}
            >
              {t('cancel')}
            </Button>
            <Button
              size={ButtonSize.Lg}
              isDisabled={!hasAgreed && isExternalServicesEnabled}
              className="w-full"
              variant={ButtonVariant.Primary}
              data-testid="basic-configuration-modal-toggle-button"
              onClick={handleToggle}
              isDanger={isExternalServicesEnabled}
            >
              {isExternalServicesEnabled ? t('turnOff') : t('turnOn')}
            </Button>
          </Box>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
