/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { AppStateController } from './app-state-controller';

/**
 * Get a Promise that resolves when the extension is unlocked.
 * This Promise will never reject.
 *
 * @param shouldShowUnlockRequest - Whether the extension notification
 * popup should be opened.
 * @returns A promise that resolves when the extension is
 * unlocked, or immediately if the extension is already unlocked.
 */
export type AppStateControllerGetUnlockPromiseAction = {
  type: `AppStateController:getUnlockPromise`;
  handler: AppStateController['getUnlockPromise'];
};

/**
 * Sets the default home tab
 *
 * @param defaultHomeActiveTabName - the tab name
 */
export type AppStateControllerSetDefaultHomeActiveTabNameAction = {
  type: `AppStateController:setDefaultHomeActiveTabName`;
  handler: AppStateController['setDefaultHomeActiveTabName'];
};

/**
 * Record that the user has seen the connected status info popover
 */
export type AppStateControllerSetConnectedStatusPopoverHasBeenShownAction = {
  type: `AppStateController:setConnectedStatusPopoverHasBeenShown`;
  handler: AppStateController['setConnectedStatusPopoverHasBeenShown'];
};

/**
 * Record that the user has been shown the recovery phrase reminder.
 */
export type AppStateControllerSetRecoveryPhraseReminderHasBeenShownAction = {
  type: `AppStateController:setRecoveryPhraseReminderHasBeenShown`;
  handler: AppStateController['setRecoveryPhraseReminderHasBeenShown'];
};

export type AppStateControllerSetOnboardingDateAction = {
  type: `AppStateController:setOnboardingDate`;
  handler: AppStateController['setOnboardingDate'];
};

export type AppStateControllerSetLastViewedUserSurveyAction = {
  type: `AppStateController:setLastViewedUserSurvey`;
  handler: AppStateController['setLastViewedUserSurvey'];
};

export type AppStateControllerSetRampCardClosedAction = {
  type: `AppStateController:setRampCardClosed`;
  handler: AppStateController['setRampCardClosed'];
};

export type AppStateControllerSetNewPrivacyPolicyToastClickedOrClosedAction = {
  type: `AppStateController:setNewPrivacyPolicyToastClickedOrClosed`;
  handler: AppStateController['setNewPrivacyPolicyToastClickedOrClosed'];
};

export type AppStateControllerSetNewPrivacyPolicyToastShownDateAction = {
  type: `AppStateController:setNewPrivacyPolicyToastShownDate`;
  handler: AppStateController['setNewPrivacyPolicyToastShownDate'];
};

export type AppStateControllerSetPna25AcknowledgedAction = {
  type: `AppStateController:setPna25Acknowledged`;
  handler: AppStateController['setPna25Acknowledged'];
};

/**
 * Sets the storage write error type, which controls whether to show the storage error toast.
 * When errorType is not null, the toast will be shown with the appropriate message.
 * This is called when set operations fail (storage.local or IndexedDB).
 *
 * @param errorType - The type of storage write error, or null to hide the toast
 */
export type AppStateControllerSetStorageWriteErrorTypeAction = {
  type: `AppStateController:setStorageWriteErrorType`;
  handler: AppStateController['setStorageWriteErrorType'];
};

/**
 * Replaces slides in state with new slides. If a slide with the same id
 * already exists, it will be merged with the new slide.
 *
 * @param slides - Array of new slides
 */
export type AppStateControllerUpdateSlidesAction = {
  type: `AppStateController:updateSlides`;
  handler: AppStateController['updateSlides'];
};

/**
 * Marks a slide as dismissed by ID
 *
 * @param id - ID of the slide to dismiss
 */
export type AppStateControllerRemoveSlideAction = {
  type: `AppStateController:removeSlide`;
  handler: AppStateController['removeSlide'];
};

/**
 * Record the timestamp of the last time the user has seen the recovery phrase reminder
 *
 * @param lastShown - timestamp when user was last shown the reminder.
 */
export type AppStateControllerSetRecoveryPhraseReminderLastShownAction = {
  type: `AppStateController:setRecoveryPhraseReminderLastShown`;
  handler: AppStateController['setRecoveryPhraseReminderLastShown'];
};

/**
 * Record the timestamp of the last time the user has acceoted the terms of use
 *
 * @param lastAgreed - timestamp when user last accepted the terms of use
 */
export type AppStateControllerSetTermsOfUseLastAgreedAction = {
  type: `AppStateController:setTermsOfUseLastAgreed`;
  handler: AppStateController['setTermsOfUseLastAgreed'];
};

/**
 * Record the timestamp of the last time the user has seen the outdated browser warning
 *
 * @param lastShown - Timestamp (in milliseconds) of when the user was last shown the warning.
 */
