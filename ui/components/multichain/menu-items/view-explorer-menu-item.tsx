import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  getMultichainAccountUrl,
  getMultichainBlockExplorerUrl,
} from '../../../helpers/utils/multichain/blockExplorer';

import { MenuItem } from '../../ui/menu';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { IconName, Text } from '../../component-library';
import {
  getBlockExplorerLinkText,
  getIsCustomNetwork,
} from '../../../selectors';
import { getURLHostName } from '../../../helpers/utils/util';
import { NETWORKS_ROUTE } from '../../../helpers/constants/routes';
import { getMultichainNetwork } from '../../../selectors/multichain';
import { useMultichainSelector } from '../../../hooks/useMultichainSelector';
import {
  TEST_NETWORK_IDS,
  CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP,
} from '../../../../shared/constants/network';
import { getCurrentChainId } from '../../../../shared/lib/selectors/networks';

export type ViewExplorerMenuItemProps = {
  /**
   * Closes the menu
   */
  closeMenu?: () => void;
  /**
   * Custom properties for the menu item text
   */
  textProps?: object;
  /**
   * Account to show account details for
   */
  account: InternalAccount;
};

export const openBlockExplorer = (
  addressLink: string,
  closeMenu?: () => void,
) => {
  global.platform.openTab({
    url: addressLink,
  });
  closeMenu?.();
};

export const ViewExplorerMenuItem = ({
  closeMenu,
  textProps,
  account,
}: ViewExplorerMenuItemProps) => {
  const t = useI18nContext();
  const navigate = useNavigate();

  const multichainNetwork = useMultichainSelector(
    getMultichainNetwork,
    account,
  );
  const addressLink = getMultichainAccountUrl(
    account.address,
    multichainNetwork,
  );
  const blockExplorerUrl = getMultichainBlockExplorerUrl(multichainNetwork);

  const isCustomNetwork = useSelector(getIsCustomNetwork);
  const currentChainId = useSelector(getCurrentChainId);
  const isTestNetwork = (TEST_NETWORK_IDS as string[]).includes(currentChainId);

  const isPopularNetwork = Boolean(
    CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[currentChainId],
  );

  let blockExplorerUrlSubTitle = null;
  let actualAddressLink = addressLink;

  if (isTestNetwork || (!isPopularNetwork && isCustomNetwork)) {
    blockExplorerUrlSubTitle = getURLHostName(blockExplorerUrl);
    if (blockExplorerUrl) {
      const normalizedAddress = account.address;
      const baseUrl = blockExplorerUrl.endsWith('/')
        ? blockExplorerUrl
        : `${blockExplorerUrl}/`;
      actualAddressLink = `${baseUrl}address/${normalizedAddress}`;
    }
  } else {
    blockExplorerUrlSubTitle = 'etherscan.io';
  }

  const blockExplorerLinkText = useSelector(getBlockExplorerLinkText);

  const routeToAddBlockExplorerUrl = () => {
    navigate(`${NETWORKS_ROUTE}#blockExplorerUrl`);
  };

  const LABEL = t('viewOnExplorer');

  return (
    <MenuItem
      onClick={() => {
        blockExplorerLinkText.firstPart === 'addBlockExplorer'
          ? routeToAddBlockExplorerUrl()
          : openBlockExplorer(actualAddressLink, closeMenu);

        closeMenu?.();
      }}
      subtitle={blockExplorerUrlSubTitle || null}
      iconNameLegacy={IconName.Export}
      data-testid="account-list-menu-open-explorer"
    >
      {textProps ? <Text {...textProps}>{LABEL}</Text> : LABEL}
    </MenuItem>
  );
};
