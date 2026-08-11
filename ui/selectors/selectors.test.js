import { ApprovalType } from '@metamask/controller-utils';
import { KnownCaipNamespace } from '@metamask/utils';
import { EthAccountType, EthMethod } from '@metamask/keyring-api';
import { AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS } from '@metamask/multichain-network-controller';
import cloneDeep from 'lodash/cloneDeep';
import { TransactionStatus } from '@metamask/transaction-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { KeyringType } from '../../shared/constants/keyring';
import mockState from '../../test/data/mock-state.json';
import { CHAIN_IDS, NETWORK_TYPES } from '../../shared/constants/network';
import { createMockInternalAccount } from '../../test/jest/mocks';
import { mockNetworkState } from '../../test/stub/networks';
import * as networkSelectors from '../../shared/lib/selectors/networks';
import * as selectors from './selectors';

jest.mock('../../shared/lib/selectors/networks', () => ({
  ...jest.requireActual('../../shared/lib/selectors/networks'),
}));

jest.mock('../../app/scripts/lib/util', () => ({
  ...jest.requireActual('../../app/scripts/lib/util'),
  getEnvironmentType: jest.fn().mockReturnValue('popup'),
}));

jest.mock('../../shared/lib/network.utils', () => {
  const actual = jest.requireActual('../../shared/lib/network.utils');
  return {
    ...actual,
    shouldShowLineaMainnet: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('./multichain/networks', () => ({
  ...jest.requireActual('./multichain/networks'),
  getIsEvmMultichainNetworkSelected: jest.fn(
    (state) => state.metamask.isEvmSelected,
  ),
  getSelectedMultichainNetworkChainId: jest.fn((state) => {
    if (state.metamask.isEvmSelected) {
      const chainId = state.metamask.networkConfigurationsByChainId
        ? Object.keys(state.metamask.networkConfigurationsByChainId)[0]
        : '0x1';
      return `eip155:${parseInt(chainId, 16)}`;
    }
    return state.metamask.selectedMultichainNetworkChainId;
  }),
}));

const modifyStateWithHWKeyring = (keyring) => {
  const modifiedState = cloneDeep(mockState);
  modifiedState.metamask.internalAccounts.accounts[
    modifiedState.metamask.internalAccounts.selectedAccount
  ].metadata.keyring.type = keyring;

  return modifiedState;
};

const mockAccountsState = (accounts) => {
  const accountsMap = accounts.reduce((map, account) => {
    map[account.id] = account;
    return map;
  }, {});

  return {
    metamask: {
      internalAccounts: {
        accounts: accountsMap,
      },
    },
  };
};

describe('Selectors', () => {
  describe('#getSelectedAddress', () => {
    it('returns undefined if selectedAddress is undefined', () => {
      expect(
        selectors.getSelectedAddress({
          metamask: { internalAccounts: { accounts: {}, selectedAccount: '' } },
        }),
      ).toBeUndefined();
    });

    it('returns selectedAddress', () => {
      const mockInternalAccount = createMockInternalAccount();
      const internalAccounts = {
        accounts: {
          [mockInternalAccount.id]: mockInternalAccount,
        },
        selectedAccount: mockInternalAccount.id,
      };

      expect(
        selectors.getSelectedAddress({ metamask: { internalAccounts } }),
      ).toStrictEqual(mockInternalAccount.address);
    });
  });

  describe('#checkIfMethodIsEnabled', () => {
    it('returns true if the method is enabled', () => {
      expect(
        selectors.checkIfMethodIsEnabled(mockState, EthMethod.SignTransaction),
      ).toBe(true);
    });

    it('returns false if the method is not enabled', () => {
      expect(
        selectors.checkIfMethodIsEnabled(
          {
            metamask: {
              internalAccounts: {
                accounts: {
                  'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3': {
                    ...mockState.metamask.internalAccounts.accounts[
                      'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3'
                    ],
                    methods: [
                      ...Object.values(EthMethod).filter(
                        (method) => method !== EthMethod.SignTransaction,
                      ),
                    ],
                  },
                },
                selectedAccount: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
              },
            },
          },
          EthMethod.SignTransaction,
        ),
      ).toBe(false);
    });
  });

  describe('#getInternalAccount', () => {
    it("returns undefined if the account doesn't exist", () => {
      expect(
        selectors.getInternalAccount(mockState, 'unknown'),
      ).toBeUndefined();
    });

    it('returns the account', () => {
      expect(
        selectors.getInternalAccount(
          mockState,
          'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
        ),
      ).toStrictEqual(
        mockState.metamask.internalAccounts.accounts[
          'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3'
        ],
      );
    });
  });

  describe('#getNumberOfAllUnapprovedTransactionsAndMessages', () => {
    it('returns no unapproved transactions and messages', () => {
      expect(
        selectors.getNumberOfAllUnapprovedTransactionsAndMessages({
          metamask: {
            transactions: [],
          },
        }),
      ).toStrictEqual(0);
    });

    it('returns correct number of unapproved transactions', () => {
      expect(
        selectors.getNumberOfAllUnapprovedTransactionsAndMessages({
          metamask: {
            transactions: [
              {
                id: 0,
                chainId: CHAIN_IDS.MAINNET,
                time: 0,
                txParams: {
                  from: '0xAddress',
                  to: '0xRecipient',
                },
                status: TransactionStatus.unapproved,
              },
              {
                id: 1,
                chainId: CHAIN_IDS.MAINNET,
                time: 0,
                txParams: {
                  from: '0xAddress',
                  to: '0xRecipient',
                },
                status: TransactionStatus.unapproved,
              },
            ],
            unapprovedPersonalMsgs: {
              2: {
                id: 2,
                msgParams: {
                  from: '0xAddress',
                  data: '0xData',
                  origin: 'origin',
                },
                time: 1,
                status: TransactionStatus.unapproved,
                type: 'personal_sign',
              },
            },
          },
        }),
      ).toStrictEqual(3);
    });

    it('returns correct number of unapproved transactions and messages', () => {
      expect(
        selectors.getNumberOfAllUnapprovedTransactionsAndMessages({
          metamask: {
            networkConfigurationsByChainId: {
              [CHAIN_IDS.MAINNET]: {
                chainId: CHAIN_IDS.MAINNET,
                rpcEndpoints: [{}],
              },
            },
            transactions: [
              {
                id: 0,
                chainId: CHAIN_IDS.MAINNET,
                time: 0,
                txParams: {
                  from: '0xAddress',
                  to: '0xRecipient',
                },
                status: TransactionStatus.unapproved,
              },
            ],
            unapprovedTypedMessages: {
              1: {
                id: 1,
                msgParams: {
                  from: '0xAddress',
                  data: '0xData',
                  origin: 'origin',
                },
                time: 1,
                status: TransactionStatus.unapproved,
                type: 'eth_signTypedData',
              },
            },
          },
        }),
      ).toStrictEqual(2);
    });
  });

  describe('#getNetworkToAutomaticallySwitchTo', () => {
    const SELECTED_ORIGIN = 'https://app.metamask.io';
    const SELECTED_ORIGIN_NETWORK_ID = NETWORK_TYPES.LINEA_SEPOLIA;
    const state = {
      activeTab: {
        origin: SELECTED_ORIGIN,
      },
      metamask: {
        isUnlocked: true,
        selectedTabOrigin: SELECTED_ORIGIN,
        unapprovedDecryptMsgs: [],
        unapprovedPersonalMsgs: [],
        unapprovedEncryptionPublicKeyMsgs: [],
        unapprovedTypedMessages: [],
        domains: {
          [SELECTED_ORIGIN]: SELECTED_ORIGIN_NETWORK_ID,
        },
        networkConfigurationsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            chainId: CHAIN_IDS.MAINNET,
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                url: 'https://testrpc.com',
                networkClientId: mockState.metamask.selectedNetworkClientId,
              },
            ],
          },
        },
        transactions: [],
        selectedNetworkClientId: mockState.metamask.selectedNetworkClientId,
        // networkConfigurations:
        //   mockState.metamask.networkConfigurationsByChainId,
      },
    };

    it('should return the network to switch to', () => {
      const networkToSwitchTo =
        selectors.getNetworkToAutomaticallySwitchTo(state);
      expect(networkToSwitchTo).toBe(SELECTED_ORIGIN_NETWORK_ID);
    });

    it('should return no network to switch to because we are already on it', () => {
      const networkToSwitchTo = selectors.getNetworkToAutomaticallySwitchTo({
        ...state,
        metamask: {
          ...state.metamask,
          selectedNetworkClientId: 'linea-sepolia',
          networkConfigurationsByChainId: {
            [CHAIN_IDS.LINEA_SEPOLIA]: {
              chainId: CHAIN_IDS.LINEA_SEPOLIA,
              defaultRpcEndpointIndex: 0,
              rpcEndpoints: [
                {
                  url: 'https://testrpc.com',
                  networkClientId: 'linea-sepolia',
                  type: 'custom',
                },
              ],
            },
          },
        },
      });
      expect(networkToSwitchTo).toBe(null);
    });

    it('should return no network to switch to because there are pending transactions', () => {
      const networkToSwitchTo = selectors.getNetworkToAutomaticallySwitchTo({
        ...state,
        metamask: {
          ...state.metamask,
          selectedNetworkClientId: NETWORK_TYPES.LINEA_SEPOLIA,
          networkConfigurationsByChainId: {
            [CHAIN_IDS.LINEA_SEPOLIA]: {
              chainId: CHAIN_IDS.LINEA_SEPOLIA,
              defaultRpcEndpointIndex: 0,
              rpcEndpoints: [
                {
                  url: 'https://testrpc.com',
                  networkClientId: 'linea-sepolia',
                  type: 'custom',
                },
              ],
            },
          },
          transactions: [
            {
              id: 0,
              chainId: CHAIN_IDS.MAINNET,
              status: TransactionStatus.approved,
            },
          ],
        },
      });
      expect(networkToSwitchTo).toBe(null);
    });
  });

  describe('#getSuggestedTokens', () => {
    it('returns an empty array if pendingApprovals is undefined', () => {
      expect(selectors.getSuggestedTokens({ metamask: {} })).toStrictEqual([]);
    });

    it('returns suggestedTokens from filtered pending approvals', () => {
      const pendingApprovals = {
        1: {
          id: '1',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0x8b175474e89094c44da98b954eedeac495271d0a',
              symbol: 'NEW',
              decimals: 18,
              image: 'metamark.svg',
            },
          },
          requestState: null,
        },
        2: {
          id: '2',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0xC8c77482e45F1F44dE1745F52C74426C631bDD51',
              symbol: '0XYX',
              decimals: 18,
              image: '0x.svg',
            },
          },
        },
        3: {
          id: '3',
          origin: 'origin',
          time: 1,
          type: ApprovalType.Transaction,
          requestData: {
            // something that is not an asset
          },
        },
        4: {
          id: '4',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0x1234abcd',
              symbol: '0XYX',
              tokenId: '123',
            },
          },
        },
      };

      expect(
        selectors.getSuggestedTokens({ metamask: { pendingApprovals } }),
      ).toStrictEqual([
        {
          id: '1',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0x8b175474e89094c44da98b954eedeac495271d0a',
              symbol: 'NEW',
              decimals: 18,
              image: 'metamark.svg',
            },
          },
          requestState: null,
        },
        {
          id: '2',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0xC8c77482e45F1F44dE1745F52C74426C631bDD51',
              symbol: '0XYX',
              decimals: 18,
              image: '0x.svg',
            },
          },
        },
      ]);
    });
  });

  describe('#getSuggestedNfts', () => {
    it('returns an empty array if pendingApprovals is undefined', () => {
      expect(selectors.getSuggestedNfts({ metamask: {} })).toStrictEqual([]);
    });

    it('returns suggestedNfts from filtered pending approvals', () => {
      const pendingApprovals = {
        1: {
          id: '1',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0x8b175474e89094c44da98b954eedeac495271d0a',
              symbol: 'NEW',
              decimals: 18,
              image: 'metamark.svg',
            },
          },
          requestState: null,
        },
        2: {
          id: '2',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0xC8c77482e45F1F44dE1745F52C74426C631bDD51',
              symbol: '0XYX',
              decimals: 18,
              image: '0x.svg',
            },
          },
        },
        3: {
          id: '3',
          origin: 'origin',
          time: 1,
          type: ApprovalType.Transaction,
          requestData: {
            // something that is not an asset
          },
        },
        4: {
          id: '4',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0x1234abcd',
              symbol: '0XYX',
              tokenId: '123',
              standard: 'ERC721',
            },
          },
        },
      };

      expect(
        selectors.getSuggestedNfts({ metamask: { pendingApprovals } }),
      ).toStrictEqual([
        {
          id: '4',
          origin: 'dapp',
          time: 1,
          type: ApprovalType.WatchAsset,
          requestData: {
            asset: {
              address: '0x1234abcd',
              symbol: '0XYX',
              tokenId: '123',
              standard: 'ERC721',
            },
          },
        },
      ]);
    });
  });

  describe('#getNewNetworkAdded', () => {
    it('returns undefined if newNetworkAddedName is undefined', () => {
      expect(selectors.getNewNetworkAdded({ appState: {} })).toBeUndefined();
    });

    it('returns newNetworkAddedName', () => {
      expect(
        selectors.getNewNetworkAdded({
          appState: { newNetworkAddedName: 'test-chain' },
        }),
      ).toStrictEqual('test-chain');
    });
  });

  describe('#getEditedNetwork', () => {
    it('returns undefined if getEditedNetwork is undefined', () => {
      expect(selectors.getNewNetworkAdded({ appState: {} })).toBeUndefined();
    });

    it('returns getEditedNetwork', () => {
      expect(
        selectors.getEditedNetwork({
          appState: { editedNetwork: 'test-chain' },
        }),
      ).toStrictEqual('test-chain');
    });
  });

  // todo
  describe('#getRpcPrefsForCurrentProvider', () => {
    it('returns rpcPrefs from the providerConfig', () => {
      expect(
        selectors.getRpcPrefsForCurrentProvider({
          metamask: {
            ...mockNetworkState({
              chainId: '0x1',
              blockExplorerUrl: 'https://test-block-explorer',
            }),
          },
        }),
      ).toStrictEqual({ blockExplorerUrl: 'https://test-block-explorer' });
    });
  });

  describe('#getNetworksTabSelectedNetworkConfigurationId', () => {
    it('returns undefined if selectedNetworkConfigurationId is undefined', () => {
      expect(
        selectors.getNetworksTabSelectedNetworkConfigurationId({
          appState: {},
        }),
      ).toBeUndefined();
    });

    it('returns selectedNetworkConfigurationId', () => {
      expect(
        selectors.getNetworksTabSelectedNetworkConfigurationId({
          appState: {
            selectedNetworkConfigurationId: 'testNetworkConfigurationId',
          },
        }),
      ).toStrictEqual('testNetworkConfigurationId');
    });
  });

  describe('#getCurrentNetwork', () => {
    it('returns built-in network configuration', () => {
      const modifiedMockState = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          selectedNetworkClientId: NETWORK_TYPES.SEPOLIA,
          blockExplorerUrls: [],
          ...mockNetworkState({ chainId: CHAIN_IDS.SEPOLIA, id: 'sepolia' }),
        },
      };
      const currentNetwork = selectors.getCurrentNetwork(modifiedMockState);

      expect(currentNetwork).toMatchInlineSnapshot(`
        {
          "blockExplorerUrl": "https://localhost/blockExplorer/0xaa36a7",
          "chainId": "0xaa36a7",
          "id": "sepolia",
          "nickname": "Sepolia",
          "rpcPrefs": {
            "blockExplorerUrl": "https://localhost/blockExplorer/0xaa36a7",
            "imageUrl": undefined,
          },
          "rpcUrl": "https://localhost/rpc/0xaa36a7",
          "ticker": "SepoliaETH",
        }
      `);
    });

    it('returns custom network configuration', () => {
      const mockNetworkConfigurationId = 'mock-network-config-id';
      const modifiedMockState = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            rpcUrl: 'https://mock-rpc-endpoint.test',
            chainId: '0x9999',
            ticker: 'TST',
            id: mockNetworkConfigurationId,
            blockExplorerUrl: undefined,
          }),
        },
      };

      const currentNetwork = selectors.getCurrentNetwork(modifiedMockState);

      expect(currentNetwork).toMatchInlineSnapshot(`
        {
          "blockExplorerUrl": undefined,
          "chainId": "0x9999",
          "id": "mock-network-config-id",
          "nickname": undefined,
          "rpcPrefs": {
            "blockExplorerUrl": undefined,
            "imageUrl": undefined,
          },
          "rpcUrl": "https://mock-rpc-endpoint.test",
          "ticker": "TST",
        }
      `);
    });

    it('returns the correct custom network when there is a chainId collision', () => {
      const modifiedMockState = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          selectedNetworkClientId: 'testNetworkConfigurationId',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              name: 'Custom Mainnet RPC',
              nativeCurrency: 'ETH',
              defaultRpcEndpointIndex: 0,
              rpcEndpoints: [
                {
                  url: 'https://testrpc.com',
                  networkClientId: 'testNetworkConfigurationId',
                  type: 'custom',
                },
              ],
            },
          },
        },
      };

      const currentNetwork = selectors.getCurrentNetwork(modifiedMockState);
      expect(currentNetwork.nickname).toBe('Custom Mainnet RPC');
      expect(currentNetwork.chainId).toBe('0x1');
    });

    it('returns the correct mainnet network when there is a chainId collision', () => {
      const modifiedMockState = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({ chainId: CHAIN_IDS.MAINNET }),
        },
      };
      const currentNetwork = selectors.getCurrentNetwork(modifiedMockState);
      expect(currentNetwork.nickname).toBe('Ethereum');
    });
  });

  describe('#getAllEnabledNetworks', () => {
    const networkConfigurationsByChainId = {
      [CHAIN_IDS.MAINNET]: {
        chainId: CHAIN_IDS.MAINNET,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
      },
      [CHAIN_IDS.LINEA_MAINNET]: {
        chainId: CHAIN_IDS.LINEA_MAINNET,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'linea-mainnet' }],
      },
      [CHAIN_IDS.SEPOLIA]: {
        chainId: CHAIN_IDS.SEPOLIA,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'sepolia' }],
      },
      [CHAIN_IDS.LINEA_SEPOLIA]: {
        chainId: CHAIN_IDS.LINEA_SEPOLIA,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'linea-sepolia' }],
      },
    };

    it('returns only Mainnet and Linea with showTestNetworks off', () => {
      const networks = selectors.getAllEnabledNetworks({
        metamask: {
          preferences: { showTestNetworks: false },
          networkConfigurationsByChainId,
        },
      });
      expect(Object.values(networks)).toHaveLength(2);
    });

    it('returns networks with showTestNetworks on', () => {
      const networks = selectors.getAllEnabledNetworks({
        metamask: {
          preferences: {
            showTestNetworks: true,
          },
          networkConfigurationsByChainId,
        },
      });

      expect(Object.values(networks).length).toBeGreaterThan(2);
    });
  });

  describe('#getChainIdsToPoll', () => {
    const networkConfigurationsByChainId = {
      [CHAIN_IDS.MAINNET]: {
        chainId: CHAIN_IDS.MAINNET,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
      },
      [CHAIN_IDS.LINEA_MAINNET]: {
        chainId: CHAIN_IDS.LINEA_MAINNET,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'linea-mainnet' }],
      },
      [CHAIN_IDS.SEPOLIA]: {
        chainId: CHAIN_IDS.SEPOLIA,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'sepolia' }],
      },
      [CHAIN_IDS.LINEA_SEPOLIA]: {
        chainId: CHAIN_IDS.LINEA_SEPOLIA,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'linea-sepolia' }],
      },
    };

    beforeEach(() => {
      process.env.PORTFOLIO_VIEW = 'true';
    });

    afterEach(() => {
      process.env.PORTFOLIO_VIEW = undefined;
    });

    it('returns only non-test chain IDs', () => {
      const chainIds = selectors.getChainIdsToPoll({
        metamask: {
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.LINEA_MAINNET]: true,
            },
          },
          networkConfigurationsByChainId,
          selectedNetworkClientId: 'mainnet',
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      });
      expect(Object.values(chainIds)).toHaveLength(2);
      expect(chainIds).toStrictEqual([
        CHAIN_IDS.MAINNET,
        CHAIN_IDS.LINEA_MAINNET,
      ]);
    });
  });

  describe('#getNetworkClientIdsToPoll', () => {
    const networkConfigurationsByChainId = {
      [CHAIN_IDS.MAINNET]: {
        chainId: CHAIN_IDS.MAINNET,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
      },
      [CHAIN_IDS.LINEA_MAINNET]: {
        chainId: CHAIN_IDS.LINEA_MAINNET,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'linea-mainnet' }],
      },
      [CHAIN_IDS.SEPOLIA]: {
        chainId: CHAIN_IDS.SEPOLIA,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'sepolia' }],
      },
      [CHAIN_IDS.LINEA_SEPOLIA]: {
        chainId: CHAIN_IDS.LINEA_SEPOLIA,
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [{ networkClientId: 'linea-sepolia' }],
      },
    };

    beforeEach(() => {
      process.env.PORTFOLIO_VIEW = 'true';
    });

    afterEach(() => {
      process.env.PORTFOLIO_VIEW = undefined;
    });

    it('returns only non-test chain IDs', () => {
      const chainIds = selectors.getNetworkClientIdsToPoll({
        metamask: {
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.LINEA_MAINNET]: true,
            },
          },
          networkConfigurationsByChainId,
          selectedNetworkClientId: 'mainnet',
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      });
      expect(Object.values(chainIds)).toHaveLength(2);
      expect(chainIds).toStrictEqual(['mainnet', 'linea-mainnet']);
    });
  });

  describe('#isHardwareWallet', () => {
    it('returns false if it is not a HW wallet', () => {
      const mockStateWithImported = modifyStateWithHWKeyring(
        KeyringType.imported,
      );
      expect(selectors.isHardwareWallet(mockStateWithImported)).toBe(false);
    });

    it('returns true if it is a Ledger HW wallet', () => {
      const mockStateWithLedger = modifyStateWithHWKeyring(KeyringType.ledger);
      expect(selectors.isHardwareWallet(mockStateWithLedger)).toBe(true);
    });

    it('returns true if it is a Trezor HW wallet', () => {
      const mockStateWithTrezor = modifyStateWithHWKeyring(KeyringType.trezor);
      expect(selectors.isHardwareWallet(mockStateWithTrezor)).toBe(true);
    });

    it('returns true if it is a Lattice HW wallet', () => {
      const mockStateWithLattice = modifyStateWithHWKeyring(
        KeyringType.lattice,
      );
      expect(selectors.isHardwareWallet(mockStateWithLattice)).toBe(true);
    });

    it('returns true if it is a QR HW wallet', () => {
      const mockStateWithQr = modifyStateWithHWKeyring(KeyringType.qr);
      expect(selectors.isHardwareWallet(mockStateWithQr)).toBe(true);
    });
  });

  describe('#getHardwareWalletType', () => {
    it('returns undefined if it is not a HW wallet', () => {
      const mockStateWithImported = modifyStateWithHWKeyring(
        KeyringType.imported,
      );
      expect(
        selectors.getHardwareWalletType(mockStateWithImported),
      ).toBeUndefined();
    });

    it('returns "Ledger Hardware" if it is a Ledger HW wallet', () => {
      const mockStateWithLedger = modifyStateWithHWKeyring(KeyringType.ledger);
      expect(selectors.getHardwareWalletType(mockStateWithLedger)).toBe(
        KeyringType.ledger,
      );
    });

    it('returns "Trezor Hardware" if it is a Trezor HW wallet', () => {
      const mockStateWithTrezor = modifyStateWithHWKeyring(KeyringType.trezor);
      expect(selectors.getHardwareWalletType(mockStateWithTrezor)).toBe(
        KeyringType.trezor,
      );
    });
  });

  it('returns selected account', () => {
    const account = selectors.getSelectedAccount(mockState);
    expect(account.balance).toStrictEqual('0x346ba7725f412cbfdb');
    expect(account.address).toStrictEqual(
      '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    );
  });

  describe('#getTokenExchangeRates', () => {
    it('returns token exchange rates', () => {
      const tokenExchangeRates = selectors.getTokenExchangeRates(mockState);
      expect(tokenExchangeRates).toStrictEqual({
        '0x108cf70c7d384c552f42c07c41c0e1e46d77ea0d': 0.00039345803819379796,
        '0xd8f6a2ffb0fc5952d16c9768b71cfd35b6399aa5': 0.00008189274407698049,
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 0.0017123,
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 0.0000000018,
      });
    });
  });

  describe('#checkNetworkOrAccountNotSupports1559', () => {
    it('returns false if network and account supports EIP-1559', () => {
      const not1559Network = selectors.checkNetworkOrAccountNotSupports1559({
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
            metadata: { EIPS: { 1559: true } },
          }),
          keyrings: [
            {
              type: KeyringType.ledger,
              accounts: ['0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
              metadata: {
                name: 'Ledger',
                id: 'ledger',
              },
            },
          ],
        },
      });
      expect(not1559Network).toStrictEqual(false);
    });

    it('returns true if network does not support EIP-1559', () => {
      const not1559Network = selectors.checkNetworkOrAccountNotSupports1559({
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
            metadata: { EIPS: { 1559: false } },
          }),
        },
      });
      expect(not1559Network).toStrictEqual(true);
    });
  });

  describe('#getAddressBook', () => {
    it('should return the address book', () => {
      expect(selectors.getAddressBook(mockState)).toStrictEqual([
        {
          address: '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
          chainId: '0x5',
          isEns: false,
          memo: '',
          name: 'Address Book Account 1',
        },
      ]);
    });
  });

  it('returns accounts with balance, address, and name from identity and accounts in state', () => {
    const accountsWithSendEther =
      selectors.accountsWithSendEtherInfoSelector(mockState);
    expect(accountsWithSendEther).toHaveLength(6);
    expect(accountsWithSendEther[0].balance).toStrictEqual(
      '0x346ba7725f412cbfdb',
    );
    expect(accountsWithSendEther[0].address).toStrictEqual(
      '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    );
    expect(accountsWithSendEther[0].metadata.name).toStrictEqual(
      'Test Account',
    );
  });

  it('returns selected account with balance, address, and name from accountsWithSendEtherInfoSelector', () => {
    const currentAccountwithSendEther =
      selectors.getCurrentAccountWithSendEtherInfo(mockState);
    expect(currentAccountwithSendEther.balance).toStrictEqual(
      '0x346ba7725f412cbfdb',
    );
    expect(currentAccountwithSendEther.address).toStrictEqual(
      '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    );
    expect(currentAccountwithSendEther.metadata.name).toStrictEqual(
      'Test Account',
    );
  });

  it('#getTotalUnapprovedCount', () => {
    const totalUnapprovedCount = selectors.getTotalUnapprovedCount(mockState);
    expect(totalUnapprovedCount).toStrictEqual(1);
  });

  it('#getUseTokenDetection', () => {
    const useTokenDetection = selectors.getUseTokenDetection(mockState);
    expect(useTokenDetection).toStrictEqual(true);
  });

  it('#getTokenList', () => {
    const tokenList = selectors.getTokenList(mockState);
    expect(tokenList).toStrictEqual({
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
        address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        symbol: 'WBTC',
        decimals: 8,
        name: 'Wrapped Bitcoin',
        iconUrl: 'https://s3.amazonaws.com/airswap-token-images/WBTC.png',
        aggregators: [
          'airswapLight',
          'bancor',
          'cmc',
          'coinGecko',
          'kleros',
          'oneInch',
          'paraswap',
          'pmm',
          'totle',
          'zapper',
          'zerion',
          'zeroEx',
        ],
        occurrences: 12,
      },
      '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': {
        address: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
        symbol: 'YFI',
        decimals: 18,
        name: 'yearn.finance',
        iconUrl:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e/logo.png',
        aggregators: [
          'airswapLight',
          'bancor',
          'cmc',
          'coinGecko',
          'kleros',
          'oneInch',
          'paraswap',
          'pmm',
          'totle',
          'zapper',
          'zerion',
          'zeroEx',
        ],
        occurrences: 12,
      },
    });
  });
  it('#getAdvancedGasFeeValues', () => {
    const advancedGasFee = selectors.getAdvancedGasFeeValues(mockState);
    expect(advancedGasFee).toStrictEqual({
      maxBaseFee: '75',
      priorityFee: '2',
    });
  });
  it('#getAppIsLoading', () => {
    const appIsLoading = selectors.getAppIsLoading(mockState);
    expect(appIsLoading).toStrictEqual(false);
  });

  it('#getUseCurrencyRateCheck', () => {
    const useCurrencyRateCheck = selectors.getUseCurrencyRateCheck(mockState);
    expect(useCurrencyRateCheck).toStrictEqual(true);
  });

  it('#getShowOutdatedBrowserWarning returns false if outdatedBrowserWarningLastShown is less than 2 days ago', () => {
    mockState.metamask.showOutdatedBrowserWarning = true;
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - 1);
    mockState.metamask.outdatedBrowserWarningLastShown = timestamp.getTime();
    const showOutdatedBrowserWarning =
      selectors.getShowOutdatedBrowserWarning(mockState);
    expect(showOutdatedBrowserWarning).toStrictEqual(false);
  });

  it('#getShowOutdatedBrowserWarning returns true if outdatedBrowserWarningLastShown is more than 2 days ago', () => {
    mockState.metamask.showOutdatedBrowserWarning = true;
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - 3);
    mockState.metamask.outdatedBrowserWarningLastShown = timestamp.getTime();
    const showOutdatedBrowserWarning =
      selectors.getShowOutdatedBrowserWarning(mockState);
    expect(showOutdatedBrowserWarning).toStrictEqual(true);
  });

  it('#getTargetSubjectMetadata', () => {
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        subjectMetadata: {
          'https://example.com': {
            extensionId: null,
            iconUrl: null,
            name: 'example.com',
            origin: 'https://example.com',
            subjectType: 'website',
          },
        },
      },
    };
    const targetSubjectsMetadata = selectors.getTargetSubjectMetadata(
      state,
      'https://example.com',
    );
    expect(targetSubjectsMetadata).toStrictEqual({
      extensionId: null,
      iconUrl: null,
      name: 'example.com',
      origin: 'https://example.com',
      subjectType: 'website',
    });
  });

  it('#getMultipleTargetsSubjectMetadata', () => {
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        subjectMetadata: {
          'https://example.com': {
            extensionId: null,
            iconUrl: null,
            name: 'example.com',
            origin: 'https://example.com',
            subjectType: 'website',
          },
        },
      },
    };
    const targetSubjectsMetadata = selectors.getMultipleTargetsSubjectMetadata(
      state,
      {
        'https://example.com': {},
      },
    );
    expect(targetSubjectsMetadata).toStrictEqual({
      'https://example.com': {
        extensionId: null,
        iconUrl: null,
        name: 'example.com',
        origin: 'https://example.com',
        subjectType: 'website',
      },
    });
  });

  it('#getUpdatedAndSortedAccounts', () => {
    const pinnedAccountState = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pinnedAccountList: [
          '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b',
          '0xeb9e64b93097bc15f01f13eae97015c57ab64823',
        ],
        internalAccounts: {
          ...mockState.metamask.internalAccounts,
          accounts: {},
        },
        accounts: {
          '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': {
            address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
            balance: '0x0',
          },
          '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b': {
            address: '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b',
            balance: '0x0',
          },
          '0xc42edfcc21ed14dda456aa0756c153f7985d8813': {
            address: '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
            balance: '0x0',
          },
          '0xeb9e64b93097bc15f01f13eae97015c57ab64823': {
            address: '0xeb9e64b93097bc15f01f13eae97015c57ab64823',
            balance: '0x0',
          },
          '0xca8f1F0245530118D0cf14a06b01Daf8f76Cf281': {
            address: '0xca8f1F0245530118D0cf14a06b01Daf8f76Cf281',
            balance: '0x0',
          },
        },
        accountsByChainId: {
          '0x5': {
            '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': {
              address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
              balance: '0x0',
            },
            '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b': {
              address: '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b',
              balance: '0x0',
            },
            '0xc42edfcc21ed14dda456aa0756c153f7985d8813': {
              address: '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
              balance: '0x0',
            },
            '0xeb9e64b93097bc15f01f13eae97015c57ab64823': {
              address: '0xeb9e64b93097bc15f01f13eae97015c57ab64823',
              balance: '0x0',
            },
            '0xca8f1F0245530118D0cf14a06b01Daf8f76Cf281': {
              address: '0xca8f1F0245530118D0cf14a06b01Daf8f76Cf281',
              balance: '0x0',
            },
          },
        },
        permissionHistory: {
          'https://test.dapp': {
            eth_accounts: {
              accounts: {
                '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': 1596681857076,
              },
            },
          },
        },
        subjects: {
          'https://test.dapp': {
            permissions: {
              'endowment:caip25': {
                caveats: [
                  {
                    type: 'authorizedScopes',
                    value: {
                      requiredScopes: {},
                      optionalScopes: {
                        'eip155:1': {
                          accounts: [
                            'eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
                          ],
                        },
                      },
                      isMultichainOrigin: false,
                    },
                  },
                ],
                invoker: 'https://test.dapp',
                parentCapability: 'endowment:caip25',
              },
            },
          },
        },
      },
      activeTab: {
        origin: 'https://test.dapp',
      },
      unconnectedAccount: {
        state: 'OPEN',
      },
    };
    const expectedResult = [
      {
        address: '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b',
        balance: '0x0',
        id: '07c2cfec-36c9-46c4-8115-3836d3ac9047',
        metadata: {
          importTime: 0,
          name: 'Test Account 2',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        options: {
          entropySource: '01JKAF3DSGM3AB87EM9N0K41AJ',
        },
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
        scopes: ['eip155:0'],
        pinned: true,
        hidden: false,
        active: false,
      },

      {
        address: '0xeb9e64b93097bc15f01f13eae97015c57ab64823',
        balance: '0x0',
        id: '784225f4-d30b-4e77-a900-c8bbce735b88',
        metadata: {
          importTime: 0,
          name: 'Test Account 3',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        options: {
          entropySource: '01JKAF3PJ247KAM6C03G5Q0NP8',
        },
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
        scopes: ['eip155:0'],
        pinned: true,
        hidden: false,
        active: false,
      },

      {
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
        id: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
        metadata: {
          importTime: 0,
          name: 'Test Account',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        options: {
          entropySource: '01JKAF3DSGM3AB87EM9N0K41AJ',
        },
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
        scopes: ['eip155:0'],
        balance: '0x0',
        pinned: false,
        hidden: false,
        active: false,
        connections: true,
        lastSelected: undefined,
      },
      {
        address: '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
        id: '15e69915-2a1a-4019-93b3-916e11fd432f',
        metadata: {
          importTime: 0,
          name: 'Ledger Hardware 2',
          keyring: {
            type: 'Ledger Hardware',
          },
        },
        options: {},
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
        scopes: ['eip155:0'],
        balance: '0x0',
        pinned: false,
        hidden: false,
        active: false,
      },
      {
        address: '0xb552685e3d2790efd64a175b00d51f02cdafee5d',
        balance: '0x0',
        id: 'c3deeb99-ba0d-4a4e-a0aa-033fc1f79ae3',
        metadata: {
          keyring: {
            type: 'HD Key Tree',
          },
          importTime: 0,
          name: 'Account 2',
        },
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        options: {},
        hidden: false,
        pinned: false,
        active: false,
        type: 'eip155:eoa',
        scopes: ['eip155:0'],
      },
      {
        id: '694225f4-d30b-4e77-a900-c8bbce735b42',
        metadata: {
          importTime: 0,
          name: 'Test Account 4',
          keyring: {
            type: 'Custody test',
          },
        },
        options: {},
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
        scopes: ['eip155:0'],
        address: '0xca8f1F0245530118D0cf14a06b01Daf8f76Cf281',
        balance: '0x0',
        pinned: false,
        hidden: false,
        active: false,
      },
    ];

    pinnedAccountState.metamask.internalAccounts.accounts =
      expectedResult.reduce((accounts, account) => {
        accounts[account.id] = account;
        return accounts;
      }, {});

    expect(
      selectors.getUpdatedAndSortedAccounts(pinnedAccountState),
    ).toStrictEqual(expectedResult);
  });
});