export type AppStateControllerSetOutdatedBrowserWarningLastShownAction = {
  type: `AppStateController:setOutdatedBrowserWarningLastShown`;
  handler: AppStateController['setOutdatedBrowserWarningLastShown'];
};

/**
 * Sets the last active time to the current time.
 */
export type AppStateControllerSetLastActiveTimeAction = {
  type: `AppStateController:setLastActiveTime`;
  handler: AppStateController['setLastActiveTime'];
};

/**
 * Set the version of the pending extension update, or null when no update is available or after update is applied.
 *
 * @param version - Version string of the available update, or null to clear.
 */
export type AppStateControllerSetPendingExtensionVersionAction = {
  type: `AppStateController:setPendingExtensionVersion`;
  handler: AppStateController['setPendingExtensionVersion'];
};

/**
 * Record the timestamp of the last time the user has dismissed the update modal
 *
 * @param updateModalLastDismissedAt - timestamp of the last time the user has dismissed the update modal.
 */
export type AppStateControllerSetUpdateModalLastDismissedAtAction = {
  type: `AppStateController:setUpdateModalLastDismissedAt`;
  handler: AppStateController['setUpdateModalLastDismissedAt'];
};

/**
 * Record the timestamp of the last time the user has updated
 *
 * @param lastUpdatedAt - timestamp of the last time the user has updated
 */
export type AppStateControllerSetLastUpdatedAtAction = {
  type: `AppStateController:setLastUpdatedAt`;
  handler: AppStateController['setLastUpdatedAt'];
};

/**
 * Record the previous version the user updated from
 *
 * @param fromVersion - the version the user updated from
 */
export type AppStateControllerSetLastUpdatedFromVersionAction = {
  type: `AppStateController:setLastUpdatedFromVersion`;
  handler: AppStateController['setLastUpdatedFromVersion'];
};

/**
 * Sets the current browser and OS environment
 *
 * @param os
 * @param browser
 */
export type AppStateControllerSetBrowserEnvironmentAction = {
  type: `AppStateController:setBrowserEnvironment`;
  handler: AppStateController['setBrowserEnvironment'];
};

/**
 * Adds a pollingToken for a given environmentType
 *
 * @param pollingToken
 * @param pollingTokenType
 */
export type AppStateControllerAddPollingTokenAction = {
  type: `AppStateController:addPollingToken`;
  handler: AppStateController['addPollingToken'];
};

/**
 * removes a pollingToken for a given environmentType
 *
 * @param pollingToken
 * @param pollingTokenType
 */
export type AppStateControllerRemovePollingTokenAction = {
  type: `AppStateController:removePollingToken`;
  handler: AppStateController['removePollingToken'];
};

/**
 * clears all pollingTokens
 */
export type AppStateControllerClearPollingTokensAction = {
  type: `AppStateController:clearPollingTokens`;
  handler: AppStateController['clearPollingTokens'];
};

/**
 * Sets whether the testnet dismissal link should be shown in the network dropdown
 *
 * @param showTestnetMessageInDropdown
 */
export type AppStateControllerSetShowTestnetMessageInDropdownAction = {
  type: `AppStateController:setShowTestnetMessageInDropdown`;
  handler: AppStateController['setShowTestnetMessageInDropdown'];
};

/**
 * Sets whether the beta notification heading on the home page
 *
 * @param showBetaHeader
 */
export type AppStateControllerSetShowBetaHeaderAction = {
  type: `AppStateController:setShowBetaHeader`;
  handler: AppStateController['setShowBetaHeader'];
};

/**
 * Sets whether the permissions tour should be shown to the user
 *
 * @param showPermissionsTour
 */
export type AppStateControllerSetShowPermissionsTourAction = {
  type: `AppStateController:setShowPermissionsTour`;
  handler: AppStateController['setShowPermissionsTour'];
};

/**
 * Sets the product tour to be shown to the user
 *
 * @param productTour - Tour name to show (e.g., 'accountIcon') or empty string to hide
 */
export type AppStateControllerSetProductTourAction = {
  type: `AppStateController:setProductTour`;
  handler: AppStateController['setProductTour'];
};

/**
 * Sets whether the Network Banner should be shown
 *
 * @param showNetworkBanner
 */
export type AppStateControllerSetShowNetworkBannerAction = {
  type: `AppStateController:setShowNetworkBanner`;
  handler: AppStateController['setShowNetworkBanner'];
};

/**
 * Updates the network connection banner state
 *
 * @param networkConnectionBanner - The new banner state
 */
