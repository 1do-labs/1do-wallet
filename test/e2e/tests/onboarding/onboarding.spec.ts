import { Browser } from 'selenium-webdriver';
import { Mockttp } from 'mockttp';
import { TEST_SEED_PHRASE, WALLET_PASSWORD } from '../../constants';
import {
  convertToHexValue,
  withFixtures,
  isSidePanelEnabled,
} from '../../helpers';
import { Driver } from '../../webdriver/driver';
import FixtureBuilderV2 from '../../fixtures/fixture-builder-v2';
import { FirstTimeFlowType } from '../../../../shared/constants/onboarding';
import HomePage from '../../page-objects/pages/home/homepage';
import OnboardingCompletePage from '../../page-objects/pages/onboarding/onboarding-complete-page';
import OnboardingMetricsPage from '../../page-objects/pages/onboarding/onboarding-metrics-page';
import OnboardingPasswordPage from '../../page-objects/pages/onboarding/onboarding-password-page';
import OnboardingPrivacySettingsPage from '../../page-objects/pages/onboarding/onboarding-privacy-settings-page';
import OnboardingSrpPage from '../../page-objects/pages/onboarding/onboarding-srp-page';
import SecureWalletPage from '../../page-objects/pages/onboarding/secure-wallet-page';
import StartOnboardingPage from '../../page-objects/pages/onboarding/start-onboarding-page';
import {
  completeCreateNewWalletOnboardingFlow,
  completeImportSRPOnboardingFlow,
  importSRPOnboardingFlow,
  incompleteCreateNewWalletOnboardingFlow,
  onboardingMetricsFlow,
  handleSidepanelPostOnboarding,
} from '../../page-objects/flows/onboarding.flow';
import LoginPage from '../../page-objects/pages/login-page';

const IMPORTED_SRP_ACCOUNT_1 = '0x0Cc5261AB8cE458dc977078A3623E2BaDD27afD3';

async function mockSpotPrices(mockServer: Mockttp) {
  return await mockServer
    .forGet(/^https:\/\/price\.api\.cx\.metamask\.io\/v3\/spot-prices/u)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        'eip155:1/slip44:60': {
          id: 'ethereum',
          price: 1700,
          marketCap: 382623505141,
          pricePercentChange1d: 0,
        },
      },
    }));
}

