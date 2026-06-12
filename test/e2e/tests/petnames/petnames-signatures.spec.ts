import { Suite } from 'mocha';
import { login } from '../../page-objects/flows/login.flow';
import { withSignatureFixtures } from '../confirmations/helpers';
import { TestSuiteArguments } from '../confirmations/transactions/shared';
import TestDapp from '../../page-objects/pages/test-dapp';
import { WINDOW_TITLES } from '../../constants';
import Confirmation from '../../page-objects/pages/confirmations/confirmation';

describe('Petnames - Signatures', function (this: Suite) {
  it('can save names for addresses in type 3 signatures', async function () {
    await withSignatureFixtures(
      this.test?.fullTitle(),
      async ({ driver }: TestSuiteArguments) => {
        const testDapp = new TestDapp(driver);
        const confirmation = new Confirmation(driver);
        await login(driver);
        await testDapp.openTestDappPage();
        await testDapp.clickSignTypedDatav3();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await confirmation.checkNameIsDisplayed('0xCD2a3...DD826', false);
        await confirmation.checkNameIsDisplayed('0xbBbBB...bBBbB', false);
        await confirmation.saveName({
          value: '0xCD2a3...DD826',
          proposedName: 'test.lens',
        });
        await confirmation.saveName({
          value: '0xbBbBB...bBBbB',
          proposedName: 'test2.lens',
        });
        await confirmation.checkNameIsDisplayed('0xCcCCc...ccccC', false);
        await confirmation.saveName({
          value: '0xCcCCc...ccccC',
          name: 'Custom Name',
        });
        await confirmation.checkPageIsLoaded();
        await confirmation.clickFooterCancelButtonAndAndWaitForWindowToClose();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);
        await testDapp.clickSignTypedDatav3();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await confirmation.checkNameIsDisplayed('test.lens', true);
        await confirmation.checkNameIsDisplayed('test2.lens', true);
        await confirmation.checkNameIsDisplayed('Custom Name', true);
      },
    );
  });

  it('can save names for addresses in type 4 signatures', async function () {
    await withSignatureFixtures(
      this.test?.fullTitle(),
      async ({ driver }: TestSuiteArguments) => {
        const testDapp = new TestDapp(driver);
        const confirmation = new Confirmation(driver);
        await login(driver);
        await testDapp.openTestDappPage();
        await testDapp.clickSignTypedDatav4();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await confirmation.checkNameIsDisplayed('0xCD2a3...DD826', false);
        await confirmation.checkNameIsDisplayed('0xDeaDb...DbeeF', false);
        await confirmation.checkNameIsDisplayed('0xbBbBB...bBBbB', false);
        await confirmation.checkNameIsDisplayed('0xB0Bda...bEa57', false);
        await confirmation.checkNameIsDisplayed('0xB0B0b...00000', false);
        await confirmation.saveName({
          value: '0xCD2a3...DD826',
          proposedName: 'test.lens',
        });
        await confirmation.saveName({
          value: '0xB0Bda...bEa57',
          proposedName: 'Test Token 2',
        });
        await confirmation.checkNameIsDisplayed('0xCcCCc...ccccC', false);
        await confirmation.saveName({
          value: '0xCcCCc...ccccC',
          name: 'Custom Name',
        });
        await confirmation.checkPageIsLoaded();
        await confirmation.clickFooterCancelButtonAndAndWaitForWindowToClose();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);
        await testDapp.clickSignTypedDatav4();
        await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
        await confirmation.checkNameIsDisplayed('test.lens', true);
        await confirmation.checkNameIsDisplayed('Test Toke...', true);
        await confirmation.checkNameIsDisplayed('Custom Name', true);
      },
    );
  });
});
