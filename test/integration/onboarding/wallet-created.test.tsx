import React from 'react';
import { waitFor } from '@testing-library/react';
import mockMetaMaskState from '../data/onboarding-completion-route.json';
import { integrationTestRender } from '../../lib/render-helpers';
import * as backgroundConnection from '../../../ui/store/background-connection';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../shared/constants/metametrics';
import {
  clickElementById,
  createMockImplementation,
  waitForElementByText,
} from '../helpers';

jest.mock('../../../ui/store/background-connection', () => ({
  ...jest.requireActual('../../../ui/store/background-connection'),
  submitRequestToBackground: jest.fn(),
}));

jest.mock(
  '../../../ui/pages/onboarding-flow/welcome/fox-appear-animation',
  () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    default: () => <div data-testid="fox-appear-animation" />,
  }),
);

jest.mock(
  '../../../ui/pages/onboarding-flow/welcome/metamask-wordmark-animation',
  () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    default: () => <div data-testid="metamask-wordmark-animation" />,
  }),
);

jest.mock(
  '../../../ui/pages/onboarding-flow/creation-successful/wallet-ready-animation',
  () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    default: () => <div data-testid="wallet-ready-animation" />,
  }),
);

const mockedBackgroundConnection = jest.mocked(backgroundConnection);

const backgroundConnectionMocked = {
  onNotification: jest.fn(),
  submitRequestToBackground: jest.fn(),
};

const setupSubmitRequestToBackgroundMocks = (
  mockRequests?: Record<string, unknown>,
) => {
  mockedBackgroundConnection.submitRequestToBackground.mockImplementation(
    createMockImplementation({
      ...mockRequests,
    }),
  );
};

describe('Wallet Created Events', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupSubmitRequestToBackgroundMocks();
  });

  it('are sent when onboarding user who chooses to opt in metrics', async () => {
    await integrationTestRender({
      preloadedState: mockMetaMaskState,
      backgroundConnection: backgroundConnectionMocked,
    });

    await waitForElementByText('Your wallet is ready!');
    await clickElementById('onboarding-complete-done');

    // Verify both completeOnboarding and ExtensionPinned event are called
    let completeOnboardingCall;
    let extensionPinnedEvent;

    await waitFor(() => {
      completeOnboardingCall =
        mockedBackgroundConnection.submitRequestToBackground.mock.calls?.find(
          (call) => call[0] === 'completeOnboarding',
        );

      extensionPinnedEvent =
        mockedBackgroundConnection.submitRequestToBackground.mock.calls?.find(
          (call) => call[0] === 'trackMetaMetricsEvent',
        );

      expect(completeOnboardingCall?.[0]).toBe('completeOnboarding');
      expect(extensionPinnedEvent?.[0]).toBe('trackMetaMetricsEvent');
    });

    expect(extensionPinnedEvent?.[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: MetaMetricsEventCategory.Onboarding,
          event: MetaMetricsEventName.OnboardingCompleted,
          properties: {
            // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
            // eslint-disable-next-line @typescript-eslint/naming-convention
            wallet_setup_type: 'create',
            // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
            // eslint-disable-next-line @typescript-eslint/naming-convention
            new_wallet: true,
            // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
            // eslint-disable-next-line @typescript-eslint/naming-convention
            is_basic_functionality_enabled: true,
          },
        }),
      ]),
    );
  });
});
