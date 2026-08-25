import { migrate, version } from './207';

describe('migration 207', () => {
  it('removes persisted DeFi referral state', async () => {
    const storage = {
      meta: { version: 206 },
      data: {
        PreferencesController: {
          currentLocale: 'en',
          referrals: {
            hyperliquid: {
              '0x123': 'approved',
            },
          },
        },
      },
    };
    const changedKeys = new Set<string>();

    await migrate(storage, changedKeys);

    expect(storage).toStrictEqual({
      meta: { version },
      data: {
        PreferencesController: {
          currentLocale: 'en',
        },
      },
    });
    expect(changedKeys).toStrictEqual(new Set(['PreferencesController']));
  });

  it('handles missing PreferencesController state', async () => {
    const storage = {
      meta: { version: 206 },
      data: {},
    };
    const changedKeys = new Set<string>();

    await migrate(storage, changedKeys);

    expect(storage.meta.version).toBe(version);
    expect(changedKeys).toStrictEqual(new Set());
  });

  it('does not mark PreferencesController changed if referrals are absent', async () => {
    const storage = {
      meta: { version: 206 },
      data: {
        PreferencesController: {
          currentLocale: 'en',
        },
      },
    };
    const changedKeys = new Set<string>();

    await migrate(storage, changedKeys);

    expect(storage.meta.version).toBe(version);
    expect(changedKeys).toStrictEqual(new Set());
  });
});