describe('MetaMask onboarding', function () {
  it("Creates a new wallet, sets up a secure password, and doesn't complete the onboarding process and refreshes the page", async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true }).build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await incompleteCreateNewWalletOnboardingFlow({ driver });
        await driver.refresh();

        const loginPage = new LoginPage(driver);
        await loginPage.checkPageIsLoaded();
        await loginPage.loginToHomepage();

        const secureWalletPage = new SecureWalletPage(driver);
        await secureWalletPage.checkPageIsLoaded();
        await secureWalletPage.revealAndConfirmSRP();

        if (process.env.SELENIUM_BROWSER !== Browser.FIREFOX) {
          await onboardingMetricsFlow(driver);
        }

        const onboardingCompletePage = new OnboardingCompletePage(driver);
        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.checkWalletReadyMessageIsDisplayed();
        await onboardingCompletePage.completeOnboarding();

        // Handle sidepanel navigation if needed
        await handleSidepanelPostOnboarding(driver);

        const homePage = new HomePage(driver);
        await homePage.checkPageIsLoaded();
        await homePage.checkExpectedBalanceIsDisplayed('0');
      },
    );
  });

  it('Creates a new wallet, sets up a secure password, and completes the onboarding process', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true }).build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await completeCreateNewWalletOnboardingFlow({
          driver,
        });
        const homePage = new HomePage(driver);
        await homePage.checkPageIsLoaded();
        await homePage.checkExpectedBalanceIsDisplayed('0');
      },
    );
  });

  it('Imports an existing wallet, sets up a secure password, and completes the onboarding process', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true })
          .withPreferencesController({
            preferences: {
              showNativeTokenAsMainBalance: true,
            },
          })
          .withEnabledNetworks({
            eip155: {
              '0x1': true,
            },
          })
          .build(),
        testSpecificMock: mockSpotPrices,
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await completeImportSRPOnboardingFlow({ driver });
        const homePage = new HomePage(driver);
        await homePage.checkPageIsLoaded();
        await homePage.checkExpectedBalanceIsDisplayed('25', 'ETH');
      },
    );
  });

  it('Attempts to import a wallet with an incorrect Secret Recovery Phrase and verifies the error message', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true }).build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        const wrongSeedPhrase =
          'test test test test test test test test test test test test';
        await driver.navigate();

        if (process.env.SELENIUM_BROWSER === Browser.FIREFOX) {
          const onboardingMetricsPage = new OnboardingMetricsPage(driver);
          await onboardingMetricsPage.checkPageIsLoaded();
          await onboardingMetricsPage.skipMetricAndContinue();
        }

        const startOnboardingPage = new StartOnboardingPage(driver);
        await startOnboardingPage.checkLoginPageIsLoaded();
        await startOnboardingPage.importWallet();

        const onboardingSrpPage = new OnboardingSrpPage(driver);
        await onboardingSrpPage.checkPageIsLoaded();

        await onboardingSrpPage.fillSrp(wrongSeedPhrase);
        await onboardingSrpPage.checkSrpError();
        await onboardingSrpPage.checkConfirmSrpButtonIsDisabled();
      },
    );
  });

  it('Verifies error handling when entering an incorrect password during wallet creation', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true }).build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        const wrongTestPassword = 'test test test test';
        await driver.navigate();

        if (process.env.SELENIUM_BROWSER === Browser.FIREFOX) {
          const onboardingMetricsPage = new OnboardingMetricsPage(driver);
          await onboardingMetricsPage.checkPageIsLoaded();
          await onboardingMetricsPage.skipMetricAndContinue();
        }

        const startOnboardingPage = new StartOnboardingPage(driver);
        await startOnboardingPage.checkLoginPageIsLoaded();
        await startOnboardingPage.createWalletWithSrp();

        const onboardingPasswordPage = new OnboardingPasswordPage(driver);
        await onboardingPasswordPage.checkPageIsLoaded();
        await onboardingPasswordPage.fillWalletPassword(
          WALLET_PASSWORD,
          wrongTestPassword,
        );

        // check the incorrect password warning message is displayed
        await onboardingPasswordPage.checkIncorrectPasswordWarningMessageIsDisplayed();
        await onboardingPasswordPage.checkConfirmPasswordButtonIsDisabled();
      },
    );
  });

  it('User can add custom network during onboarding', async function () {
    const networkName = 'Localhost 8546';
    const networkUrl = 'http://127.0.0.1:8546';
    const currencySymbol = 'ETH';
    const port = 8546;
    const chainId = 1338;
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true })
          .withPreferencesController({
            preferences: {
              showNativeTokenAsMainBalance: true,
            },
          })
          .build(),
        localNodeOptions: [
          {
            type: 'anvil',
          },
          {
            type: 'anvil',
            options: {
              port,
              chainId,
            },
          },
        ],
        testSpecificMock: mockSpotPrices,
        title: this.test?.fullTitle(),
      },
      async ({ driver, localNodes }) => {
        await localNodes[1].setAccountBalance(
          IMPORTED_SRP_ACCOUNT_1,
          convertToHexValue(10000000000000000000),
        );
        await importSRPOnboardingFlow({
          driver,
          seedPhrase: TEST_SEED_PHRASE,
        });

        const onboardingCompletePage = new OnboardingCompletePage(driver);
        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.checkWalletReadyMessageIsDisplayed();
        await onboardingCompletePage.navigateToDefaultPrivacySettings();

        const onboardingPrivacySettingsPage = new OnboardingPrivacySettingsPage(
          driver,
        );
        await onboardingPrivacySettingsPage.addCustomNetwork(
          networkName,
          chainId,
          currencySymbol,
          networkUrl,
        );
        await onboardingPrivacySettingsPage.navigateBackToOnboardingCompletePage();

        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.completeOnboarding();

        // Handle sidepanel navigation if needed
        await handleSidepanelPostOnboarding(driver);

        const homePage = new HomePage(driver);
        await homePage.checkPageIsLoaded();

        // Fiat value should be displayed as we mock the price and that is not a 'test network'
        await homePage.checkExpectedBalanceIsDisplayed('10', 'ETH');

        // Check for network addition toast
        // Note: With sidepanel enabled, appState is lost during page reload,
        // so the toast notification won't appear. The successful balance display
        // above confirms the network was added correctly.
        if (await isSidePanelEnabled()) {
          console.log(
            `Skipping toast check for sidepanel build - network '${networkName}' added successfully (verified by balance display)`,
          );
        } else {
          await homePage.checkAddNetworkMessageIsDisplayed(networkName);
        }
      },
    );
  });

  it('User can turn off basic functionality in default settings', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true }).build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }) => {
        await importSRPOnboardingFlow({ driver });

        const onboardingCompletePage = new OnboardingCompletePage(driver);
        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.checkWalletReadyMessageIsDisplayed();
        await onboardingCompletePage.navigateToDefaultPrivacySettings();

        const onboardingPrivacySettingsPage = new OnboardingPrivacySettingsPage(
          driver,
        );
        await onboardingPrivacySettingsPage.toggleBasicFunctionalitySettings();
        await onboardingPrivacySettingsPage.navigateBackToOnboardingCompletePage();

        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.completeOnboarding();

        // Handle sidepanel navigation if needed
        await handleSidepanelPostOnboarding(driver);

        const homePage = new HomePage(driver);
        await homePage.checkPageIsLoaded();
      },
    );
  });

  it('Provides an onboarding path for a user who has restored their account from state persistence failure', async function () {
    // We don't use onboarding: true here because we want there to be a vault,
    // simulating what will happen when a user eventually restores their vault
    // during a state persistence failure. Instead, we set the
    // firstTimeFlowType to 'restore' and completedOnboarding to false. as well
    // as some other first time state options to get us into an onboarding
    // state similar to a new state tree.
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2()
          .withOnboardingController({
            completedOnboarding: false,
            firstTimeFlowType: FirstTimeFlowType.restore,
            seedPhraseBackedUp: null,
          })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }) => {
        await driver.navigate();
        const loginPage = new LoginPage(driver);
        await loginPage.checkPageIsLoaded();
        await loginPage.loginToHomepage();
        // First screen we should be on is MetaMetrics
        const onboardingMetricsPage = new OnboardingMetricsPage(driver);
        await onboardingMetricsPage.checkPageIsLoaded();
        await onboardingMetricsPage.skipMetricAndContinue();

        // Next screen should be Secure your wallet screen
        const secureWalletPage = new SecureWalletPage(driver);
        await secureWalletPage.checkPageIsLoaded();
      },
    );
  });

  it('Navigates to a route using deferred deep link after onboarding completes', async function () {
    const referringLink = 'https://link.1do.io/home?sig=valid-test-signature';
    const expectedPath = '/home';

    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true })
          .withAppStateController({
            deferredDeepLink: {
              createdAt: Date.now(),
              referringLink,
            },
          })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await importSRPOnboardingFlow({
          driver,
          seedPhrase: TEST_SEED_PHRASE,
        });

        const onboardingCompletePage = new OnboardingCompletePage(driver);
        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.checkWalletReadyMessageIsDisplayed();

        // This click triggers deferred deep link navigation
        await onboardingCompletePage.completeOnboarding();

        let lastUrl = await driver.getCurrentUrl();

        await driver.waitUntil(
          async () => {
            lastUrl = await driver.getCurrentUrl();
            return lastUrl.includes(expectedPath);
          },
          { interval: 200, timeout: 10000 },
        );

        if (!lastUrl.includes(expectedPath)) {
          throw new Error(
            `Expected to navigate to home route after onboarding, but current URL was: ${lastUrl}`,
          );
        }
      },
    );
  });

  it('Shows interstitial warning page for unsigned deferred deep link after onboarding completes', async function () {
    // This deep link is unsigned (no sig parameter)
    const referringLink = 'https://link.1do.io/home';
    const expectedInterstitialPath = '/link';

    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true })
          .withAppStateController({
            deferredDeepLink: {
              createdAt: Date.now(),
              referringLink,
            },
          })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await importSRPOnboardingFlow({
          driver,
          seedPhrase: TEST_SEED_PHRASE,
        });

        const onboardingCompletePage = new OnboardingCompletePage(driver);
        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.checkWalletReadyMessageIsDisplayed();

        // This click triggers deferred deep link navigation
        await onboardingCompletePage.completeOnboarding();

        let lastUrl = await driver.getCurrentUrl();

        // Should navigate to the interstitial page for unsigned links
        await driver.waitUntil(
          async () => {
            lastUrl = await driver.getCurrentUrl();
            return lastUrl.includes(expectedInterstitialPath);
          },
          { interval: 200, timeout: 10000 },
        );

        if (!lastUrl.includes(expectedInterstitialPath)) {
          throw new Error(
            `Expected to navigate to interstitial page (${expectedInterstitialPath}) for unsigned deep link, but current URL was: ${lastUrl}`,
          );
        }

        // Verify the interstitial page shows the caution warning
        // The page displays: "You were sent here by a third party, not MetaMask."
        await driver.waitForSelector({
          css: '[data-testid="deep-link-description"]',
          text: 'third party',
        });
      },
    );
  });

  it('Shows interstitial warning page for deferred deep link with invalid signature after onboarding completes', async function () {
    const referringLink =
      'https://link.1do.io/home?sig=aW52YWxpZC1zaWduYXR1cmU=';
    const expectedInterstitialPath = '/link';

    await withFixtures(
      {
        fixtures: new FixtureBuilderV2({ onboarding: true })
          .withAppStateController({
            deferredDeepLink: {
              createdAt: Date.now(),
              referringLink,
            },
          })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await importSRPOnboardingFlow({
          driver,
          seedPhrase: TEST_SEED_PHRASE,
        });

        const onboardingCompletePage = new OnboardingCompletePage(driver);
        await onboardingCompletePage.checkPageIsLoaded();
        await onboardingCompletePage.checkWalletReadyMessageIsDisplayed();

        // This click triggers deferred deep link navigation
        await onboardingCompletePage.completeOnboarding();

        let lastUrl = await driver.getCurrentUrl();

        // Should navigate to the interstitial page for links with invalid signature
        await driver.waitUntil(
          async () => {
            lastUrl = await driver.getCurrentUrl();
            return lastUrl.includes(expectedInterstitialPath);
          },
          { interval: 200, timeout: 10000 },
        );

        if (!lastUrl.includes(expectedInterstitialPath)) {
          throw new Error(
            `Expected to navigate to interstitial page (${expectedInterstitialPath}) for deep link with invalid signature, but current URL was: ${lastUrl}`,
          );
        }

        // Verify the interstitial page shows the caution warning
        // The page displays: "You were sent here by a third party, not MetaMask."
        await driver.waitForSelector({
          css: '[data-testid="deep-link-description"]',
          text: 'third party',
        });
      },
    );
  });
});
