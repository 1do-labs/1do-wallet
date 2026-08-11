import React, { useCallback } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '../../../../../../../components/component-library';
import { IconColor } from '../../../../../../../helpers/constants/design-system';
import { useGasFeeModalContext } from '../../../../../context/gas-fee-modal';

export const EditGasIconButton = (): JSX.Element => {
  const { openGasFeeModal } = useGasFeeModalContext();

  const handleOpenGasFeeModal = useCallback(() => {
    openGasFeeModal();
  }, [openGasFeeModal]);

  return (
    <Button
      style={{ textDecoration: 'none' }}
      size={ButtonSize.Auto}
      variant={ButtonVariant.Link}
      startIconName={IconName.Edit}
      color={IconColor.primaryDefault}
      data-testid="edit-gas-fee-icon"
      onClick={handleOpenGasFeeModal}
    />
  );
};