describe('#getConnectedSitesListWithNetworkInfo', () => {
  it('returns the sites list with network information', () => {
    const sitesList = {
      site1: {
        id: 'site1',
      },
      site2: {
        id: 'site2',
      },
    };

    const domains = {
      site1: 'network1',
      site2: 'network2',
    };

    const networks = [
      {
        id: 'network1',
        chainId: '0x1',
        name: 'Network 1',
        rpcEndpoints: [
          {
            networkClientId: 'network1',
          },
        ],
      },
      {
        id: 'network2',
        chainId: '0x38',
        name: 'Network 2',
        rpcEndpoints: [
          {
            networkClientId: 'network2',
          },
        ],
      },
    ];

    const expectedSitesList = {
      site1: {
        id: 'site1',
        networkIconUrl: './images/eth_logo.svg',
        networkName: 'Network 1',
      },
      site2: {
        id: 'site2',
        networkIconUrl: './images/bnb.svg',
        networkName: 'Network 2',
      },
    };

    const result = selectors.getConnectedSitesListWithNetworkInfo.resultFunc(
      sitesList,
      domains,
      networks,
    );

    expect(result).toStrictEqual(expectedSitesList);
  });
});
describe('#getConnectedSitesList', () => {
  it('returns an empty object if there are no connected addresses', () => {
    const connectedSubjectsForAllAddresses = {};
    const internalAccounts = [];
    const connectedAddresses = [];

    const result = selectors.getConnectedSitesList.resultFunc(
      connectedSubjectsForAllAddresses,
      internalAccounts,
      connectedAddresses,
    );

    expect(result).toStrictEqual({});
  });

  it('returns the correct sites list with addresses and name mappings', () => {
    const connectedSubjectsForAllAddresses = {
      '0x123': [
        { origin: 'site1', name: 'Site 1' },
        { origin: 'site2', name: 'Site 2' },
      ],
      '0x456': [
        { origin: 'site1', name: 'Site 1' },
        { origin: 'site3', name: 'Site 3' },
      ],
    };

    const mockInternalAccount1 = createMockInternalAccount({
      address: '0x123',
      name: 'John Doe',
    });
    const mockInternalAccount2 = createMockInternalAccount({
      address: '0x456',
      name: 'Jane Smith',
    });

    const internalAccounts = [mockInternalAccount1, mockInternalAccount2];

    const connectedAddresses = ['0x123', '0x456'];

    const result = selectors.getConnectedSitesList.resultFunc(
      connectedSubjectsForAllAddresses,
      internalAccounts,
      connectedAddresses,
    );

    expect(result).toStrictEqual({
      site1: {
        origin: 'site1',
        addresses: ['0x123', '0x456'],
        addressToNameMap: {
          '0x123': 'John Doe',
          '0x456': 'Jane Smith',
        },
        name: 'Site 1',
      },
      site2: {
        origin: 'site2',
        addresses: ['0x123'],
        addressToNameMap: {
          '0x123': 'John Doe',
        },
        name: 'Site 2',
      },
      site3: {
        origin: 'site3',
        addresses: ['0x456'],
        addressToNameMap: {
          '0x456': 'Jane Smith',
        },
        name: 'Site 3',
      },
    });
  });
  describe('getEvmInternalAccounts', () => {
    const account1 = createMockInternalAccount({
      keyringType: KeyringType.hd,
    });
    const account2 = createMockInternalAccount({
      type: EthAccountType.Erc4337,
      keyringType: KeyringType.hd,
    });
    const account3 = createMockInternalAccount({
      keyringType: KeyringType.imported,
    });
    const account4 = createMockInternalAccount({
      keyringType: KeyringType.ledger,
    });
    const account5 = createMockInternalAccount({
      keyringType: KeyringType.trezor,
    });
    const evmAccounts = [account1, account2, account3, account4, account5];

    it('returns all EVM accounts when only EVM accounts are present', () => {
      const state = mockAccountsState(evmAccounts);
      expect(selectors.getEvmInternalAccounts(state)).toStrictEqual(
        evmAccounts,
      );
    });

    it('returns an empty array when there are no accounts', () => {
      const state = mockAccountsState([]);
      expect(selectors.getEvmInternalAccounts(state)).toStrictEqual([]);
    });
  });

  describe('getSelectedEvmInternalAccount', () => {
    const account1 = createMockInternalAccount({
      lastSelected: 1,
    });
    const account2 = createMockInternalAccount({
      lastSelected: 2,
    });
    const account3 = createMockInternalAccount({
      lastSelected: 3,
    });
    it('returns the last selected EVM account', () => {
      const state = mockAccountsState([account1, account2, account3]);
      expect(selectors.getSelectedEvmInternalAccount(state)).toBe(account3);
    });

    it('returns `undefined` if there are no accounts', () => {
      const state = mockAccountsState([]);
      expect(selectors.getSelectedEvmInternalAccount(state)).toBe(undefined);
    });
  });

  describe('getDefaultNativeToken', () => {
    it('returns the token object for the current chainId when no overrideChainId is provided', () => {
      const expectedToken = {
        symbol: 'ETH',
        name: 'Ether',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        balance: '966987986469506564059',
        string: '966.988',
        iconUrl: './images/black-eth-logo.svg',
        chainId: '0x5',
      };

      const result = selectors.getDefaultNativeToken(mockState);

      expect(result).toStrictEqual(expectedToken);
    });

    it('returns the token object for the overridden chainId when overrideChainId is provided', () => {
      const getCurrentChainIdSpy = jest.spyOn(
        networkSelectors,
        'getCurrentChainId',
      );
      const expectedToken = {
        symbol: 'POL',
        name: 'Polygon',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        balance: '966987986469506564059',
        string: '966.988',
        iconUrl: './images/pol-token.svg',
        chainId: '0x89',
      };

      const result = selectors.getDefaultNativeToken(
        mockState,
        CHAIN_IDS.POLYGON,
      );

      expect(result).toStrictEqual(expectedToken);
      expect(getCurrentChainIdSpy).not.toHaveBeenCalled(); // Ensure overrideChainId is used
    });
  });

  describe('getIsTokenNetworkFilterEqualCurrentNetwork', () => {
    beforeEach(() => {
      process.env.PORTFOLIO_VIEW = 'true';
    });

    afterEach(() => {
      process.env.PORTFOLIO_VIEW = undefined;
    });

    it('returns true when the token network filter is equal to the current network', () => {
      const state = {
        metamask: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
            },
          },
          preferences: {
            tokenNetworkFilter: {
              '0x1': true,
            },
          },
          selectedNetworkClientId: 'mainnetNetworkConfigurationId',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              rpcEndpoints: [
                { networkClientId: 'mainnetNetworkConfigurationId' },
              ],
            },
          },
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      };
      expect(selectors.getIsTokenNetworkFilterEqualCurrentNetwork(state)).toBe(
        true,
      );
    });

    it('returns false when the token network filter is on multiple networks', () => {
      const state = {
        metamask: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
              '0x89': true,
            },
          },
          selectedNetworkClientId: 'mainnetNetworkConfigurationId',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              rpcEndpoints: [
                { networkClientId: 'mainnetNetworkConfigurationId' },
              ],
            },
          },
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      };
      expect(selectors.getIsTokenNetworkFilterEqualCurrentNetwork(state)).toBe(
        false,
      );
    });
  });

  describe('getTokenNetworkFilter', () => {
    beforeEach(() => {
      process.env.PORTFOLIO_VIEW = 'true';
    });

    afterEach(() => {
      process.env.PORTFOLIO_VIEW = undefined;
    });

    it('always returns an object containing the network if portfolio view is disabled', () => {
      process.env.PORTFOLIO_VIEW = undefined;

      const state = {
        metamask: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
            },
          },
          selectedNetworkClientId: 'mainnetNetworkConfigurationId',
          networkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              chainId: CHAIN_IDS.MAINNET,
              rpcEndpoints: [
                { networkClientId: 'mainnetNetworkConfigurationId' },
              ],
            },
          },
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      };

      expect(selectors.getEnabledNetworks(state)).toStrictEqual({
        eip155: {
          [CHAIN_IDS.MAINNET]: true,
        },
      });
    });

    it('always returns an object containing the network if it is not included in popular networks', () => {
      const state = {
        metamask: {
          enabledNetworkMap: {
            eip155: {
              '0xNotPopularNetwork': true,
            },
          },
          selectedNetworkClientId: 'mainnetNetworkConfigurationId',
          networkConfigurationsByChainId: {
            '0xNotPopularNetwork': {
              chainId: '0xNotPopularNetwork',
              rpcEndpoints: [
                { networkClientId: 'mainnetNetworkConfigurationId' },
              ],
            },
          },
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      };

      expect(selectors.getEnabledNetworks(state)).toStrictEqual({
        eip155: {
          '0xNotPopularNetwork': true,
        },
      });
    });

    it('returns an object containing all the popular networks for portfolio view', () => {
      const state = {
        metamask: {
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.LINEA_MAINNET]: true,
              [CHAIN_IDS.ARBITRUM]: true,
              [CHAIN_IDS.AVALANCHE]: true,
              [CHAIN_IDS.BSC]: true,
              [CHAIN_IDS.OPTIMISM]: true,
              [CHAIN_IDS.POLYGON]: true,
              [CHAIN_IDS.ZKSYNC_ERA]: true,
              [CHAIN_IDS.BASE]: true,
            },
          },
          selectedNetworkClientId: 'mainnetNetworkConfigurationId',
          networkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              chainId: CHAIN_IDS.MAINNET,
              rpcEndpoints: [
                { networkClientId: 'mainnetNetworkConfigurationId' },
              ],
            },
          },
          preferences: {
            tokenNetworkFilter: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.LINEA_MAINNET]: true,
              [CHAIN_IDS.ARBITRUM]: true,
              [CHAIN_IDS.AVALANCHE]: true,
              [CHAIN_IDS.BSC]: true,
              [CHAIN_IDS.OPTIMISM]: true,
              [CHAIN_IDS.POLYGON]: true,
              [CHAIN_IDS.ZKSYNC_ERA]: true,
              [CHAIN_IDS.BASE]: true,
            },
          },
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      };

      expect(selectors.getEnabledNetworks(state)).toStrictEqual({
        eip155: {
          [CHAIN_IDS.MAINNET]: true,
          [CHAIN_IDS.LINEA_MAINNET]: true,
          [CHAIN_IDS.ARBITRUM]: true,
          [CHAIN_IDS.AVALANCHE]: true,
          [CHAIN_IDS.BSC]: true,
          [CHAIN_IDS.OPTIMISM]: true,
          [CHAIN_IDS.POLYGON]: true,
          [CHAIN_IDS.ZKSYNC_ERA]: true,
          [CHAIN_IDS.BASE]: true,
        },
      });
    });

    it('always returns the same object (memoized) if the same state is given', () => {
      const state = {
        metamask: {
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.LINEA_MAINNET]: true,
              [CHAIN_IDS.ARBITRUM]: true,
              [CHAIN_IDS.AVALANCHE]: true,
              [CHAIN_IDS.BSC]: true,
              [CHAIN_IDS.OPTIMISM]: true,
              [CHAIN_IDS.POLYGON]: true,
              [CHAIN_IDS.ZKSYNC_ERA]: true,
              [CHAIN_IDS.BASE]: true,
            },
          },
          selectedNetworkClientId: 'mainnetNetworkConfigurationId',
          networkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              chainId: CHAIN_IDS.MAINNET,
              rpcEndpoints: [
                { networkClientId: 'mainnetNetworkConfigurationId' },
              ],
            },
          },
          preferences: {
            tokenNetworkFilter: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.LINEA_MAINNET]: true,
              [CHAIN_IDS.ARBITRUM]: true,
              [CHAIN_IDS.AVALANCHE]: true,
              [CHAIN_IDS.BSC]: true,
              [CHAIN_IDS.OPTIMISM]: true,
              [CHAIN_IDS.POLYGON]: true,
              [CHAIN_IDS.ZKSYNC_ERA]: true,
              [CHAIN_IDS.BASE]: true,
            },
          },
          multichainNetworkConfigurationsByChainId:
            AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
          selectedMultichainNetworkChainId: 'eip155:1',
          isEvmSelected: true,
        },
      };

      const result1 = selectors.getTokenNetworkFilter(state);
      const result2 = selectors.getTokenNetworkFilter(state);
      expect(result1 === result2).toBe(true);
    });
  });

  describe('getMetaMaskAccountBalances', () => {
    const ACCOUNT_ADDRESS_1 = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
    const ACCOUNT_ADDRESS_2 = '0xEC1Adf982415D2Ef5ec55899b9Bfb8BC0f29251B';
    const BALANCE_1 = '0x346ba7725f412cbfdb';
    const BALANCE_2 = '0x1234567890';

    it('returns account balances for the current chain with lowercase addresses', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
              [ACCOUNT_ADDRESS_2]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccountBalances(state);

      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toStrictEqual({
        balance: BALANCE_1,
      });
      expect(result[ACCOUNT_ADDRESS_2.toLowerCase()]).toStrictEqual({
        balance: BALANCE_2,
      });
    });

    it('returns EMPTY_OBJECT when no balances exist for current chain', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.MAINNET,
          }),
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccountBalances(state);

      expect(result).toStrictEqual({});
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('returns EMPTY_OBJECT when accountsByChainId is undefined', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.MAINNET,
          }),
          accountsByChainId: undefined,
        },
      };

      const result = selectors.getMetaMaskAccountBalances(state);

      expect(result).toStrictEqual({});
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('normalizes mixed-case addresses to lowercase', () => {
      const mixedCaseAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.MAINNET,
          }),
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              [mixedCaseAddress]: { balance: BALANCE_1 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccountBalances(state);

      expect(result[mixedCaseAddress.toLowerCase()]).toStrictEqual({
        balance: BALANCE_1,
      });
      expect(result[mixedCaseAddress]).toBeUndefined();
    });

    it('maintains referential stability when state is unchanged', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
          },
        },
      };

      const result1 = selectors.getMetaMaskAccountBalances(state);
      const result2 = selectors.getMetaMaskAccountBalances(state);

      expect(result1).toBe(result2);
    });
  });

  describe('getMetaMaskCachedBalances', () => {
    const ACCOUNT_ADDRESS_1 = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
    const ACCOUNT_ADDRESS_2 = '0xEC1Adf982415D2Ef5ec55899b9Bfb8BC0f29251B';
    const BALANCE_1 = '0x346ba7725f412cbfdb';
    const BALANCE_2 = '0x1234567890';

    it('returns balance values only (not full account objects) for current chain', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
              [CHAIN_IDS.MAINNET]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1, extra: 'data' },
              [ACCOUNT_ADDRESS_2]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskCachedBalances(state);

      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toBe(BALANCE_1);
      expect(result[ACCOUNT_ADDRESS_2.toLowerCase()]).toBe(BALANCE_2);
    });

    it('uses single enabled network when only one network is enabled', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskCachedBalances(state);

      // Should use MAINNET balance since it's the only enabled network
      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toBe(BALANCE_1);
    });

    it('uses provided networkChainId when specified', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskCachedBalances(
        state,
        CHAIN_IDS.MAINNET,
      );

      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toBe(BALANCE_1);
    });

    it('falls back to currentChainId when networkChainId is not provided', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskCachedBalances(state);

      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toBe(BALANCE_2);
    });

    it('returns EMPTY_OBJECT when no balances exist for the chain', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.MAINNET,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {},
        },
      };

      const result = selectors.getMetaMaskCachedBalances(state);

      expect(result).toStrictEqual({});
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('handles undefined enabledNetworkMap gracefully', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: undefined,
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskCachedBalances(state);

      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toBe(BALANCE_1);
    });

    it('filters out disabled networks when determining single enabled network', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.GOERLI]: false,
              [CHAIN_IDS.SEPOLIA]: false,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskCachedBalances(state);

      // Should use MAINNET since it's the only enabled network
      expect(result[ACCOUNT_ADDRESS_1.toLowerCase()]).toBe(BALANCE_1);
    });

    it('maintains referential stability when state is unchanged', () => {
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS_1]: { balance: BALANCE_1 },
            },
          },
        },
      };

      const result1 = selectors.getMetaMaskCachedBalances(state);
      const result2 = selectors.getMetaMaskCachedBalances(state);

      expect(result1).toBe(result2);
    });
  });

  describe('getAccountsWithLabels', () => {
    const TRUNCATED_NAME_CHAR_LIMIT = 11;

    it('returns accounts with addressLabel, label, and balance properties', () => {
      const mockAccount = createMockInternalAccount({
        name: 'Account 1',
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockAccount.address],
              metadata: { id: 'mock-keyring-id', name: '' },
            },
          ],
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [mockAccount.address]: { balance: '0x1234' },
            },
          },
        },
      };

      const result = selectors.getAccountsWithLabels(state);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'Account 1',
        balance: '0x1234',
      });
      expect(result[0].addressLabel).toContain('Account 1');
      // Address is shortened to 7 start chars + ... + 5 end chars
      expect(result[0].addressLabel).toContain('0x0dcd5');
      expect(result[0].addressLabel).toContain('3e7bc');
    });

    it('truncates long account names in addressLabel', () => {
      const longName =
        'This is a very long account name that exceeds the limit';
      const mockAccount = createMockInternalAccount({
        name: longName,
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockAccount.address],
              metadata: { id: 'mock-keyring-id', name: '' },
            },
          ],
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [mockAccount.address]: { balance: '0x0' },
            },
          },
        },
      };

      const result = selectors.getAccountsWithLabels(state);

      // Name should be truncated to TRUNCATED_NAME_CHAR_LIMIT - 1 chars + '...'
      const truncatedName = `${longName.slice(0, TRUNCATED_NAME_CHAR_LIMIT - 1)}...`;
      expect(result[0].addressLabel).toContain(truncatedName);
      expect(result[0].label).toBe(longName); // Full name in label
    });

    it('does not truncate short account names in the label portion', () => {
      const shortName = 'Short'; // Less than TRUNCATED_NAME_CHAR_LIMIT
      const mockAccount = createMockInternalAccount({
        name: shortName,
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockAccount.address],
              metadata: { id: 'mock-keyring-id', name: '' },
            },
          ],
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [mockAccount.address]: { balance: '0x0' },
            },
          },
        },
      };

      const result = selectors.getAccountsWithLabels(state);

      // The name portion should not be truncated
      expect(result[0].addressLabel).toMatch(/^Short \(/u);
      expect(result[0].label).toBe(shortName);
    });

    it('handles multiple accounts correctly', () => {
      const mockAccount1 = createMockInternalAccount({
        name: 'Account 1',
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      });
      const mockAccount2 = createMockInternalAccount({
        name: 'Account 2',
        address: '0xEC1Adf982415D2Ef5ec55899b9Bfb8BC0f29251B',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount1.id]: mockAccount1,
              [mockAccount2.id]: mockAccount2,
            },
            selectedAccount: mockAccount1.id,
          },
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockAccount1.address, mockAccount2.address],
              metadata: { id: 'mock-keyring-id', name: '' },
            },
          ],
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [mockAccount1.address]: { balance: '0x1111' },
              [mockAccount2.address]: { balance: '0x2222' },
            },
          },
        },
      };

      const result = selectors.getAccountsWithLabels(state);

      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('Account 1');
      expect(result[1].label).toBe('Account 2');
    });

    it('maintains referential stability when state is unchanged', () => {
      const mockAccount = createMockInternalAccount({
        name: 'Account 1',
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockAccount.address],
              metadata: { id: 'mock-keyring-id', name: '' },
            },
          ],
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [mockAccount.address]: { balance: '0x1234' },
            },
          },
        },
      };

      const result1 = selectors.getAccountsWithLabels(state);
      const result2 = selectors.getAccountsWithLabels(state);

      expect(result1).toBe(result2);
    });
  });

  describe('getMetaMaskAccounts', () => {
    it('return balance from cachedBalances if chainId passed is different from currentChainId', () => {
      const ACCOUNT_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const BALANCE = '38D7EA4C680000';
      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          accountsByChainId: {
            ...mockState.metamask.accountsByChainId,
            '0x1': {
              [ACCOUNT_ADDRESS]: {
                balance: BALANCE,
              },
            },
          },
        },
      };
      expect(
        selectors.getMetaMaskAccounts(state, '0x1')[ACCOUNT_ADDRESS].balance,
      ).toStrictEqual(BALANCE);
    });

    it('returns balance from current chain balances when no chainId is provided', () => {
      const ACCOUNT_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const CURRENT_CHAIN_BALANCE = '0x1000';
      const mockAccount = createMockInternalAccount({
        address: ACCOUNT_ADDRESS,
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS]: { balance: CURRENT_CHAIN_BALANCE },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccounts(state);

      expect(result[ACCOUNT_ADDRESS].balance).toBe(CURRENT_CHAIN_BALANCE);
    });

    it('returns balance from cachedBalances when current chain balance is missing', () => {
      const ACCOUNT_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const CACHED_BALANCE = '0x2000';
      const mockAccount = createMockInternalAccount({
        address: ACCOUNT_ADDRESS,
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS]: { balance: CACHED_BALANCE },
            },
          },
        },
      };

      // Clear the balance from accountBalances but keep in cachedBalances
      const modifiedState = {
        ...state,
        metamask: {
          ...state.metamask,
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS.toLowerCase()]: { balance: CACHED_BALANCE },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccounts(modifiedState);

      expect(result[ACCOUNT_ADDRESS].balance).toBe(CACHED_BALANCE);
    });

    it('returns 0x0 when no balance is available', () => {
      const ACCOUNT_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const mockAccount = createMockInternalAccount({
        address: ACCOUNT_ADDRESS,
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {},
        },
      };

      const result = selectors.getMetaMaskAccounts(state);

      expect(result[ACCOUNT_ADDRESS].balance).toBe('0x0');
    });

    it('handles multiple accounts correctly', () => {
      // getMetaMaskAccountBalances normalizes addresses to lowercase
      const ACCOUNT_1 = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const ACCOUNT_2 = '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b';
      const BALANCE_1 = '0x1000';
      const BALANCE_2 = '0x2000';

      const mockAccount1 = createMockInternalAccount({
        address: ACCOUNT_1,
        name: 'Account 1',
      });
      const mockAccount2 = createMockInternalAccount({
        address: ACCOUNT_2,
        name: 'Account 2',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount1.id]: mockAccount1,
              [mockAccount2.id]: mockAccount2,
            },
            selectedAccount: mockAccount1.id,
          },
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [ACCOUNT_1, ACCOUNT_2],
              metadata: { id: 'mock-keyring-id', name: '' },
            },
          ],
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_1]: { balance: BALANCE_1 },
              [ACCOUNT_2]: { balance: BALANCE_2 },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccounts(state);

      expect(result[ACCOUNT_1].balance).toBe(BALANCE_1);
      expect(result[ACCOUNT_2].balance).toBe(BALANCE_2);
    });

    it('maintains LRU cache for different chainId parameters', () => {
      const ACCOUNT_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const MAINNET_BALANCE = '0x1000';
      const GOERLI_BALANCE = '0x2000';
      const mockAccount = createMockInternalAccount({
        address: ACCOUNT_ADDRESS,
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.MAINNET]: true,
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              [ACCOUNT_ADDRESS]: { balance: MAINNET_BALANCE },
            },
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS]: { balance: GOERLI_BALANCE },
            },
          },
        },
      };

      // Call with mainnet chainId
      const mainnetResult1 = selectors.getMetaMaskAccounts(
        state,
        CHAIN_IDS.MAINNET,
      );
      expect(mainnetResult1[ACCOUNT_ADDRESS].balance).toBe(MAINNET_BALANCE);

      // Call with goerli chainId
      const goerliResult1 = selectors.getMetaMaskAccounts(
        state,
        CHAIN_IDS.GOERLI,
      );
      expect(goerliResult1[ACCOUNT_ADDRESS].balance).toBe(GOERLI_BALANCE);

      // Call again with mainnet - should return cached result
      const mainnetResult2 = selectors.getMetaMaskAccounts(
        state,
        CHAIN_IDS.MAINNET,
      );
      expect(mainnetResult2).toBe(mainnetResult1);

      // Call again with goerli - should return cached result
      const goerliResult2 = selectors.getMetaMaskAccounts(
        state,
        CHAIN_IDS.GOERLI,
      );
      expect(goerliResult2).toBe(goerliResult1);
    });

    it('returns account with all internal account properties plus balance', () => {
      const ACCOUNT_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
      const BALANCE = '0x1000';
      const mockAccount = createMockInternalAccount({
        address: ACCOUNT_ADDRESS,
        name: 'Test Account',
      });

      const state = {
        ...mockState,
        metamask: {
          ...mockState.metamask,
          ...mockNetworkState({
            chainId: CHAIN_IDS.GOERLI,
          }),
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
          enabledNetworkMap: {
            eip155: {
              [CHAIN_IDS.GOERLI]: true,
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.GOERLI]: {
              [ACCOUNT_ADDRESS]: { balance: BALANCE },
            },
          },
        },
      };

      const result = selectors.getMetaMaskAccounts(state);
      const account = result[ACCOUNT_ADDRESS];

      expect(account.address).toBe(ACCOUNT_ADDRESS);
      expect(account.metadata.name).toBe('Test Account');
      expect(account.balance).toBe(BALANCE);
      expect(account.id).toBe(mockAccount.id);
    });
  });

  describe('#getHDEntropyIndex', () => {
    const selectedAddress = '0xSelectedAddress';
    const otherAddress = '0xOtherAddress';
    const hdKeyringType = KeyringType.hdKeyTree;
    const nonHdKeyringType = 'some-other-keyring-type';
    const entropySourceId1 = 'entropy-id-1';
    const entropySourceId2 = 'entropy-id-2';

    const baseMockState = {
      metamask: {
        internalAccounts: {
          accounts: {
            acc1: {
              address: selectedAddress,
              metadata: { keyring: { type: 'some-type' } },
              options: {},
            },
            acc2: {
              address: otherAddress,
              metadata: { keyring: { type: 'some-type' } },
              options: {},
            },
          },
          selectedAccount: 'acc1',
        },
        keyrings: [],
      },
    };

    it('should return the index of the HD keyring containing the selected address', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          keyrings: [
            {
              type: nonHdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'mock-keyring-id-1',
                name: '',
              },
            },
            {
              type: hdKeyringType,
              accounts: [otherAddress, selectedAddress],
              metadata: {
                id: 'mock-keyring-id-2',
                name: '',
              },
            }, // Index 1 (0 for hdKeyrings filter)
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'mock-keyring-id-3',
                name: '',
              },
            }, // Index 2 (1 for hdKeyrings filter)
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBe(0);
    });

    it('should return the index based on metadata if account not in HD keyring but entropySource matches', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          internalAccounts: {
            ...baseMockState.metamask.internalAccounts,
            accounts: {
              ...baseMockState.metamask.internalAccounts.accounts,
              acc1: {
                ...baseMockState.metamask.internalAccounts.accounts.acc1,
                options: { entropySource: entropySourceId2 },
              },
            },
          },
          keyrings: [
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'some-other-id',
                name: '',
              },
            }, // No selectedAddress here
            {
              type: nonHdKeyringType,
              accounts: [selectedAddress],
              metadata: {
                id: entropySourceId1,
                name: '',
              },
            },
            {
              type: nonHdKeyringType,
              accounts: [selectedAddress],
              metadata: {
                id: entropySourceId2,
                name: '',
              },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBe(2);
    });

    it('should return undefined if account not in HD keyring and entropySource does not match any metadata id', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          internalAccounts: {
            ...baseMockState.metamask.internalAccounts,
            accounts: {
              ...baseMockState.metamask.internalAccounts.accounts,
              acc1: {
                ...baseMockState.metamask.internalAccounts.accounts.acc1,
                options: { entropySource: 'non-matching-entropy-id' },
              },
            },
          },
          keyrings: [
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: entropySourceId1,
                name: '',
              },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBeUndefined();
    });

    it('should return undefined if account not in HD keyring and no entropySource in account options', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          // selected account acc1 has no options.entropySource by default in baseMockState
          keyrings: [
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: entropySourceId1,
                name: '',
              },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBeUndefined();
    });

    it('should return undefined if account not in HD keyring and no selected internal account found', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          internalAccounts: {
            ...baseMockState.metamask.internalAccounts,
            selectedAccount: 'non-existent-acc-id',
          },
          keyrings: [
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: entropySourceId1,
                name: '',
              },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBeUndefined();
    });

    it('should return undefined if no HD keyrings and no matching entropySource', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          internalAccounts: {
            ...baseMockState.metamask.internalAccounts,
            accounts: {
              ...baseMockState.metamask.internalAccounts.accounts,
              acc1: {
                ...baseMockState.metamask.internalAccounts.accounts.acc1,
                options: { entropySource: 'non-matching-entropy-id' },
              },
            },
          },
          keyrings: [
            {
              type: nonHdKeyringType,
              accounts: [selectedAddress],
              metadata: {
                id: entropySourceId1,
                name: '',
              },
            },
            {
              type: nonHdKeyringType,
              accounts: [otherAddress],
              metadata: { id: 'some-other-id', name: '' },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBeUndefined();
    });

    it('should return correct index from metadata if no HD keyrings but matching entropySource', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          internalAccounts: {
            ...baseMockState.metamask.internalAccounts,
            accounts: {
              ...baseMockState.metamask.internalAccounts.accounts,
              acc1: {
                ...baseMockState.metamask.internalAccounts.accounts.acc1,
                options: { entropySource: entropySourceId1 },
              },
            },
          },
          keyrings: [
            {
              type: nonHdKeyringType,
              accounts: [selectedAddress],
              metadata: {
                id: 'another-id',
                name: '',
              },
            },
            {
              type: nonHdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: entropySourceId1,
                name: '',
              },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBe(1);
    });

    it('should correctly identify the first HD keyring if multiple HD keyrings exist and selected address is in the first one', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          keyrings: [
            {
              type: hdKeyringType,
              accounts: [selectedAddress, otherAddress],
              metadata: {
                id: 'mock-keyring-id-1',
                name: '',
              },
            }, // Index 0 (0 for hdKeyrings filter)
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'mock-keyring-id-2',
                name: '',
              },
            }, // Index 1 (1 for hdKeyrings filter)
            {
              type: nonHdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'mock-keyring-id-3',
                name: '',
              },
            },
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBe(0);
    });

    it('should correctly identify a later HD keyring if selected address is not in earlier ones', () => {
      const state = {
        ...baseMockState,
        metamask: {
          ...baseMockState.metamask,
          keyrings: [
            {
              type: hdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'mock-keyring-id-1',
                name: '',
              },
            }, // Index 0 (0 for hdKeyrings filter)
            {
              type: nonHdKeyringType,
              accounts: [otherAddress],
              metadata: {
                id: 'mock-keyring-id-2',
                name: '',
              },
            },
            {
              type: hdKeyringType,
              accounts: [selectedAddress, otherAddress],
              metadata: {
                id: 'mock-keyring-id-3',
                name: '',
              },
            }, // Index 2 (1 for hdKeyrings filter)
          ],
        },
      };
      expect(selectors.getHDEntropyIndex(state)).toBe(1); // 1st HD keyring (index 1 of filtered hdKeyrings)
    });
  });
});

