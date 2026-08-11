import { migrate, version } from './153';

const oldVersion = 151;

describe(`migration #${version}`, () => {
  it('updates the version metadata', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {},
    };

    const newStorage = await migrate(oldStorage);

    expect(newStorage.meta).toStrictEqual({ version });
  });

  describe('tokens removal', () => {
    it('removes tokens, detectedTokens, and ignoredTokens from TokensController and tokenList from TokenListController', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          TokensController: {
            tokens: [1, 2],
            detectedTokens: ['a', 'b'],
            ignoredTokens: { some: 'value' },
            someOtherProp: true,
          },
          TokenListController: {
            tokenList: { foo: 'bar' },
            anotherProp: 'value',
          },
          OtherController: { key: 'value' },
        },
      };

      const expectedData = {
        TokensController: {
          someOtherProp: true,
        },
        TokenListController: {
          anotherProp: 'value',
        },
        OtherController: { key: 'value' },
      };

      const newStorage = await migrate(oldStorage);
      expect(newStorage.meta).toStrictEqual({ version });
      expect(newStorage.data).toStrictEqual(expectedData);
    });

    it('logs a warn and returns the original state if TokensController is missing', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          OtherController: {},
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('logs a warn and returns the original state if TokenListController is missing', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          OtherController: {},
          TokensController: {},
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('logs an error and returns the original state if TokensController is not an object', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          TokensController: 'not an object',
          TokenListController: {},
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('logs an error and returns the original state if TokenListController is not an object', async () => {
      const oldStorage = {
        meta: { version: oldVersion },
        data: {
          TokensController: {},
          TokenListController: 123,
        },
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual(oldStorage.data);
    });

    it('does nothing when no tokens properties exist', async () => {
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
  });
});
