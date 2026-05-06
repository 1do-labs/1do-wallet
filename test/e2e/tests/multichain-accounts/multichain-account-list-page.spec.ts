import { Mockttp } from 'mockttp';
import { Suite } from 'mocha';
import FixtureBuilderV2 from '../../fixtures/fixture-builder-v2';
import { withFixtures } from '../../helpers';
import { login } from '../../page-objects/flows/login.flow';
import AccountListPage from '../../page-objects/pages/account-list-page';
import HeaderNavbar from '../../page-objects/pages/header-navbar';
import { Driver } from '../../webdriver/driver';
import { MOCK_ETH_CONVERSION_RATE } from '../tokens/utils/mocks';

describe('Multichain Accounts - Multichain accounts list page', function (this: Suite) {
  it('displays wallet and accounts for hardware wallet', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2()
          .withLedgerAccount()
          .withShowNativeTokenAsMainBalanceDisabled()
          .withEnabledNetworks({ eip155: { '0x1': true } })
          .build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await login(driver, {
          expectedBalance: '0',
          waitForNonEvmAccounts: false,
        });
        const headerNavbar = new HeaderNavbar(driver);
        await headerNavbar.openAccountMenu();

        const accountListPage = new AccountListPage(driver);

        // Ensure that wallet information is displayed
        await accountListPage.checkWalletDisplayedInAccountListMenu('Wallet 1');
        await accountListPage.checkWalletDisplayedInAccountListMenu('Ledger');

        // Ensure that accounts within the wallets are displayed
        // The balance is not loaded for a non-selected account (which was never selected before)
        await accountListPage.checkMultichainAccountBalanceDisplayed({
          wallet: 'Wallet 1',
          account: 'Account 1',
          balance: '$0.00',
        });
        await accountListPage.checkMultichainAccountBalanceDisplayed({
          wallet: 'Ledger',
          account: 'Ledger 1',
          balance: '$0.00',
        });
        await accountListPage.checkMultichainAccountNameDisplayed('Account 1');
        await accountListPage.checkMultichainAccountNameDisplayed('Ledger 1');
      },
    );
  });
});
