import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { MenuItem } from '../../ui/menu';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { IconName, Text } from '../../component-library';
import { getSelectedAccountGroup } from '../../../selectors/multichain-accounts/account-tree';
import { MULTICHAIN_ACCOUNT_DETAILS_PAGE_ROUTE } from '../../../helpers/constants/routes';

export const AccountDetailsMenuItem = ({ closeMenu, textProps }) => {
  const t = useI18nContext();
  const accountGroupId = useSelector(getSelectedAccountGroup);
  const navigate = useNavigate();

  const LABEL = t('accountDetails');

  const handleNavigation = useCallback(() => {
    navigate({
      pathname: MULTICHAIN_ACCOUNT_DETAILS_PAGE_ROUTE,
      search: createSearchParams({
        accountGroupId,
      }).toString(),
    });

    closeMenu?.();
  }, [closeMenu, navigate, accountGroupId]);

  return (
    <MenuItem
      onClick={handleNavigation}
      iconNameLegacy={IconName.ScanBarcode}
      data-testid="account-list-menu-details"
    >
      {textProps ? <Text {...textProps}>{LABEL}</Text> : LABEL}
    </MenuItem>
  );
};

AccountDetailsMenuItem.propTypes = {
  /**
   * Closes the menu
   */
  closeMenu: PropTypes.func,
  /**
   * Custom properties for the menu item text
   */
  textProps: PropTypes.object,
};
