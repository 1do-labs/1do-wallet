import { Hex } from '@metamask/utils';
import {
  getCurrentCurrency,
  getNativeCurrency,
} from '../ducks/metamask/metamask';
import {
  CHAIN_IDS,
  ETH_TOKEN_IMAGE_URL,
  MAINNET_DISPLAY_NAME,
} from '../../shared/constants/network';
import { mockNetworkState } from '../../test/stub/networks';
import { getProviderConfig } from '../../shared/lib/selectors/networks';
import type { MetaMaskReduxState } from '../store/store';
import {
  MOCK_ACCOUNTS,
  MOCK_ACCOUNT_EOA,
  MOCK_ACCOUNT_ID_BY_ADDRESS,
} from '../../test/data/mock-accounts';
import { AccountsState } from './accounts';
import {
  MultichainState,
  getMultichainCurrentChainId,
  getMultichainCurrentCurrency,
  getMultichainDefaultToken,
  getMultichainIsEvm,
  getMultichainIsMainnet,
  getMultichainNativeCurrency,
  getMultichainNetwork,
  getMultichainProviderConfig,
  getMultichainSelectedAccountCachedBalance,
  getMultichainShouldShowFiat,
  getMultichainSelectedAccountCachedBalanceIsZero,
  getMultichainIsTestnet,
} from './multichain';
import { getSelectedAccountCachedBalance, getShouldShowFiat } from '.';

type TestState = MultichainState &
  AccountsState & {
    metamask: Pick<
      MetaMaskReduxState['metamask'],
      | 'preferences'
      | 'accountsByChainId'
      | 'networkConfigurationsByChainId'
      | 'currentCurrency'
      | 'currencyRates'
      | 'completedOnboarding'
      | 'selectedNetworkClientId'
      | 'remoteFeatureFlags'
      | 'internalAccounts'
      | 'accountIdByAddress'
      | 'isEvmSelected'
      | 'multichainNetworkConfigurationsByChainId'
      | 'selectedMultichainNetworkChainId'
      | 'networksWithTransactionActivity'
    >;
  };

function getEvmState(chainId: Hex = CHAIN_IDS.MAINNET): TestState {
  return {
    metamask: {
      preferences: {
        showFiatInTestnets: false,
      } as MetaMaskReduxState['metamask']['preferences'],
      ...mockNetworkState({ chainId }),
      currentCurrency: 'ETH',
      currencyRates: {
        ETH: {
          conversionRate: null,
          conversionDate: null,
          usdConversionRate: null,
        },
      },
      completedOnboarding: true,
      internalAccounts: {
        selectedAccount: MOCK_ACCOUNT_EOA.id,
        accounts: MOCK_ACCOUNTS,
      },
      accountIdByAddress: MOCK_ACCOUNT_ID_BY_ADDRESS,
      accountsByChainId: {
        [chainId]: {
          [MOCK_ACCOUNT_EOA.address]: {
            balance: '0x03',
          },
        },
      },
      isEvmSelected: true,
      multichainNetworkConfigurationsByChainId: {},
      selectedMultichainNetworkChainId: `eip155:${Number(chainId)}`,
      networksWithTransactionActivity: {},
      remoteFeatureFlags: {},
    },
  };
}

