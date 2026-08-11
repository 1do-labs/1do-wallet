import { Driver } from '../../webdriver/driver';

class ErrorPage {
  private readonly driver: Driver;

  // Locators
  private readonly errorPageTitle = '[data-testid="error-page-title"]';

  private readonly errorMessage = '[data-testid="error-page-error-message"]';

  private readonly contactSupportButton =
    '[data-testid="error-page-contact-support-button"]';

  private readonly visitSupportDataConsentModal =
    '[data-testid="visit-support-data-consent-modal"]';

  private readonly visitSupportDataConsentModalAcceptButton =
    '[data-testid="visit-support-data-consent-modal-accept-button"]';

  private readonly visitSupportDataConsentModalRejectButton =
    '[data-testid="visit-support-data-consent-modal-reject-button"]';

  constructor(driver: Driver) {
    this.driver = driver;
  }

  async checkPageIsLoaded(): Promise<void> {
    try {
      await this.driver.waitForSelector(this.errorPageTitle);
    } catch (e) {
      console.log('Timeout while waiting for Error page to be loaded', e);
      throw e;
    }
    console.log('Error page is loaded');
  }

  async validateErrorMessage(): Promise<void> {
    await this.driver.waitForSelector({
      text: `Message: Unable to find value of key "developerOptions" for locale "en"`,
      css: this.errorMessage,
    });
  }

  async clickContactButton(): Promise<void> {
    console.log(`Contact metamask support form in a separate page`);
    await this.driver.waitUntilXWindowHandles(1);
    await this.driver.findScrollToAndClickElement(this.contactSupportButton);
  }

  async consentDataToMetamaskSupport(): Promise<void> {
    await this.driver.waitForSelector(this.visitSupportDataConsentModal);
    await this.driver.clickElementAndWaitToDisappear(
      this.visitSupportDataConsentModalAcceptButton,
    );
    // metamask, help page
    await this.driver.waitUntilXWindowHandles(2);
  }

  async rejectDataToMetamaskSupport(): Promise<void> {
    await this.driver.waitForSelector(this.visitSupportDataConsentModal);
    await this.driver.clickElementAndWaitToDisappear(
      this.visitSupportDataConsentModalRejectButton,
    );
    await this.driver.waitUntilXWindowHandles(2);
  }
}

export default ErrorPage;