describe('getNativeTokenInfo', () => {
  const arrange = () => {
    const state = {
      metamask: {
        networkConfigurationsByChainId: {},
      },
    };

    return { state };
  };

  it('provides native token info from a network a user has added', () => {
    const mocks = arrange();
    mocks.state.metamask.networkConfigurationsByChainId['0x1337'] = {
      nativeCurrency: 'HELLO',
      name: 'MyToken',
    };

    const result = selectors.getNativeTokenInfo(
      mocks.state.metamask.networkConfigurationsByChainId,
      '0x1337',
    );
    expect(result).toStrictEqual({
      symbol: 'HELLO',
      decimals: 18,
      name: 'MyToken',
    });
  });

  it('provides native token info from a network added but with fallbacks for missing fields', () => {
    const mocks = arrange();
    mocks.state.metamask.networkConfigurationsByChainId['0x1337'] = {
      nativeCurrency: undefined,
      name: undefined,
    };

    const result = selectors.getNativeTokenInfo(
      mocks.state.metamask.networkConfigurationsByChainId,
      '0x1337',
    );
    expect(result).toStrictEqual({
      symbol: 'NATIVE',
      decimals: 18,
      name: 'Native Token',
    });
  });

  it('provides native token from known list of hardcoded native tokens', () => {
    const mocks = arrange();

    const result = selectors.getNativeTokenInfo(
      mocks.state.metamask.networkConfigurationsByChainId,
      '0x89',
    );
    expect(result).toStrictEqual({
      symbol: 'POL',
      decimals: 18,
      name: 'Polygon',
    });
  });

  it('fallbacks for unknown native token info', () => {
    const mocks = arrange();
    const result = selectors.getNativeTokenInfo(
      mocks.state.metamask.networkConfigurationsByChainId,
      '0xFakeToken',
    );
    expect(result).toStrictEqual({
      symbol: 'NATIVE',
      decimals: 18,
      name: 'Native Token',
    });
  });
});

