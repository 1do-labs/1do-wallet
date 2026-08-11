import { useCallback, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react';
import {
  SETTINGS_ROUTE,
  PERMISSIONS,
  CONTACTS_ROUTE,
} from '../../../helpers/constants/routes';
import {
  lockMetamask,
  toggleNetworkMenu,
  toggleDefaultView,
} from '../../../store/actions';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useSidePanelEnabled } from '../../../hooks/useSidePanelEnabled';
import { useBrowserSupportsSidePanel } from '../../../hooks/useBrowserSupportsSidePanel';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import {
  ENVIRONMENT_TYPE_POPUP,
  ENVIRONMENT_TYPE_SIDEPANEL,
  PLATFORM_FIREFOX,
} from '../../../../shared/constants/app';
import { getBrowserName } from '../../../../shared/lib/browser-runtime.utils';
import { SUPPORT_LINK } from '../../../../shared/lib/ui-utils';

import { getUnapprovedTransactions } from '../../../selectors';
import type { GlobalMenuSection } from '../global-menu/global-menu-list.types';
import { isBeta, isFlask } from '../../../../shared/lib/build-types';

const METRICS_LOCATION = 'Global Menu';

/**
 * Hook that returns menu sections with the same data and behavior as GlobalMenu.
 * Use with GlobalMenuList inside GlobalMenuDrawer to render the menu in a drawer.
 *
 * @param onClose - Callback to close the drawer/menu when an action is taken
 */
export function useGlobalMenuSections(
  onClose: () => void,
): GlobalMenuSection[] {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const location = useLocation();

  const unapprovedTransactions = useSelector(getUnapprovedTransactions);
  const hasUnapprovedTransactions =
    Object.keys(unapprovedTransactions).length > 0;

  const isSidePanelEnabled = useSidePanelEnabled();
  const browserSupportsSidePanel = useBrowserSupportsSidePanel();
  const currentEnvironment = getEnvironmentType();
  const isSidepanel = currentEnvironment === ENVIRONMENT_TYPE_SIDEPANEL;
  const isPopup = currentEnvironment === ENVIRONMENT_TYPE_POPUP;

  const supportText =
    isBeta() || isFlask() ? t('needHelpSubmitTicket') : t('support');
  const handleSupportMenuClick = useCallback(() => {
    global.platform.openTab({ url: SUPPORT_LINK });
    onClose();
  }, [onClose]);

  return useMemo(() => {
    const section2: GlobalMenuSection = {
      id: 'global-menu-section-2',
      items: [],
    };

    const section2Manage: GlobalMenuSection = {
      id: 'global-menu-section-manage',
      title: t('manage'),
      items: [
        {
          id: 'global-menu-contacts',
          iconName: IconName.Book,
          label: t('contacts'),
          to: `${CONTACTS_ROUTE}?from=${encodeURIComponent(location.pathname)}`,
        },
        {
          id: 'global-menu-connected-sites',
          iconName: IconName.SecurityTick,
          label: t('allPermissions'),
          to: `${PERMISSIONS}?from=${encodeURIComponent(location.pathname)}`,
          onClick: () => undefined,
          disabled: hasUnapprovedTransactions,
        },
        {
          id: 'global-menu-networks',
          iconName: IconName.Hierarchy,
          label: t('networks'),
          onClick: () => {
            dispatch(toggleNetworkMenu());
            onClose();
          },
        },
      ],
    };

    const section3HelpAndSettings: GlobalMenuSection = {
      id: 'global-menu-section-help-settings',
      title: t('helpAndSettings'),
      items: [
        {
          id: 'global-menu-settings',
          iconName: IconName.Setting,
          label: t('settings'),
          to: `${SETTINGS_ROUTE}?drawerOpen=true`,
          onClick: () => undefined,
          disabled: hasUnapprovedTransactions,
        },
        {
          id: 'global-menu-support',
          iconName: IconName.MessageQuestion,
          label: supportText,
          onClick: handleSupportMenuClick,
        },
      ],
    };

    const section4LogOut: GlobalMenuSection = {
      id: 'global-menu-section-log-out',
      items: [
        {
          id: 'global-menu-lock',
          iconName: IconName.Lock,
          iconColor: IconColor.ErrorDefault,
          textColor: TextColor.ErrorDefault,
          label: t('logOut'),
          onClick: async () => {
            onClose();

            await dispatch(lockMetamask(t('lockMetaMaskLoadingMessage')));
          },
        },
      ],
    };

    const sections: GlobalMenuSection[] = [];
    if (section2.items.length > 0) {
      sections.push(section2);
    }
    sections.push(section2Manage);
    sections.push(section3HelpAndSettings);
    sections.push(section4LogOut);

    return sections;
  }, [
    t,
    location.pathname,
    isPopup,
    isSidepanel,
    hasUnapprovedTransactions,
    onClose,
    dispatch,
    browserSupportsSidePanel,
    isSidePanelEnabled,
    supportText,
    handleSupportMenuClick,
  ]);
}
