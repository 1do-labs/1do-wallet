import React, { useCallback, useContext, useRef } from 'react';
import classnames from 'clsx';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { matchPath } from 'react-router-dom';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import {
  CONFIRM_TRANSACTION_ROUTE,
  SEND_ROUTE,
} from '../../../helpers/constants/routes';

import {
  AlignItems,
  BackgroundColor,
  BlockSize,
  Display,
  JustifyContent,
} from '../../../helpers/constants/design-system';
import { Box } from '../../component-library';
import { getUnapprovedTransactions } from '../../../selectors';

import { toggleNetworkMenu } from '../../../store/actions';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import {
  ENVIRONMENT_TYPE_POPUP,
  ENVIRONMENT_TYPE_SIDEPANEL,
} from '../../../../shared/constants/app';
import { getIsUnlocked } from '../../../ducks/metamask/metamask';
import {
  getAllEnabledNetworksForAllNamespaces,
  getSelectedMultichainNetworkConfiguration,
} from '../../../selectors/multichain/networks';
import { getNetworkIcon } from '../../../../shared/lib/network.utils';
import { CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP } from '../../../../shared/constants/network';
import { AvatarType } from '../avatar-group/avatar-group.types';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { MultichainMetaFoxLogo } from './multichain-meta-fox-logo';
import { AppHeaderContainer } from './app-header-container';
import { AppHeaderUnlockedContent } from './app-header-unlocked-content';
import { AppHeaderLockedContent } from './app-header-locked-content';

export const AppHeader = ({ location }) => {
  const t = useI18nContext();
  const { trackEvent } = useContext(MetaMetricsContext);
  const menuRef = useRef(null);
  const isUnlocked = useSelector(getIsUnlocked);

  const multichainNetwork = useSelector(
    getSelectedMultichainNetworkConfiguration,
  );

  const { chainId } = multichainNetwork;
  const networkIconSrc = getNetworkIcon(multichainNetwork);
  const enabledChainIds = useSelector(getAllEnabledNetworksForAllNamespaces);
  const allNetworksSelected = enabledChainIds.length > 1;
  const enabledNetworkMembers = enabledChainIds.flatMap((enabledChainId) => {
    const avatarValue = CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[enabledChainId];
    return avatarValue ? [{ avatarValue }] : [];
  });

  const dispatch = useDispatch();

  const environmentType = getEnvironmentType();
  const popupStatus = environmentType === ENVIRONMENT_TYPE_POPUP;
  const isSidepanel = environmentType === ENVIRONMENT_TYPE_SIDEPANEL;

  // Disable the network and account pickers if the user is in
  // a critical flow
  const isConfirmationPage = Boolean(
    matchPath(
      {
        path: CONFIRM_TRANSACTION_ROUTE,
        end: false,
      },
      location?.pathname || '',
    ),
  );
  const isSendPage = Boolean(
    matchPath({ path: SEND_ROUTE, end: false }, location?.pathname || ''),
  );

  const unapprovedTransactions = useSelector(getUnapprovedTransactions);

  const hasUnapprovedTransactions =
    Object.keys(unapprovedTransactions).length > 0;

  const disableAccountPicker = isConfirmationPage;

  const disableNetworkPicker =
    isConfirmationPage || isSendPage || hasUnapprovedTransactions;

  // Callback for network dropdown
  const networkOpenCallback = useCallback(() => {
    dispatch(toggleNetworkMenu());
    trackEvent({
      event: MetaMetricsEventName.NavNetworkMenuOpened,
      category: MetaMetricsEventCategory.Navigation,
      properties: {
        location: 'App header',
        chain_id: chainId,
      },
    });
  }, [chainId, dispatch, trackEvent]);

  const unlockedStyling = {
    alignItems: AlignItems.center,
    width: BlockSize.Full,
    backgroundColor: BackgroundColor.backgroundDefault,
    padding: 2,
    paddingLeft: 2,
    paddingRight: 4,
    gap: 2,
  };

  const lockStyling = {
    display: Display.Flex,
    alignItems: AlignItems.center,
    width: BlockSize.Full,
    justifyContent: JustifyContent.spaceBetween,
    backgroundColor: BackgroundColor.backgroundDefault,
    padding: 2,
    gap: 2,
  };

  return (
    <>
      {isUnlocked && !popupStatus && !isSidepanel && true ? (
        <MultichainMetaFoxLogo />
      ) : null}
      <AppHeaderContainer isUnlocked={isUnlocked} popupStatus={popupStatus}>
        <>
          <Box
            className={classnames(
              isUnlocked
                ? 'multichain-app-header__contents flex'
                : 'multichain-app-header__lock-contents',
            )}
            {...(isUnlocked ? unlockedStyling : lockStyling)}
          >
            {isUnlocked ? (
              <AppHeaderUnlockedContent
                popupStatus={popupStatus}
                currentNetwork={multichainNetwork}
                networkIconSrc={networkIconSrc}
                networkPickerLabel={
                  allNetworksSelected
                    ? t('allNetworks')
                    : multichainNetwork.name
                }
                networkPickerAvatarGroupProps={
                  allNetworksSelected
                    ? {
                        avatarType: AvatarType.NETWORK,
                        members: enabledNetworkMembers,
                        limit: 2,
                      }
                    : undefined
                }
                networkOpenCallback={networkOpenCallback}
                disableNetworkPicker={disableNetworkPicker}
                disableAccountPicker={disableAccountPicker}
                menuRef={menuRef}
              />
            ) : (
              <AppHeaderLockedContent
                currentNetwork={multichainNetwork}
                networkIconSrc={networkIconSrc}
                networkOpenCallback={networkOpenCallback}
              />
            )}
          </Box>
        </>
      </AppHeaderContainer>
    </>
  );
};

AppHeader.propTypes = {
  /**
   * The location object for the application
   */
  location: PropTypes.object,
};