export type AppStateControllerUpdateNetworkConnectionBannerAction = {
  type: `AppStateController:updateNetworkConnectionBanner`;
  handler: AppStateController['updateNetworkConnectionBanner'];
};

/**
 * Sets whether the Account Banner should be shown
 *
 * @param showAccountBanner
 */
export type AppStateControllerSetShowAccountBannerAction = {
  type: `AppStateController:setShowAccountBanner`;
  handler: AppStateController['setShowAccountBanner'];
};

/**
 * Sets a unique ID for the current extension popup
 *
 * @param currentExtensionPopupId
 */
export type AppStateControllerSetCurrentExtensionPopupIdAction = {
  type: `AppStateController:setCurrentExtensionPopupId`;
  handler: AppStateController['setCurrentExtensionPopupId'];
};

/**
 * Sets a property indicating the model of the user's Trezor hardware wallet
 *
 * @param trezorModel - The Trezor model.
 */
export type AppStateControllerSetTrezorModelAction = {
  type: `AppStateController:setTrezorModel`;
  handler: AppStateController['setTrezorModel'];
};

/**
 * A setter for the `nftsDropdownState` property
 *
 * @param nftsDropdownState
 */
export type AppStateControllerUpdateNftDropDownStateAction = {
  type: `AppStateController:updateNftDropDownState`;
  handler: AppStateController['updateNftDropDownState'];
};

/**
 * A setter for the currentPopupId which indicates the id of popup window that's currently active
 *
 * @param currentPopupId
 */
export type AppStateControllerSetCurrentPopupIdAction = {
  type: `AppStateController:setCurrentPopupId`;
  handler: AppStateController['setCurrentPopupId'];
};

/**
 * The function returns information about the last confirmation user interacted with
 */
export type AppStateControllerGetLastInteractedConfirmationInfoAction = {
  type: `AppStateController:getLastInteractedConfirmationInfo`;
  handler: AppStateController['getLastInteractedConfirmationInfo'];
};

/**
 * Update the information about the last confirmation user interacted with
 *
 * @param lastInteractedConfirmationInfo
 */
export type AppStateControllerSetLastInteractedConfirmationInfoAction = {
  type: `AppStateController:setLastInteractedConfirmationInfo`;
  handler: AppStateController['setLastInteractedConfirmationInfo'];
};

/**
 * A getter to retrieve currentPopupId saved in the appState
 */
export type AppStateControllerGetCurrentPopupIdAction = {
  type: `AppStateController:getCurrentPopupId`;
  handler: AppStateController['getCurrentPopupId'];
};

export type AppStateControllerGetThrottledOriginStateAction = {
  type: `AppStateController:getThrottledOriginState`;
  handler: AppStateController['getThrottledOriginState'];
};

export type AppStateControllerUpdateThrottledOriginStateAction = {
  type: `AppStateController:updateThrottledOriginState`;
  handler: AppStateController['updateThrottledOriginState'];
};

/**
 * Completes a QR code scan by resolving the promise with the scanned data.
 *
 * @param scannedData - The data that was scanned from the QR code.
 * @throws If no QR code scan is in progress.
 */
export type AppStateControllerCompleteQrCodeScanAction = {
  type: `AppStateController:completeQrCodeScan`;
  handler: AppStateController['completeQrCodeScan'];
};

/**
 * Cancels the current QR code scan, if one is in progress.
 * This will reject the promise with an error.
 *
 * @param error - The error to reject the promise with.
 * @throws If no QR code scan is in progress.
 */
export type AppStateControllerCancelQrCodeScanAction = {
  type: `AppStateController:cancelQrCodeScan`;
  handler: AppStateController['cancelQrCodeScan'];
};

/**
 * Requests a QR code scan and returns a promise that resolves with the scanned data.
 * If a scan is already in progress, it returns the existing promise.
 *
 * @param request - The QR code scan request.
 * @returns The scanned QR code data.
 */
export type AppStateControllerRequestQrCodeScanAction = {
  type: `AppStateController:requestQrCodeScan`;
  handler: AppStateController['requestQrCodeScan'];
};

/**
 * Sets the active tab information
 *
 * @param tabData - The active tab data
 */
export type AppStateControllerSetAppActiveTabAction = {
  type: `AppStateController:setAppActiveTab`;
  handler: AppStateController['setAppActiveTab'];
};

/**
 * Clears the active tab information by setting appActiveTab to undefined.
 */
export type AppStateControllerClearAppActiveTabAction = {
  type: `AppStateController:clearAppActiveTab`;
  handler: AppStateController['clearAppActiveTab'];
};

/**
 * Sets the pending redirect route to be applied after the default page is loaded.
 *
 * @param route - The pending redirect route.
 */