describe('Multichain Selectors', () => {
  describe('getMultichainNetwork', () => {
    it('returns an EVM network provider', () => {
      const state = getEvmState();

      const network = getMultichainNetwork(state);
      expect(network.isEvmNetwork).toBe(true);
    });

    it('returns an EVM network provider if user is not onboarded', () => {
      const state = getEvmState();
      state.metamask.completedOnboarding = false;
      state.metamask.internalAccounts.selectedAccount = '';

      const network = getMultichainNetwork(state);
      expect(network.isEvmNetwork).toBe(true);
    });

    it('returns an EVM network with the correct network image', () => {
      const state = getEvmState();

      const network = getMultichainNetwork(state);
      expect(network.network.rpcPrefs?.imageUrl).toBe(ETH_TOKEN_IMAGE_URL);
    });

    it('returns a nickname for default networks', () => {
      const state = getEvmState();

      const network = getMultichainNetwork(state);
      expect(network.nickname).toBe(MAINNET_DISPLAY_NAME);
    });

    it('returns rpcUrl as its nickname if it is not defined', () => {
      const mockNetworkRpc = 'https://mock-rpc.com';
      const mockNetwork = {
        ticker: 'MOCK',
        chainId: '0x123123123',
        rpcUrl: mockNetworkRpc,
      } as const;

      const state = {
        ...getEvmState(),
        metamask: {
          ...getEvmState().metamask,
          ...mockNetworkState(mockNetwork),
        },
      };

      const network = getMultichainNetwork(state);
      expect(network.nickname).toBe(network.network.rpcUrl);
      expect(network.nickname).toBe(mockNetworkRpc);
    });
  });

  describe('getMultichainIsEvm', () => {
    it('returns true for selected account', () => {
      const state = getEvmState();

      expect(getMultichainIsEvm(state)).toBe(true);
    });
  });

  describe('getMultichain{ProviderConfig,CurrentNetwork}', () => {
    it('returns the EVM ProviderConfig', () => {
      const state = getEvmState();

      const evmMainnetNetwork = getProviderConfig(state);
      const multichainProviderConfig = getMultichainProviderConfig(state);
      delete multichainProviderConfig?.rpcPrefs?.imageUrl;
      expect(multichainProviderConfig).toStrictEqual(evmMainnetNetwork);
    });
  });

  describe('getMultichainNativeCurrency', () => {
    it('returns same native currency as EVM selector', () => {
      const state = getEvmState();

      expect(getMultichainNativeCurrency(state)).toBe(getNativeCurrency(state));
    });
  });

  describe('getMultichainCurrentCurrency', () => {
    it('returns same currency as EVM selector', () => {
      const state = getEvmState();

      expect(getMultichainCurrentCurrency(state)).toBe(
        getCurrentCurrency(state),
      );
    });
  });

  describe('getMultichainShouldShowFiat', () => {
    it('returns same value as getShouldShowFiat', () => {
      const state = getEvmState();

      expect(getMultichainShouldShowFiat(state)).toBe(getShouldShowFiat(state));
    });
  });

  describe('getMultichainDefaultToken', () => {
    it('returns ETH if account is EVM', () => {
      const state = getEvmState();

      expect(getMultichainDefaultToken(state)).toEqual({
        symbol: 'ETH',
      });
    });
  });

  describe('getMultichainCurrentChainId', () => {
    it('returns current chain ID if account is EVM (mainnet)', () => {
      const state = getEvmState();

      expect(getMultichainCurrentChainId(state)).toEqual(CHAIN_IDS.MAINNET);
    });

    it('returns current chain ID if account is EVM (other)', () => {
      const state = getEvmState(CHAIN_IDS.SEPOLIA);
      expect(getMultichainCurrentChainId(state)).toEqual(CHAIN_IDS.SEPOLIA);
    });
  });

  describe('getMultichainIsMainnet', () => {
    it('returns true if account is EVM mainnet', () => {
      const state = getEvmState();

      expect(getMultichainIsMainnet(state)).toBe(true);
    });

    it('returns false if account is EVM testnet', () => {
      const state = getEvmState(CHAIN_IDS.SEPOLIA);
      expect(getMultichainIsMainnet(state)).toBe(false);
    });
  });

  describe('getMultichainIsTestnet', () => {
    it('returns false if account is EVM mainnet', () => {
      const state = getEvmState();

      expect(getMultichainIsTestnet(state)).toBe(false);
    });

    it.each([CHAIN_IDS.SEPOLIA, CHAIN_IDS.LINEA_SEPOLIA])(
      'returns true if account is EVM testnet: %s',
      (chainId: Hex) => {
        const state = getEvmState(chainId);
        expect(getMultichainIsTestnet(state)).toBe(true);
      },
    );
  });

  describe('getMultichainSelectedAccountCachedBalance', () => {
    it('returns cached balance if account is EVM', () => {
      const state = getEvmState();

      expect(getMultichainSelectedAccountCachedBalance(state)).toBe(
        getSelectedAccountCachedBalance(state),
      );
    });
  });

  describe('getMultichainSelectedAccountCachedBalanceIsZero', () => {
    it('returns true if the selected EVM account has a zero balance', () => {
      const state = getEvmState();
      state.metamask.accountsByChainId['0x1'][
        MOCK_ACCOUNT_EOA.address
      ].balance = '0x00';
      expect(getMultichainSelectedAccountCachedBalanceIsZero(state)).toBe(true);
    });

    it('returns false if the selected EVM account has a non-zero balance', () => {
      const state = getEvmState();
      state.metamask.accountsByChainId['0x1'][
        MOCK_ACCOUNT_EOA.address
      ].balance = '0x03';
      expect(getMultichainSelectedAccountCachedBalanceIsZero(state)).toBe(
        false,
      );
    });
  });
});
