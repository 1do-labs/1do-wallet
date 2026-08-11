import { PRIVACY_POLICY_DATE } from '../../../helpers/constants/privacy-policy';
import { MetaMaskReduxState } from '../../../store/store';
import {
  ClaimSubmitToastType,
  StorageWriteErrorType,
} from '../../../../shared/constants/app-state';
import { getIsPrivacyToastRecent } from './utils';

type State = {
  appState: Partial<
    Pick<
      MetaMaskReduxState['appState'],
      | 'showNftDetectionEnablementToast'
      | 'showNewSrpAddedToast'
      | 'showPasswordChangeToast'
      | 'showCopyAddressToast'
      | 'showClaimSubmitToast'
      | 'showDefaultRpcSwitchToast'
    >
  >;
  metamask: Partial<
    Pick<
      MetaMaskReduxState['metamask'],
      | 'newPrivacyPolicyToastClickedOrClosed'
      | 'newPrivacyPolicyToastShownDate'
      | 'onboardingDate'
      | 'storageWriteErrorType'
      | 'isUnlocked'
      | 'completedOnboarding'
    >
  >;
};

/**
 * Determines if the privacy policy toast should be shown based on the current date and whether the new privacy policy toast was clicked or closed.
 *
 * @param state - The application state containing the privacy policy data.
 * @returns Boolean is True if the toast should be shown, and the number is the date the toast was last shown.
 */
export function selectShowPrivacyPolicyToast(state: Pick<State, 'metamask'>): {
  showPrivacyPolicyToast: boolean;
  newPrivacyPolicyToastShownDate?: number | null;
} {
  const {
    newPrivacyPolicyToastClickedOrClosed,
    newPrivacyPolicyToastShownDate,
    onboardingDate,
  } = state.metamask || {};
  const newPrivacyPolicyDate = new Date(PRIVACY_POLICY_DATE);
  const currentDate = new Date(Date.now());

  const showPrivacyPolicyToast =
    !newPrivacyPolicyToastClickedOrClosed &&
    currentDate >= newPrivacyPolicyDate &&
    getIsPrivacyToastRecent(newPrivacyPolicyToastShownDate) &&
    // users who onboarded before the privacy policy date should see the notice
    // and
    // old users who don't have onboardingDate set should see the notice
    (!onboardingDate || onboardingDate < newPrivacyPolicyDate.valueOf());

  return { showPrivacyPolicyToast, newPrivacyPolicyToastShownDate };
}

export function selectNftDetectionEnablementToast(
  state: Pick<State, 'appState'>,
): boolean {
  return Boolean(state.appState.showNftDetectionEnablementToast);
}

/**
 * Retrieves the wallet number for the "New SRP Added" toast, or false if hidden.
 *
 * @param state - Redux state object.
 * @returns The new wallet number to display, or false if the toast should be hidden.
 */
export function selectNewSrpAdded(
  state: Pick<State, 'appState'>,
): number | false {
  return state.appState.showNewSrpAddedToast || false;
}

/**
 * Retrieves user preference to see the "Copy Address" toast
 *
 * @param state - Redux state object.
 * @returns Boolean preference value
 */
export function selectShowCopyAddressToast(
  state: Pick<State, 'appState'>,
): boolean {
  return Boolean(state.appState.showCopyAddressToast);
}

/**
 * Retrieves the state for the "Claim Submit" toast
 *
 * @param state - Redux state object.
 * @returns ClaimSubmitToastType or null
 */
export function selectClaimSubmitToast(
  state: Pick<State, 'appState'>,
): ClaimSubmitToastType | null {
  return state.appState.showClaimSubmitToast || null;
}

/**
 * Retrieves user preference to see the "Updated to 1do default" toast
 *
 * @param state - Redux state object.
 * @returns Boolean preference value
 */
export function selectShowDefaultRpcSwitchToast(
  state: Pick<State, 'appState'>,
): boolean {
  return Boolean(state.appState.showDefaultRpcSwitchToast);
}

/**
 * Determines if the storage error toast should be shown based on:
 * - storageWriteErrorType is set (not null/undefined, indicates an error occurred)
 * - User has completed onboarding
 * - Wallet is unlocked
 *
 * @param state - Redux state object.
 * @returns Boolean indicating whether to show the toast
 */
export function selectShowStorageErrorToast(
  state: Pick<State, 'metamask'>,
): boolean {
  const { storageWriteErrorType, completedOnboarding, isUnlocked } =
    state.metamask || {};

  // Check for truthy value to handle both null and undefined as "no error"
  return Boolean(storageWriteErrorType && completedOnboarding && isUnlocked);
}

/**
 * Returns the type of storage write error that occurred.
 * Used to show specific error messages (e.g., disk space vs default error).
 *
 * @param state - Redux state object.
 * @returns The storage write error type or null if no error
 */
export function selectStorageWriteErrorType(
  state: Pick<State, 'metamask'>,
): StorageWriteErrorType | null {
  return state.metamask?.storageWriteErrorType ?? null;
}

/**
 * Whether to show the one-time side panel migration toast.
 * The flag is set by migration 204 for users migrated from popup to side panel.
 *
 * @param state - Redux state object.
 * @returns Boolean preference value
 */
export function selectShowSidePanelMigrationToast(
  state: Pick<State, 'metamask'>,
): boolean {
  return Boolean(
    (state.metamask as Record<string, unknown>)?.showSidePanelMigrationToast,
  );
}