export type AppStateControllerSetPendingRedirectRouteAction = {
  type: `AppStateController:setPendingRedirectRoute`;
  handler: AppStateController['setPendingRedirectRoute'];
};

export type AppStateControllerSetCanTrackWalletFundsObtainedAction = {
  type: `AppStateController:setCanTrackWalletFundsObtained`;
  handler: AppStateController['setCanTrackWalletFundsObtained'];
};

export type AppStateControllerSetIsWalletResetInProgressAction = {
  type: `AppStateController:setIsWalletResetInProgress`;
  handler: AppStateController['setIsWalletResetInProgress'];
};

export type AppStateControllerGetIsWalletResetInProgressAction = {
  type: `AppStateController:getIsWalletResetInProgress`;
  handler: AppStateController['getIsWalletResetInProgress'];
};

/**
 * Updates state with deferred deep link data.
 *
 * @param deferredDeepLink - Deferred deep link data.
 */
export type AppStateControllerSetDeferredDeepLinkAction = {
  type: `AppStateController:setDeferredDeepLink`;
  handler: AppStateController['setDeferredDeepLink'];
};

/**
 * Removes deferred deep link data.
 */
export type AppStateControllerRemoveDeferredDeepLinkAction = {
  type: `AppStateController:removeDeferredDeepLink`;
  handler: AppStateController['removeDeferredDeepLink'];
};

/**
 * Union of all AppStateController action types.
 */
export type AppStateControllerMethodActions =
  | AppStateControllerGetUnlockPromiseAction
  | AppStateControllerSetDefaultHomeActiveTabNameAction
  | AppStateControllerSetConnectedStatusPopoverHasBeenShownAction
  | AppStateControllerSetRecoveryPhraseReminderHasBeenShownAction
  | AppStateControllerSetOnboardingDateAction
  | AppStateControllerSetLastViewedUserSurveyAction
  | AppStateControllerSetRampCardClosedAction
  | AppStateControllerSetNewPrivacyPolicyToastClickedOrClosedAction
  | AppStateControllerSetNewPrivacyPolicyToastShownDateAction
  | AppStateControllerSetPna25AcknowledgedAction
  | AppStateControllerSetStorageWriteErrorTypeAction
  | AppStateControllerUpdateSlidesAction
  | AppStateControllerRemoveSlideAction
  | AppStateControllerSetRecoveryPhraseReminderLastShownAction
  | AppStateControllerSetTermsOfUseLastAgreedAction
  | AppStateControllerSetOutdatedBrowserWarningLastShownAction
  | AppStateControllerSetLastActiveTimeAction
  | AppStateControllerSetPendingExtensionVersionAction
  | AppStateControllerSetUpdateModalLastDismissedAtAction
  | AppStateControllerSetLastUpdatedAtAction
  | AppStateControllerSetLastUpdatedFromVersionAction
  | AppStateControllerSetBrowserEnvironmentAction
  | AppStateControllerAddPollingTokenAction
  | AppStateControllerRemovePollingTokenAction
  | AppStateControllerClearPollingTokensAction
  | AppStateControllerSetShowTestnetMessageInDropdownAction
  | AppStateControllerSetShowBetaHeaderAction
  | AppStateControllerSetShowPermissionsTourAction
  | AppStateControllerSetProductTourAction
  | AppStateControllerSetShowNetworkBannerAction
  | AppStateControllerUpdateNetworkConnectionBannerAction
  | AppStateControllerSetShowAccountBannerAction
  | AppStateControllerSetCurrentExtensionPopupIdAction
  | AppStateControllerSetTrezorModelAction
  | AppStateControllerUpdateNftDropDownStateAction
  | AppStateControllerSetCurrentPopupIdAction
  | AppStateControllerGetLastInteractedConfirmationInfoAction
  | AppStateControllerSetLastInteractedConfirmationInfoAction
  | AppStateControllerGetCurrentPopupIdAction
  | AppStateControllerGetThrottledOriginStateAction
  | AppStateControllerUpdateThrottledOriginStateAction
  | AppStateControllerCompleteQrCodeScanAction
  | AppStateControllerCancelQrCodeScanAction
  | AppStateControllerRequestQrCodeScanAction
  | AppStateControllerSetAppActiveTabAction
  | AppStateControllerClearAppActiveTabAction
  | AppStateControllerSetPendingRedirectRouteAction
  | AppStateControllerSetCanTrackWalletFundsObtainedAction
  | AppStateControllerSetIsWalletResetInProgressAction
  | AppStateControllerGetIsWalletResetInProgressAction
  | AppStateControllerSetDeferredDeepLinkAction
  | AppStateControllerRemoveDeferredDeepLinkAction;
