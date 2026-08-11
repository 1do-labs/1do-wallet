import { FirstTimeFlowType } from '../../shared/constants/onboarding';
import {
  DEFAULT_ROUTE,
  ONBOARDING_COMPLETION_ROUTE,
  ONBOARDING_CREATE_PASSWORD_ROUTE,
  ONBOARDING_IMPORT_WITH_SRP_ROUTE,
} from '../helpers/constants/routes';

/**
 * When the user unlocks the wallet but onboarding has not fully completed we
 * must direct the user to the appropriate step in the onboarding process.
 *
 * @param {object} state - MetaMask state tree
 * @returns {string} Route to redirect the user to
 */
export function getFirstTimeFlowTypeRouteAfterUnlock(state) {
  const { firstTimeFlowType } = state.metamask;

  if (firstTimeFlowType === FirstTimeFlowType.create) {
    return ONBOARDING_CREATE_PASSWORD_ROUTE;
  } else if (firstTimeFlowType === FirstTimeFlowType.import) {
    return ONBOARDING_IMPORT_WITH_SRP_ROUTE;
  } else if (firstTimeFlowType === FirstTimeFlowType.restore) {
    return ONBOARDING_COMPLETION_ROUTE;
  }
  return DEFAULT_ROUTE;
}

export const getFirstTimeFlowType = (state) => {
  return state.metamask.firstTimeFlowType;
};
