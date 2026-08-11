import { migrate, version } from './171';

const oldVersion = 170;
const newVersion = 171;

describe(`migration #${newVersion}`, () => {
  it('should update the version metadata', async () => {
    const oldState = {
      meta: {
        version: oldVersion,
      },
      data: {
        NetworkOrderController: {},
        PreferencesController: {
          preferences: {
            tokenNetworkFilter: {
              '0x1': true,
            },
          },
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: '0x1',
          isEvmSelected: true,
        },
      },
    };

    const newState = await migrate(oldState);

    expect(newState.meta.version).toStrictEqual(version);
  });

  describe('when tokenNetworkFilter exists and has data', () => {
    it('should migrate tokenNetworkFilter to enabledNetworkMap for EVM networks', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
                '0xa': true,
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .enabledNetworkMap,
      ).toStrictEqual({
        eip155: {
          '0x1': true,
          '0x89': false,
          '0xa': true,
        },
      });
    });

    it('preserves EVM token filter entries and adds selected custom EVM chain', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x483',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .enabledNetworkMap,
      ).toStrictEqual({
        eip155: {
          '0x1': true,
          '0x89': false,
          '0x483': true,
        },
      });
    });

    it('should migrate tokenNetworkFilter to enabledNetworkMap for non-EVM networks', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            isEvmSelected: false,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .enabledNetworkMap,
      ).toStrictEqual({
        eip155: {
          '0x1': true,
          '0x89': false,
        },
        solana: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
        },
      });
    });
  });

  describe('when tokenNetworkFilter does not exist', () => {
    it('should return state unchanged', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {},
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(newState.data).toStrictEqual(oldState.data);
    });
  });

  describe('when tokenNetworkFilter is empty', () => {
    it('should return state unchanged', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {},
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(newState.data).toStrictEqual(oldState.data);
    });
  });

  describe('when preferences does not exist', () => {
    it('should return state unchanged', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {},
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(newState.data).toStrictEqual(oldState.data);
    });
  });

  describe('when PreferencesController does not exist', () => {
    it('should return state unchanged', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(newState.data).toStrictEqual(oldState.data);
    });
  });

  describe('when NetworkOrderController does not exist', () => {
    it('should return state unchanged', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(newState.data).toStrictEqual(oldState.data);
    });
  });

  describe('preserves other state', () => {
    it('should not modify other parts of the state', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {
            orderedNetworkList: ['0x1', '0x89'],
            someOtherProperty: 'value',
          },
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
              },
              someOtherPreference: 'value',
            },
            someOtherProperty: 'value',
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
          SomeOtherController: {
            someProperty: 'value',
          },
        },
      };

      const newState = await migrate(oldState);

      // Check that enabledNetworkMap was set correctly
      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .enabledNetworkMap,
      ).toStrictEqual({
        eip155: {
          '0x1': true,
          '0x89': false,
        },
      });

      // Check that other properties are preserved
      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .orderedNetworkList,
      ).toStrictEqual(['0x1', '0x89']);
      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .someOtherProperty,
      ).toStrictEqual('value');
      expect(
        (
          (newState.data.PreferencesController as Record<string, unknown>)
            .preferences as Record<string, unknown>
        ).someOtherPreference,
      ).toStrictEqual('value');
      expect(
        (newState.data.PreferencesController as Record<string, unknown>)
          .someOtherProperty,
      ).toStrictEqual('value');
      expect(
        (newState.data.SomeOtherController as Record<string, unknown>)
          .someProperty,
      ).toStrictEqual('value');
    });
  });

  describe('CAIP chain ID formatting', () => {
    it('should correctly format EVM chain IDs to CAIP format', async () => {
      const oldState = {
        meta: {
          version: oldVersion,
        },
        data: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true, // Ethereum mainnet
                '0x89': false, // Polygon
                '0xa': true, // Optimism
                '0xa4b1': true, // Arbitrum One
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0x1',
            isEvmSelected: true,
          },
        },
      };

      const newState = await migrate(oldState);

      expect(
        (newState.data.NetworkOrderController as Record<string, unknown>)
          .enabledNetworkMap,
      ).toStrictEqual({
        eip155: {
          '0x1': true,
          '0x89': false,
          '0xa': true,
          '0xa4b1': true,
        },
      });
    });
  });
});
