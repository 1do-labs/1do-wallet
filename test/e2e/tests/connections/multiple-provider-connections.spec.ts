/**
 * This test suite is for testing connecting to a dapp with different EVM permission states.
 */
import {
  ACCOUNT_2,
  DAPP_HOST_ADDRESS,
  DEFAULT_FIXTURE_ACCOUNT as EVM_ADDRESS_ONE,
  WINDOW_TITLES,
} from '../../constants';
import { withFixtures } from '../../helpers';
import {
  BASE_DISPLAY_NAME,
  LINEA_MAINNET_DISPLAY_NAME,
  MAINNET_DISPLAY_NAME,
  ARBITRUM_DISPLAY_NAME,
  BSC_DISPLAY_NAME,
  POLYGON_DISPLAY_NAME,
  OPTIMISM_DISPLAY_NAME,
} from '../../../../shared/constants/network';
import SitePermissionPage from '../../page-objects/pages/permission/site-permission-page';
import TestDapp from '../../page-objects/pages/test-dapp';
import ConnectAccountConfirmation from '../../page-objects/pages/confirmations/connect-account-confirmation';
import { login } from '../../page-objects/flows/login.flow';
import { connectAccountToTestDapp } from '../../page-objects/flows/test-dapp.flow';
import { getPermissionsPageForHost } from '../../page-objects/flows/permissions.flow';
import FixtureBuilderV2 from '../../fixtures/fixture-builder-v2';
import { Driver } from '../../webdriver/driver';
import NetworkPermissionSelectModal from '../../page-objects/pages/dialog/network-permission-select-modal';
import EditConnectedAccountsModal from '../../page-objects/pages/dialog/edit-connected-accounts-modal';

const EVM_ADDRESS_TWO = ACCOUNT_2;

const EVM_ACCOUNT_LABEL_ONE = 'Account 1';
const EVM_ACCOUNT_LABEL_TWO = 'Account 2';

/**
 * Checks if an account is displayed
 *
 * @param driver - The test driver
 * @param account - The account to check
 */
async function checkIsAccountDisplayed(
  driver: Driver,
  account: string,
): Promise<void> {
  await driver.waitForSelector({
    text: account,
    tag: 'p',
  });
}

/**
 * Helper to check if the accounts and networks are displayed in the site permission page.
 *
 * @param driver - The test driver
 * @param sitePermissionPage - The site permission page to use.
 * @param networks - The networks to check.
 * @param accounts - The accounts to check.
 */
async function checkAccountsAndNetworksDisplayed(
  driver: Driver,
  sitePermissionPage: SitePermissionPage,
  networks: string[],
  accounts: string[],
) {
  await sitePermissionPage.checkPageIsLoaded(DAPP_HOST_ADDRESS);
  await sitePermissionPage.openNetworkPermissionsModal();
  const networkPermissionSelectModal = new NetworkPermissionSelectModal(driver);
  await networkPermissionSelectModal.checkPageIsLoaded();

  await networkPermissionSelectModal.checkNetworkStatus(networks);

  await networkPermissionSelectModal.clickConfirmEditButton();
  await sitePermissionPage.openAccountPermissionsModal();
  const accountPermissionSelectModal = new EditConnectedAccountsModal(driver);
  await accountPermissionSelectModal.checkPageIsLoaded();

  for (const account of accounts) {
    await checkIsAccountDisplayed(driver, account);
  }
}

/**
 * Helper to get a request permissions request object with a caveat.
 *
 * @param accounts - The accounts to be requested.
 * @returns The request permissions request object with the caveat.
 */
function getRequestPermissionsRequestObject(accounts: string[] = []): string {
  const caveats =
    accounts.length > 0
      ? {
          caveats: [
            {
              type: 'restrictReturnedAccounts',
              value: accounts,
            },
          ],
        }
      : {};

  return JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_requestPermissions',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
    // eslint-disable-next-line @typescript-eslint/naming-convention
    params: [{ eth_accounts: caveats }],
  });
}

/**
 * Helper to get a request permissions request object with network restrictions.
 *
 * @param networks - Array of network IDs to restrict switching to
 * @returns the wallet_requestPermissions request string
 */
function getRestrictedNetworks(networks: string[]): string {
  const restrictNetworks = {
    'endowment:permitted-chains': {
      caveats: [
        {
          type: 'restrictNetworkSwitching',
          value: networks,
        },
      ],
    },
  };

  return JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_requestPermissions',
    params: [restrictNetworks],
  });
}

describe('Multiple Standard Dapp Connections', function () {
  it('should default account selection to already permitted account(s) plus the selected account (if not already permissioned) when `wallet_requestPermissions` is called with no accounts specified', async function () {
    await withFixtures(
      {
        dappOptions: { numberOfTestDapps: 1 },
        fixtures: new FixtureBuilderV2()
          .withKeyringControllerAdditionalAccountVault()
          .withAccountsControllerAdditionalAccountVault()
          .withPermissionControllerConnectedToTestDapp({
            account: EVM_ADDRESS_TWO,
          })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }) => {
        await login(driver, { validateBalance: false });
        const testDapp = new TestDapp(driver);

        const connectAccountConfirmation = new ConnectAccountConfirmation(
          driver,
        );

        await testDapp.openTestDappPage();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

        await testDapp.checkPageIsLoaded();

        await testDapp.checkConnectedAccounts(EVM_ADDRESS_TWO);

        const requestPermissionsWithoutAccounts =
          getRequestPermissionsRequestObject();

        await driver.executeScript(
          `window.ethereum.request(${requestPermissionsWithoutAccounts})`,
        );

        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        await connectAccountConfirmation.checkPageIsLoaded();

        await checkIsAccountDisplayed(driver, EVM_ACCOUNT_LABEL_TWO);

        await connectAccountConfirmation.confirmConnect();

        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);
        await testDapp.checkConnectedAccounts(EVM_ADDRESS_TWO);
      },
    );
  });

  it('should default account selection to both accounts when `wallet_requestPermissions` is called with specific account while another is already connected', async function () {
    await withFixtures(
      {
        dappOptions: { numberOfTestDapps: 1 },
        fixtures: new FixtureBuilderV2()
          .withKeyringControllerAdditionalAccountVault()
          .withAccountsControllerAdditionalAccountVault()
          .withPermissionControllerConnectedToTestDapp({
            account: EVM_ADDRESS_TWO,
          })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }) => {
        await login(driver, { validateBalance: false });
        const testDapp = new TestDapp(driver);
        const connectAccountConfirmation = new ConnectAccountConfirmation(
          driver,
        );

        await testDapp.openTestDappPage();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);
        await testDapp.checkPageIsLoaded();

        await testDapp.checkConnectedAccounts(EVM_ADDRESS_TWO);

        const requestPermissionsWithAccount1 =
          getRequestPermissionsRequestObject([EVM_ADDRESS_ONE]);

        await driver.executeScript(
          `window.ethereum.request(${requestPermissionsWithAccount1})`,
        );

        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);

        await connectAccountConfirmation.checkPageIsLoaded();

        await checkIsAccountDisplayed(driver, EVM_ACCOUNT_LABEL_ONE);

        await checkIsAccountDisplayed(driver, EVM_ACCOUNT_LABEL_TWO);

        await connectAccountConfirmation.confirmConnect();

        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

        const expectedConnectedAccounts = `${EVM_ADDRESS_TWO.toLowerCase()},${EVM_ADDRESS_ONE.toLowerCase()}`;
        await testDapp.checkConnectedAccounts(expectedConnectedAccounts);
      },
    );
  });

});
