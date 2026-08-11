import { strict as assert } from 'assert';
import { Suite } from 'mocha';
import { Driver } from '../../webdriver/driver';
import { withFixtures } from '../../helpers';
import FixtureBuilderV2 from '../../fixtures/fixture-builder-v2';
import PreferencesAndDisplaySettings from '../../page-objects/pages/settings/preferences-and-display-settings';
import HeaderNavbar from '../../page-objects/pages/header-navbar';
import { login } from '../../page-objects/flows/login.flow';
import en from '../../../../app/_locales/en/messages.json';
import zhCN from '../../../../app/_locales/zh_CN/messages.json';

const selectors = {
  currentLanguageEnglish: { tag: 'p', text: en.language.message },
  currentLanguageChinese: { tag: 'p', text: zhCN.language.message },
};

describe('Settings V2 - Preferences and display', function (this: Suite) {
  it('changes between the supported Chinese and English locales', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilderV2().build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await login(driver);
        await new HeaderNavbar(driver).openSettingsPage();
        const preferencesAndDisplaySettings = new PreferencesAndDisplaySettings(
          driver,
        );
        await preferencesAndDisplaySettings.checkPageIsLoaded();

        await preferencesAndDisplaySettings.changeLanguage('中文(简体)');
        assert.equal(
          await driver.isElementPresent(selectors.currentLanguageChinese),
          true,
          'Language did not change to Chinese',
        );

        await driver.refresh();
        await preferencesAndDisplaySettings.checkPageIsLoaded();
        assert.equal(
          await driver.isElementPresent(selectors.currentLanguageChinese),
          true,
          'Chinese locale did not persist after refresh',
        );

        await preferencesAndDisplaySettings.changeLanguage('English');
        assert.equal(
          await driver.isElementPresent(selectors.currentLanguageEnglish),
          true,
          'Language did not change to English',
        );
      },
    );
  });
});