describe('getInternalAccountsSortedByKeyring', () => {
  const hdAccountFromHdKeyring1 = {
    ...createMockInternalAccount({
      address: '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      keyringType: KeyringTypes.hd,
    }),
    balance: '0x0',
  };
  const hdAccountFromHdKeyring2 = {
    ...createMockInternalAccount({
      address: '0x38b00C1620c260cc683F0C89bda9b0D985A233a7',
      keyringType: KeyringTypes.hd,
    }),
    balance: '0x0',
  };
  const hardwareAccount1 = {
    ...createMockInternalAccount({
      address: '0xe000000000000000000000000000000000000001',
      keyringType: KeyringTypes.ledger,
    }),
    balance: '0',
  };
  const hardwareAccount2 = {
    ...createMockInternalAccount({
      address: '0xd000000000000000000000000000000000000002',
      keyringType: KeyringTypes.ledger,
    }),
    balance: '0',
  };

  const mockHdKeyring1 = {
    type: KeyringTypes.hd,
    accounts: [hdAccountFromHdKeyring1.address],
    metadata: {
      id: 'mockHdKeyring1',
      name: '',
    },
  };

  const mockHdKeyring2 = {
    type: KeyringTypes.hd,
    accounts: [hdAccountFromHdKeyring2.address],
    metadata: {
      id: 'mockHdKeyring2',
      name: '',
    },
  };
  const mockLedgerKeyring = {
    type: KeyringTypes.ledger,
    accounts: [hardwareAccount1.address, hardwareAccount2.address],
    metadata: {
      id: 'mockLedgerKeyring',
      name: '',
    },
  };

  it('returns internal accounts sorted by keyring', () => {
    const mockStateWithHardwareAccounts = {
      metamask: {
        internalAccounts: {
          accounts: {
            [hdAccountFromHdKeyring1.id]: hdAccountFromHdKeyring1,
            [hdAccountFromHdKeyring2.id]: hdAccountFromHdKeyring2,
            [hardwareAccount1.id]: hardwareAccount1,
            [hardwareAccount2.id]: hardwareAccount2,
          },
          selectedAccount: hardwareAccount1.id,
        },
        keyrings: [mockHdKeyring1, mockHdKeyring2, mockLedgerKeyring],
        networkConfigurationsByChainId:
          mockState.metamask.networkConfigurationsByChainId,
        selectedNetworkClientId: mockState.metamask.selectedNetworkClientId,
      },
    };

    const result = selectors.getInternalAccountsSortedByKeyring(
      mockStateWithHardwareAccounts,
    );
    expect(result).toStrictEqual([
      hdAccountFromHdKeyring1,
      hdAccountFromHdKeyring2,
      hardwareAccount1,
      hardwareAccount2,
    ]);
  });
});

