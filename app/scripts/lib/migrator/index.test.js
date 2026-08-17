/* eslint-disable jest/no-conditional-expect */
import { cloneDeep } from 'lodash';
import liveMigrations from '../../migrations';
import data from '../../first-time-state';
import Migrator from '.';

const stubMigrations = [
  {
    version: 1,
    migrate: (state) => {
      // clone the data just like we do in migrations
      const clonedData = cloneDeep(state);
      clonedData.meta.version = 1;
      return Promise.resolve(clonedData);
    },
  },
  {
    version: 2,
    migrate: (state) => {
      const clonedData = cloneDeep(state);
      clonedData.meta.version = 2;
      return Promise.resolve(clonedData);
    },
  },
  {
    version: 3,
    migrate: (state) => {
      const clonedData = cloneDeep(state);
      clonedData.meta.version = 3;
      return Promise.resolve(clonedData);
    },
  },
];
const versionedData = { meta: { version: 0 }, data: { hello: 'world' } };

describe('migrations', () => {
  describe('Migrator', () => {
    it('migratedData version should be version 3', async () => {
      const migrator = new Migrator({ migrations: stubMigrations });
      const migratedData = await migrator.migrateData(versionedData);
      expect(migratedData.state.meta.version).toStrictEqual(
        stubMigrations[2].version,
      );
    });

    it('starts new 1Do state without legacy migrations', async () => {
      const migrator = new Migrator({ migrations: liveMigrations });
      const migratedData = await migrator.migrateData({
        meta: { version: 0 },
        data,
      });

      expect(liveMigrations).toStrictEqual([]);
      expect(migratedData.state.meta.version).toStrictEqual(0);
    });

    it('should emit an error', async () => {
      const migrator = new Migrator({
        migrations: [
          {
            version: 1,
            async migrate() {
              throw new Error('test');
            },
          },
        ],
      });
      const onError = jest.fn();
      migrator.on('error', onError);

      const initialState = { meta: { version: 0 }, data: { hello: 'world' } };
      const migratedData = await migrator.migrateData(initialState);

      expect(onError).toHaveBeenCalledTimes(1);
      const [error] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(AggregateError);
      expect(error.message).toBe('MetaMask Migration Error #1');
      expect(error.errors[0].message).toBe('test');
      expect(migratedData.state).toBe(initialState);
    });

    it('runs v2 migrations and reports changed controllers', async () => {
      const migrate = jest.fn(async (state, localChangedControllers) => {
        state.meta.version = 187;
        state.data.foo = 'bar';
        localChangedControllers.add('TestController');
      });

      const migrator = new Migrator({
        migrations: [
          {
            version: 187,
            migrate,
          },
        ],
      });

      const initialState = { meta: { version: 186 }, data: { hello: 'world' } };
      const migratedData = await migrator.migrateData(initialState);

      expect(migrate).toHaveBeenCalledTimes(1);
      expect(migrate.mock.calls[0]).toHaveLength(2);
      expect(migratedData.state).not.toBe(initialState);
      // toStrictEqual won't work
      // eslint-disable-next-line jest/prefer-strict-equal
      expect(migratedData.state.data).toEqual({
        hello: 'world',
        foo: 'bar',
      });
      expect(migratedData.changedKeys.has('TestController')).toBe(true);
    });

    it('handles errors thrown when state is cloned for next migration', async () => {
      const migrate = jest.fn();
      const migrator = new Migrator({
        migrations: [
          {
            version: 186,
            migrate,
          },
        ],
      });
      const onError = jest.fn();
      migrator.on('error', onError);

      const initialState = {
        meta: { version: 0 },
        // Regression test for https://github.com/MetaMask/metamask-extension/issues/39567
        // `bad` is a function, and cannot be serialized by `structuredClone`
        // this will throw a DOMException, which doesn't allow its `message`
        // property to be mutated
        // eslint-disable-next-line no-empty-function
        data: { bad: () => {} },
      };
      const migratedData = await migrator.migrateData(initialState);

      expect(migrate).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      const [error] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(AggregateError);
      expect(error.message).toBe('MetaMask Migration Error #186');
      expect(error.errors[0]?.constructor?.name).toBe('DOMException');
      expect(error.errors[0].name).toBe('DataCloneError');
      expect(error.errors[0].message).toMatch(/could not be cloned/iu);
      expect(migratedData.state).toBe(initialState);
    });
  });
});
