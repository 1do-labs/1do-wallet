import { cloneDeep } from 'lodash';
import { migrate, version } from './207';

const OLD_VERSION = version - 1;

describe(`migration #${version}`, () => {
  for (const currentLocale of ['de', 'es_419', 'zh_TW']) {
    it(`resets the unsupported ${currentLocale} locale to English`, async () => {
      const versionedData = {
        meta: { version: OLD_VERSION },
        data: {
          PreferencesController: { currentLocale },
        },
      };
      const changedControllers = new Set<string>();

      await migrate(versionedData, changedControllers);

      expect(versionedData).toStrictEqual({
        meta: { version },
        data: {
          PreferencesController: { currentLocale: 'en' },
        },
      });
      expect(changedControllers).toStrictEqual(
        new Set(['PreferencesController']),
      );
    });
  }

  for (const locale of ['en', 'zh_CN']) {
    it(`keeps the supported ${locale} locale`, async () => {
      const original = {
        meta: { version: OLD_VERSION },
        data: {
          PreferencesController: { currentLocale: locale },
        },
      };
      const versionedData = cloneDeep(original);
      const changedControllers = new Set<string>();

      await migrate(versionedData, changedControllers);

      expect(versionedData.data).toStrictEqual(original.data);
      expect(versionedData.meta.version).toBe(version);
      expect(changedControllers).toStrictEqual(new Set());
    });
  }

  it('leaves malformed preferences state unchanged', async () => {
    const versionedData = {
      meta: { version: OLD_VERSION },
      data: {
        PreferencesController: { currentLocale: null },
      },
    };
    const changedControllers = new Set<string>();

    await migrate(versionedData, changedControllers);

    expect(versionedData.data.PreferencesController.currentLocale).toBeNull();
    expect(versionedData.meta.version).toBe(version);
    expect(changedControllers).toStrictEqual(new Set());
  });
});