describe('getUrlScanCacheResult', () => {
  it('returns undefined for empty hostname', () => {
    const result = selectors.getUrlScanCacheResult(mockState, '');
    expect(result).toBeUndefined();
  });

  it('returns undefined for invalid URL hostname', () => {
    const result = selectors.getUrlScanCacheResult(
      mockState,
      'not-a-valid-url',
    );
    expect(result).toBeUndefined();
  });

  it('returns the cached url scan result for a given hostname', () => {
    mockState.metamask.urlScanCache = {
      'example.com': {
        result: {
          domainName: 'example.com',
          recommendedAction: 'BLOCK',
        },
        timestamp: 1234567890,
      },
    };

    const result = selectors.getUrlScanCacheResult(mockState, 'example.com');
    expect(result).toStrictEqual({
      result: {
        domainName: 'example.com',
        recommendedAction: 'BLOCK',
      },
      timestamp: 1234567890,
    });
  });
});

describe('getGasFeesSponsoredNetworkEnabled', () => {
  it('returns the gasFeesSponsoredNetwork flag value for different scenarios', () => {
    const gasFeesSponsoredNetwork = {
      '0x1': true,
      '0x2': false,
    };
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        remoteFeatureFlags: {
          gasFeesSponsoredNetwork,
        },
      },
    };
    const result = selectors.getGasFeesSponsoredNetworkEnabled(state);
    expect(result).toStrictEqual(gasFeesSponsoredNetwork);
    expect(result['0x1']).toBe(true);
    expect(result['0x2']).toBe(false);
  });
});

