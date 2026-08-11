import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import {
  UNLOCK_ROUTE,
  CONNECT_ROUTE,
  CONFIRMATION_V_NEXT_ROUTE,
  CONFIRM_TRANSACTION_ROUTE,
  CONFIRM_ADD_SUGGESTED_TOKEN_ROUTE,
  CONFIRM_ADD_SUGGESTED_NFT_ROUTE,
} from '../../helpers/constants/routes';
import { getConfirmationRoute } from '../confirmations/hooks/useConfirmationNavigation';
// eslint-disable-next-line import-x/no-restricted-paths
import { getEnvironmentType } from '../../../app/scripts/lib/util';
import {
  ENVIRONMENT_TYPE_FULLSCREEN,
  ENVIRONMENT_TYPE_NOTIFICATION,
  ENVIRONMENT_TYPE_POPUP,
} from '../../../shared/constants/app';
import {
  selectHasApprovalFlows,
  selectPendingApprovalsForNavigation,
} from '../../selectors';
import { useModalState } from '../../hooks/useModalState';

const EXEMPTED_ROUTES = [
  UNLOCK_ROUTE,
  CONNECT_ROUTE,
  CONFIRMATION_V_NEXT_ROUTE,
  CONFIRM_TRANSACTION_ROUTE,
  CONFIRM_ADD_SUGGESTED_TOKEN_ROUTE,
  CONFIRM_ADD_SUGGESTED_NFT_ROUTE,
];

export const ConfirmationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const { closeModals } = useModalState();

  const envType = getEnvironmentType();
  const isFullscreen = envType === ENVIRONMENT_TYPE_FULLSCREEN;
  const isNotification = envType === ENVIRONMENT_TYPE_NOTIFICATION;
  const isPopup = envType === ENVIRONMENT_TYPE_POPUP;

  const pendingApprovals = useSelector(selectPendingApprovalsForNavigation);
  const hasApprovalFlows = useSelector(selectHasApprovalFlows);
  const stayOnHomePage = Boolean(location.state?.stayOnHomePage);

  const canRedirect = !isNotification && !stayOnHomePage;
  // Ported from home.component - checkStatusAndNavigate()
  const checkStatusAndNavigate = useCallback(() => {
    if (pendingApprovals.length || hasApprovalFlows) {
      const url = getConfirmationRoute(
        pendingApprovals?.[0]?.id,
        pendingApprovals,
        hasApprovalFlows,
        '',
      );

      if (url) {
        closeModals();
        navigate(url, { replace: true });
      }
    }
  }, [closeModals, hasApprovalFlows, navigate, pendingApprovals]);

  // Runs on all routes (not just home), so skip navigation on exempted routes
  const isExemptedRoute = EXEMPTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  const isFullscreenExemption = isFullscreen;

  // Ported from home.component - componentDidUpdate()
  useEffect(() => {
    if (isExemptedRoute) {
      return;
    }

    if (isFullscreenExemption) {
      return;
    }

    checkStatusAndNavigate();
  }, [checkStatusAndNavigate, isExemptedRoute, isFullscreenExemption]);

  return null;
};
