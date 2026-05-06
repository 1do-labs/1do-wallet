import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '../../ui/box';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  IconName,
  ButtonIcon,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
} from '../../component-library';
import { Menu, MenuItem } from '../../ui/menu';
import {
  TextVariant,
} from '../../../helpers/constants/design-system';

export const PermissionCellOptions = ({
  description,
}) => {
  const t = useI18nContext();
  const ref = useRef(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleOpen = () => {
    setShowOptions(true);
  };

  const handleClose = () => {
    setShowOptions(false);
  };

  const handleDetailsOpen = () => {
    setShowOptions(false);
    setShowDetails(true);
  };

  const handleDetailsClose = () => {
    setShowOptions(false);
    setShowDetails(false);
  };

  if (!description) {
    return null;
  }

  return (
    <Box ref={ref}>
      <ButtonIcon
        iconName={IconName.MoreVertical}
        ariaLabel={t('options')}
        onClick={handleOpen}
        data-testid="permission-cell-options"
      />
      {showOptions && (
        <Menu anchorElement={ref.current} onHide={handleClose}>
          {description && (
            <MenuItem onClick={handleDetailsOpen}>
              <Text
                variant={TextVariant.bodySm}
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                {t('details')}
              </Text>
            </MenuItem>
          )}
        </Menu>
      )}
      <Modal isOpen={showDetails} onClose={handleDetailsClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader onClose={handleDetailsClose}>{t('details')}</ModalHeader>
          <Box paddingLeft={4} paddingRight={4}>
            <Text>{description}</Text>
          </Box>
        </ModalContent>
      </Modal>
    </Box>
  );
};

PermissionCellOptions.propTypes = {
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};