describe('getHasAnyEvmNetworkEnabled', () => {
  it('returns true when at least one EVM network is enabled', () => {
    const state = {
      metamask: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x5': false,
          },
        },
      },
    };
    expect(selectors.getHasAnyEvmNetworkEnabled(state)).toBe(true);
  });

  it('returns false when no EVM networks are enabled', () => {
    const state = {
      metamask: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': false,
            '0x5': false,
          },
        },
      },
    };
    expect(selectors.getHasAnyEvmNetworkEnabled(state)).toBe(false);
  });

  it('returns false when EVM namespace is empty', () => {
    const state = {
      metamask: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {},
        },
      },
    };
    expect(selectors.getHasAnyEvmNetworkEnabled(state)).toBe(false);
  });

  it('returns false when EVM namespace is not present', () => {
    const state = {
      metamask: {
        enabledNetworkMap: {
          unknown: {
            'unknown:mainnet': true,
          },
        },
      },
    };
    expect(selectors.getHasAnyEvmNetworkEnabled(state)).toBe(false);
  });

  it('returns true when multiple EVM networks are enabled', () => {
    const state = {
      metamask: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
            '0xa': true,
          },
        },
      },
    };
    expect(selectors.getHasAnyEvmNetworkEnabled(state)).toBe(true);
  });

  it('returns true when mixed enabled/disabled EVM networks with at least one enabled', () => {
    const state = {
      metamask: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': false,
            '0x89': true,
            '0xa': false,
          },
          unknown: {
            'unknown:mainnet': true,
          },
        },
      },
    };
    expect(selectors.getHasAnyEvmNetworkEnabled(state)).toBe(true);
  });
});

