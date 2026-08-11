import React, { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react';
import { MenuItem } from '../../ui/menu';
import { getDebankProfileUrl } from '../../../helpers/utils/debank';
import { getSelectedAddress } from '../../../selectors';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { IconName } from '../../component-library';

export const DiscoverMenuItem = ({
  closeMenu,
  metricsLocation,
}: {
  closeMenu: () => void;
  metricsLocation: string;
}) => {
  const selectedAddress = useSelector(getSelectedAddress);
  const t = useI18nContext();

  const handlePortfolioOnClick = useCallback(() => {
    const url = getDebankProfileUrl(selectedAddress);
    global.platform.openTab({ url });
    closeMenu();
  }, [closeMenu, metricsLocation, selectedAddress]);

  return (
    <MenuItem
      iconNameLegacy={IconName.Export}
      onClick={() => handlePortfolioOnClick()}
      data-testid="portfolio-menu-item"
    >
      <Box className="flex flex-row items-center justify-between">
        {t('discover')}
      </Box>
    </MenuItem>
  );
};
