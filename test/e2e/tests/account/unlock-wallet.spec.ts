import { withFixtures } from '../../helpers';
import FixtureBuilderV2 from '../../fixtures/fixture-builder-v2';
import { Driver } from '../../webdriver/driver';
import { Anvil } from '../../seeder/anvil';
import { Ganache } from '../../seeder/ganache';
import HomePage from '../../page-objects/pages/home/homepage';
import LoginPage from '../../page-objects/pages/login-page';
import {
  lockAndWaitForLoginPage,
  login,
} from '../../page-objects/flows/login.flow';

describe('Unlock wallet - ', function () {
  it('handle incorrect password during unlock and login successfully', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2().build(),
        title: this.test?.fullTitle(),
        ignoredConsoleErrors: ['unable to proceed, wallet is locked'],
      },
      async ({
        driver,
        localNodes,
      }: {
        driver: Driver;
        localNodes: Anvil[] | Ganache[] | undefined[];
      }) => {
        await login(driver, { localNode: localNodes[0] });
        // Lock Wallet
        await lockAndWaitForLoginPage(driver);
        const homePage = new HomePage(driver);
        const loginPage = new LoginPage(driver);
        await loginPage.loginToHomepage('123456');
        await loginPage.checkIncorrectPasswordMessageIsDisplayed();
        await loginPage.loginToHomepage();
        await homePage.checkPageIsLoaded();
      },
    );
  });
});