describe('getPermissionsForActiveTab', () => {
  const permissionsTestState = {
    activeTab: {
      origin: 'https://example.com',
    },
    metamask: {
      appActiveTab: {
        id: 123,
        title: 'Test Dapp',
        origin: 'https://testdapp.com',
        protocol: 'https:',
        url: 'https://testdapp.com',
        host: 'testdapp.com',
        href: 'https://testdapp.com',
      },
      subjects: {
        'https://example.com': {
          permissions: {
            eth_accounts: {
              date: 1234567890,
            },
          },
        },
        'https://testdapp.com': {
          permissions: {
            eth_accounts: {
              date: 1234567890,
            },
            eth_requestAccounts: {
              date: 1234567890,
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return permissions for popup context using activeTab.origin', () => {
    const util = jest.requireMock('../../app/scripts/lib/util');
    util.getEnvironmentType.mockReturnValue('popup');

    const result = selectors.getPermissionsForActiveTab(permissionsTestState);

    expect(result).toStrictEqual([
      { key: 'eth_accounts', value: { date: 1234567890 } },
    ]);
  });

  it('should return permissions for sidepanel context using appActiveTab.origin', () => {
    const util = jest.requireMock('../../app/scripts/lib/util');
    util.getEnvironmentType.mockReturnValue('sidepanel');

    const result = selectors.getPermissionsForActiveTab(permissionsTestState);

    expect(result).toStrictEqual([
      { key: 'eth_accounts', value: { date: 1234567890 } },
      { key: 'eth_requestAccounts', value: { date: 1234567890 } },
    ]);
  });

  it('should return empty array when no permissions exist for the origin', () => {
    const util = jest.requireMock('../../app/scripts/lib/util');
    util.getEnvironmentType.mockReturnValue('popup');

    const stateWithoutPermissions = {
      ...permissionsTestState,
      metamask: {
        ...permissionsTestState.metamask,
        subjects: {},
      },
    };

    const result = selectors.getPermissionsForActiveTab(
      stateWithoutPermissions,
    );

    expect(result).toStrictEqual([]);
  });

  it('should return empty array when origin is undefined in popup context', () => {
    const util = jest.requireMock('../../app/scripts/lib/util');
    util.getEnvironmentType.mockReturnValue('popup');

    const stateWithoutOrigin = {
      ...permissionsTestState,
      activeTab: {},
    };

    const result = selectors.getPermissionsForActiveTab(stateWithoutOrigin);

    expect(result).toStrictEqual([]);
  });

  it('should return empty array when appActiveTab is undefined in sidepanel context', () => {
    const util = jest.requireMock('../../app/scripts/lib/util');
    util.getEnvironmentType.mockReturnValue('sidepanel');

    const stateWithoutAppActiveTab = {
      ...permissionsTestState,
      metamask: {
        ...permissionsTestState.metamask,
        appActiveTab: undefined,
      },
    };

    const result = selectors.getPermissionsForActiveTab(
      stateWithoutAppActiveTab,
    );

    expect(result).toStrictEqual([]);
  });
});

describe('getShowUpdateModal', () => {
  const now = 1000000000000;
  const twentyFiveHoursMs = 25 * 60 * 60 * 1000;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    global.platform = {
      getVersion: jest.fn().mockReturnValue('9.0.0'),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.platform;
  });

  it('returns false when there is no pending extension version', () => {
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: null,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });

  it('returns false when pending version is not greater than current version', () => {
    global.platform.getVersion.mockReturnValue('11.0.0');
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '11.0.0',
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });

  it('returns false when current version is not below minimum (no modal even with newer update)', () => {
    global.platform.getVersion.mockReturnValue('11.0.0');
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '12.0.0',
        updateModalLastDismissedAt: null,
        lastUpdatedAt: null,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });

  it('returns false when not enough time passed since last dismissal', () => {
    const oneHourAgo = now - 60 * 60 * 1000;
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '12.0.0',
        updateModalLastDismissedAt: oneHourAgo,
        lastUpdatedAt: null,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });

  it('returns false when not enough time passed since last update', () => {
    const oneHourAgo = now - 60 * 60 * 1000;
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '12.0.0',
        updateModalLastDismissedAt: null,
        lastUpdatedAt: oneHourAgo,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });

  it('returns true when newer update exists, current version is below minimum, and cooldowns have passed', () => {
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '12.0.0',
        updateModalLastDismissedAt: null,
        lastUpdatedAt: null,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(true);
  });

  it('returns true when cooldowns are exceeded (dismissed and updated more than 24h ago)', () => {
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '12.0.0',
        updateModalLastDismissedAt: now - twentyFiveHoursMs,
        lastUpdatedAt: now - twentyFiveHoursMs,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(true);
  });

  it('returns false when platform getVersion is missing (no current version)', () => {
    global.platform.getVersion.mockReturnValue(undefined);
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '12.0.0',
        updateModalLastDismissedAt: null,
        lastUpdatedAt: null,
        remoteFeatureFlags: { extensionUpdatePromptMinimumVersion: '10.0.0' },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });

  it('treats four-segment pending as newer than four-segment current (e.g. beta builds)', () => {
    global.platform.getVersion.mockReturnValue('10.2.3.111');
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '10.2.3.112',
        updateModalLastDismissedAt: null,
        lastUpdatedAt: null,
        remoteFeatureFlags: {
          extensionUpdatePromptMinimumVersion: '10.2.3.113',
        },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(true);
  });

  it('returns false when four-segment pending is not greater than four-segment current', () => {
    global.platform.getVersion.mockReturnValue('10.2.3.112');
    const state = {
      ...mockState,
      metamask: {
        ...mockState.metamask,
        pendingExtensionVersion: '10.2.3.111',
        updateModalLastDismissedAt: null,
        lastUpdatedAt: null,
        remoteFeatureFlags: {
          extensionUpdatePromptMinimumVersion: '10.2.3.113',
        },
      },
    };
    expect(selectors.getShowUpdateModal(state)).toBe(false);
  });
});

describe('getPendingRedirectRoute', () => {
  it('returns the route when set', () => {
    const route = { path: '/asset' };
    const state = {
      metamask: {
        pendingRedirectRoute: route,
      },
    };
    expect(selectors.getPendingRedirectRoute(state)).toStrictEqual(route);
  });

  it('returns null when not set', () => {
    const state = {
      metamask: {
        pendingRedirectRoute: null,
      },
    };
    expect(selectors.getPendingRedirectRoute(state)).toBeNull();
  });

  it('returns null when metamask is undefined', () => {
    const state = {};
    expect(selectors.getPendingRedirectRoute(state)).toBeNull();
  });
});

describe('getDeferredDeepLink', () => {
  it('returns the deferredDeepLink value when it exists', () => {
    const mockDeepLink = {
      createdAt: 1765465337256,
      referringLink: 'https://link.1do.io/deep-link',
    };
    const state = {
      metamask: {
        deferredDeepLink: mockDeepLink,
      },
    };

    expect(selectors.getDeferredDeepLink(state)).toStrictEqual(mockDeepLink);
  });

  it('returns null when deferredDeepLink is undefined', () => {
    const state = {
      metamask: {
        deferredDeepLink: undefined,
      },
    };

    expect(selectors.getDeferredDeepLink(state)).toBeNull();
  });
});
