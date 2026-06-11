import browser from 'webextension-polyfill';
import log from 'loglevel';
import { ErrorLike } from '../../../shared/constants/errors';
import {
  getErrorHtml,
  maybeGetLocaleContext,
} from '../../../shared/lib/error-utils';
import { SUPPORT_LINK } from '../../../shared/lib/ui-utils';

export enum CriticalErrorTranslationKey {
  TroubleStarting = 'troubleStarting',
  SomethingIsWrong = 'somethingIsWrong',
}

/**
 * Sentry remote reporting is disabled for this wallet build.
 *
 * @param error - The error object to report to Sentry
 * @returns Promise that resolves after local logging
 */
async function sendErrorToSentry(error: ErrorLike): Promise<void> {
  console.error('Critical error remote reporting disabled:', error);
}

/**
 * Handles the restart action: sends error report to Sentry (if enabled) and restarts 1do.
 *
 * @param error - The error object to report
 * @param shouldReport - Whether to send the error report to Sentry
 */
async function handleRestartAction(
  error: ErrorLike,
  shouldReport: boolean,
): Promise<void> {
  // Send error report to Sentry first (if enabled)
  if (shouldReport) {
    await sendErrorToSentry(error);
  }
  // Restart the extension
  browser.runtime.reload();
}

/**
 * Displays a critical error message in the given container.
 *
 * This function always throws the error after displaying the message.
 *
 * @param container - The HTML element to display the error in.
 * @param errorKey - The key for the error message to display.
 * @param error - The error object to log.
 * @param currentLocale - Optional locale context for translations.
 * @throws {ErrorLike} Throws the error after displaying the message.
 * @returns A promise that resolves to never, as it always throws an error.
 */
export async function displayCriticalErrorMessage(
  container: HTMLElement,
  errorKey: CriticalErrorTranslationKey,
  error: ErrorLike,
  currentLocale?: string,
): Promise<never> {
  const localeContext = await maybeGetLocaleContext(currentLocale);
  const html = getErrorHtml(errorKey, error, localeContext, SUPPORT_LINK);

  const criticalErrorContainer = displayCriticalErrorPage(container, html);
  if (criticalErrorContainer) {
    const restartButton =
      criticalErrorContainer.querySelector<HTMLButtonElement>(
        '#critical-error-button',
      );
    const reportCheckbox =
      criticalErrorContainer.querySelector<HTMLInputElement>(
        '#critical-error-checkbox',
      );

    // Restart button: report error and restart 1do
    restartButton?.addEventListener('click', async () => {
      const shouldReport = reportCheckbox?.checked ?? false;
      await handleRestartAction(error, shouldReport);
    });
  }

  log.error(error.stack);
  throw error;
}

/**
 * Displays a critical error in the given container using the given HTML.
 *
 * @param container - The HTML element to display the error in.
 * @param html - The HTML contents of the critical error page.
 */
export function displayCriticalErrorPage(
  container: HTMLElement,
  html: string,
): HTMLElement | undefined {
  const appContainerParent = container.parentElement;
  if (!appContainerParent) {
    console.warn(
      'Cannot display critical error. Another critical error may already be shown.',
    );
    return undefined;
  }

  const criticalErrorContainer = document.createElement('div');
  criticalErrorContainer.setAttribute('id', 'critical-error-content');
  criticalErrorContainer.innerHTML = html;

  // Prevent app contents from writing over critical error by removing application root.
  appContainerParent.removeChild(container);
  appContainerParent.prepend(criticalErrorContainer);
  return criticalErrorContainer;
}
