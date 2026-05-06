import React, { useCallback, useContext, useMemo } from 'react';
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
  GATOR_PERMISSIONS,
  CONTACTS_ROUTE,
} from '../../../helpers/constants/routes';
import {
  lockMetamask,
  setShowSupportDataConsentModal,
  toggleNetworkMenu,
  toggleDefaultView,
} from '../../../store/actions';
import { isGatorPermissionsRevocationFeatureEnabled } from '../../../../shared/lib/environment';
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

import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsContextProp,
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';

import {
  getUnapprovedTransactions,
  getMetaMetricsId,
  getParticipateInMetaMetrics,
  getDataCollectionForMarketing,
} from '../../../selectors';
import { getPortfolioUrl } from '../../../helpers/utils/portfolio';
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
  const { trackEvent } = useContext(MetaMetricsContext);
  const location = useLocation();

  const unapprovedTransactions = useSelector(getUnapprovedTransactions);
  const hasUnapprovedTransactions =
    Object.keys(unapprovedTransactions).length > 0;

  const isSidePanelEnabled = useSidePanelEnabled();
  const browserSupportsSidePanel = useBrowserSupportsSidePanel();
  const currentEnvironment = getEnvironmentType();
  const isSidepanel = currentEnvironment === ENVIRONMENT_TYPE_SIDEPANEL;
  const isPopup = currentEnvironment === ENVIRONMENT_TYPE_POPUP;

  const metaMetricsId = useSelector(getMetaMetricsId);
  const isMetaMetricsEnabled = useSelector(getParticipateInMetaMetrics);
  const isMarketingEnabled = useSelector(getDataCollectionForMarketing);

  const supportText =
    isBeta() || isFlask() ? t('needHelpSubmitTicket') : t('support');
  const supportLink = SUPPORT_LINK || '';

  const handleSupportMenuClick = useCallback(() => {
    dispatch(setShowSupportDataConsentModal(true));
    trackEvent(
      {
        category: MetaMetricsEventCategory.Home,
        event: MetaMetricsEventName.SupportLinkClicked,
        properties: {
          url: supportLink,
          location: METRICS_LOCATION,
        },
      },
      {
        contextPropsIntoEventProperties: [MetaMetricsContextProp.PageTitle],
      },
    );
    onClose();
  }, [dispatch, trackEvent, supportLink, onClose]);

  return useMemo(() => {
    const section2: GlobalMenuSection = {
      id: 'global-menu-section-2',
      items: [],
    };

    if (isPopup || isSidepanel) {
      section2.items.push({
        id: 'global-menu-expand-view',
        iconName: IconName.Expand,
        label: t('openFullScreen'),
        onClick: () => {
          global?.platform?.openExtensionInBrowser?.();
          trackEvent({
            event: MetaMetricsEventName.AppWindowExpanded,
            category: MetaMetricsEventCategory.Navigation,
            properties: { location: METRICS_LOCATION },
          });
          onClose();
        },
      });
    }

    if (
      getBrowserName() !== PLATFORM_FIREFOX &&
      browserSupportsSidePanel === true &&
      isSidePanelEnabled &&
      (isPopup || isSidepanel)
    ) {
      section2.items.push({
        id: 'global-menu-toggle-view',
        iconName: isSidepanel ? IconName.PopUp : IconName.SidePanel,
        label: isSidepanel ? t('switchToPopup') : t('switchToSidePanel'),
        onClick: async () => {
          await dispatch(toggleDefaultView());
          trackEvent({
            event: MetaMetricsEventName.ViewportSwitched,
            category: MetaMetricsEventCategory.Navigation,
            properties: {
              location: METRICS_LOCATION,
              to: isSidepanel
                ? ENVIRONMENT_TYPE_POPUP
                : ENVIRONMENT_TYPE_SIDEPANEL,
            },
          });
          onClose();
        },
      });
    }

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
          to: isGatorPermissionsRevocationFeatureEnabled()
            ? `${GATOR_PERMISSIONS}?from=${encodeURIComponent(location.pathname)}`
            : `${PERMISSIONS}?from=${encodeURIComponent(location.pathname)}`,
          onClick: () => {
            trackEvent({
              event: MetaMetricsEventName.NavPermissionsOpened,
              category: MetaMetricsEventCategory.Navigation,
              properties: { location: METRICS_LOCATION },
            });
          },
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
          onClick: () => {
            trackEvent({
              category: MetaMetricsEventCategory.Navigation,
              event: MetaMetricsEventName.NavSettingsOpened,
              properties: { location: METRICS_LOCATION },
            });
          },
          disabled: hasUnapprovedTransactions,
        },
        // Uncomment to view Settings V2 in Hamburger Menu
        // {
        //   id: 'global-menu-settings-v2',
        //   iconName: IconName.Setting,
        //   label: `${t('settings')} (V2)`,
        //   to: SETTINGS_V2_ROUTE,
        //   onClick: () => {
        //     trackEvent({
        //       category: MetaMetricsEventCategory.Navigation,
        //       event: MetaMetricsEventName.NavSettingsOpened,
        //       properties: { location: METRICS_LOCATION },
        //     });
        //   },
        //   disabled: hasUnapprovedTransactions,
        // },
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
            trackEvent({
              category: MetaMetricsEventCategory.Navigation,
              event: MetaMetricsEventName.AppLocked,
              properties: { location: METRICS_LOCATION },
            });
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
    trackEvent,
    metaMetricsId,
    isMetaMetricsEnabled,
    isMarketingEnabled,
    browserSupportsSidePanel,
    isSidePanelEnabled,
    supportText,
    handleSupportMenuClick,
  ]);
}
