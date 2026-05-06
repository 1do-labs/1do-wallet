import { Driver } from '../../webdriver/driver';
import { WINDOW_TITLES } from '../../constants';
import TestDapp from '../pages/test-dapp';
import PersonalSignConfirmation from '../pages/confirmations/personal-sign-confirmation';
import SignTypedDataConfirmation from '../pages/confirmations/sign-typed-data-confirmation';
import PermitConfirmation from '../pages/confirmations/permit-confirmation';

/**
 * Sign typed data (eth_signTypedData) flow (non-snap).
 *
 * @param driver - The webdriver instance.
 * @param publicAddress - Address expected to appear in the dapp verification.
 */
export const signTypedData = async (
  driver: Driver,
  publicAddress: string,
): Promise<void> => {
  const testDapp = new TestDapp(driver);
  await testDapp.checkPageIsLoaded();
  await testDapp.clickSignTypedData();
  await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
  const confirmation = new SignTypedDataConfirmation(driver);
  await confirmation.verifyConfirmationHeadingTitle();
  await confirmation.clickFooterConfirmButtonAndAndWaitForWindowToClose();
  await testDapp.checkSuccessSignTypedData(publicAddress);
};

/**
 * Sign typed data V3 flow (non-snap).
 *
 * @param driver - The webdriver instance.
 * @param publicAddress - Address expected to appear in the dapp verification.
 */
export const signTypedDataV3 = async (
  driver: Driver,
  publicAddress: string,
): Promise<void> => {
  const testDapp = new TestDapp(driver);
  await testDapp.checkPageIsLoaded();
  await testDapp.clickSignTypedDatav3();
  await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
  const confirmation = new SignTypedDataConfirmation(driver);
  await confirmation.verifyConfirmationHeadingTitle();
  await confirmation.clickScrollToBottomButton();
  await confirmation.clickFooterConfirmButtonAndAndWaitForWindowToClose();
  await testDapp.checkSuccessSignTypedDataV3(publicAddress);
};

/**
 * Sign typed data V4 flow (non-snap).
 *
 * @param driver - The webdriver instance.
 * @param publicAddress - Address expected to appear in the dapp verification.
 */
export const signTypedDataV4 = async (
  driver: Driver,
  publicAddress: string,
): Promise<void> => {
  const testDapp = new TestDapp(driver);
  await testDapp.checkPageIsLoaded();
  await testDapp.clickSignTypedDatav4();
  await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
  const confirmation = new SignTypedDataConfirmation(driver);
  await confirmation.verifyConfirmationHeadingTitle();
  await confirmation.clickScrollToBottomButton();
  await confirmation.clickFooterConfirmButtonAndAndWaitForWindowToClose();
  await testDapp.checkSuccessSignTypedDataV4(publicAddress);
};
