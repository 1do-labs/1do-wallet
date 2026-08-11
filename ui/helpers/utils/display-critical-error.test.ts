import browser from 'webextension-polyfill';
import { act } from 'react-dom/test-utils';
import * as errorUtils from '../../../shared/lib/error-utils';
import {
  displayCriticalErrorMessage,
  CriticalErrorTranslationKey,
} from './display-critical-error';

const MOCK_RELEASE_VERSION = '13.0.0';
jest.mock('webextension-polyfill', () => ({
  runtime: {
    reload: jest.fn(),
    getManifest: jest.fn(() => ({ version: MOCK_RELEASE_VERSION })),
  },
}));

describe('displayCriticalError', () => {
  let rootContainer: HTMLElement;
  let container: HTMLElement;
  let consoleErrorSpy: jest.SpyInstance;
  const MOCK_ERROR_MESSAGE = 'test error';

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    container = document.createElement('div');
    // When a critical error is displayed, the main application container is removed from the DOM.
    // We use `container.parentElement` to determine whether the container has been removed yet or
    // not. The mock container starts with a parent so that it looks like no error has occurred
    // yet.
    rootContainer = document.createElement('div');
    rootContainer.appendChild(container);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);

    jest.spyOn(errorUtils, 'maybeGetLocaleContext').mockResolvedValue({
      preferredLocale: 'en',
      t: (key: string) => key,
    });

    jest.spyOn(errorUtils, 'getErrorHtml').mockImplementation(
      (_errorKey, _error, _localeContext, _supportLink) => `
        <div>
          <button id="critical-error-button">Restart</button>
        </div>
      `,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it('renders critical error html into parent of container', async () => {
    const error = new Error(MOCK_ERROR_MESSAGE);

    await expect(
      displayCriticalErrorMessage(
        container,
        CriticalErrorTranslationKey.TroubleStarting,
        error,
        'en',
      ),
    ).rejects.toThrow(error);

    expect(errorUtils.getErrorHtml).toHaveBeenCalledWith(
      CriticalErrorTranslationKey.TroubleStarting,
      error,
      { preferredLocale: 'en', t: expect.any(Function) },
      expect.any(String),
    );
    expect(
      rootContainer.querySelector('#critical-error-content')?.innerHTML,
    ).toContain('critical-error-button');
  });

  it('clicking restart reloads without sending a remote report', async () => {
    const error = new Error(MOCK_ERROR_MESSAGE);

    await expect(
      displayCriticalErrorMessage(
        container,
        CriticalErrorTranslationKey.TroubleStarting,
        error,
        'en',
      ),
    ).rejects.toThrow(error);

    const restartButton = rootContainer.querySelector<HTMLButtonElement>(
      '#critical-error-button',
    );
    expect(restartButton).toBeTruthy();

    if (restartButton) {
      const flushPromises = () => new Promise(setImmediate);
      await act(async () => {
        restartButton.click();
        await flushPromises();
      });

      expect(fetch).not.toHaveBeenCalled();
      expect(browser.runtime.reload).toHaveBeenCalled();
    }
  });
});
