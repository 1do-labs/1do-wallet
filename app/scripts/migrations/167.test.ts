import { migrate, version } from './167';

const oldVersion = 166;

describe(`migration #${version}`, () => {
  it('updates the version metadata', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {},
    };

    const newStorage = await migrate(oldStorage);

    expect(newStorage.meta).toStrictEqual({ version });
  });

  describe(`migration #${version}`, () => {
    it('returns the original state if UserStorageController is missing', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          OtherController: {},
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('returns the original state if UserStorageController exists but is not an object', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          UserStorageController: 'not an object',
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('sets isBackupAndSyncEnabled and isAccountSyncingEnabled to true', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          UserStorageController: {
            isBackupAndSyncEnabled: false,
            isAccountSyncingEnabled: false,
          },
        },
      };

      const expectedData = {
        UserStorageController: {
          isBackupAndSyncEnabled: true,
          isAccountSyncingEnabled: true,
        },
      };

      const newStorage = await migrate(oldStorage);
      expect(newStorage.meta).toStrictEqual({ version });
      expect(newStorage.data).toStrictEqual(expectedData);
    });
  });
});
