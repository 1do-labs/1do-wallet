import { migrate, version } from './163';

const oldVersion = 162;

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
    it('returns the original state if TokensController is missing', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          OtherController: {},
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('returns the original state if TokensController exists but is not an object', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          TokensController: 'not an object',
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });
    it('does nothing when both TokenListController and TokensController are present', async () => {
      // since state should have been already migrated in 153
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          TokensController: {
            someOtherProp: true,
          },
          TokenListController: {
            anotherProp: 'value',
          },
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });
    it('removes tokens, detectedTokens, and ignoredTokens from TokensController when user has tokensController state with those properties', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          TokensController: {
            tokens: [1, 2],
            detectedTokens: ['a', 'b'],
            ignoredTokens: { some: 'value' },
            someOtherProp: true,
          },
          OtherController: { key: 'value' },
        },
      };

      const expectedData = {
        TokensController: {
          someOtherProp: true,
        },
        OtherController: { key: 'value' },
      };

      const newStorage = await migrate(oldStorage);
      expect(newStorage.meta).toStrictEqual({ version });
      expect(newStorage.data).toStrictEqual(expectedData);
    });
  });
});
