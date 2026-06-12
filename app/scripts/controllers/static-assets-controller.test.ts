/**
 * @jest-environment node
 */
import { Hex } from '@metamask/utils';
import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { CHAIN_IDS } from '../../../shared/constants/network';
import * as fetchWithCacheModule from '../../../shared/lib/fetch-with-cache';
import type { StaticAssetsControllerMessenger } from './static-assets-controller';
import { StaticAssetsController } from './static-assets-controller';

const mockTopAssets = [
  {
    assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    assetId: 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
  },
];

const setupController = ({ supportedChains }: { supportedChains: Hex[] }) => {
  const messenger = new Messenger<
    MockAnyNamespace,
    | MessengerActions<StaticAssetsControllerMessenger>
    | MessengerActions<AccountsControllerMessenger>,
    | MessengerEvents<StaticAssetsControllerMessenger>
    | MessengerEvents<AccountsControllerMessenger>
  >({ namespace: MOCK_ANY_NAMESPACE });

  const tokensControllerAddTokensSpy = jest.fn();
  const networkControllerFindNetworkClientIdByChainIdSpy = jest.fn();
  const tokensControllerGetStateSpy = jest.fn();
  const fetchWithCacheSpy = jest.spyOn(fetchWithCacheModule, 'default');

  const staticAssetsControllerMessenger: StaticAssetsControllerMessenger =
    new Messenger({
      namespace: 'StaticAssetsController',
      parent: messenger,
    });

  messenger.delegate({
    messenger: staticAssetsControllerMessenger,
    actions: [
      'NetworkController:findNetworkClientIdByChainId',
      'TokensController:getState',
      'TokensController:addTokens',
    ],
    events: [],
  });

  messenger.registerActionHandler(
    'NetworkController:findNetworkClientIdByChainId',
    networkControllerFindNetworkClientIdByChainIdSpy,
  );

  messenger.registerActionHandler(
    'TokensController:getState',
    tokensControllerGetStateSpy,
  );

  messenger.registerActionHandler(
    'TokensController:addTokens',
    tokensControllerAddTokensSpy,
  );

  const controller = new StaticAssetsController({
    messenger: staticAssetsControllerMessenger,
    getSupportedChains: () => new Set(supportedChains),
    getCacheExpirationTime: () => 1000,
    getTopX: () => 10,
  });

  return {
    controller,
    spies: {
      fetchWithCacheSpy,
      tokensControllerAddTokensSpy,
      networkControllerFindNetworkClientIdByChainIdSpy,
      tokensControllerGetStateSpy,
    },
  };
};

describe('StaticAssetsController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('_executePoll', () => {
    it('fetches top assets for a chain and adds them to the TokensController', async () => {
      const {
        controller,
        spies: {
          fetchWithCacheSpy,
          tokensControllerAddTokensSpy,
          networkControllerFindNetworkClientIdByChainIdSpy,
          tokensControllerGetStateSpy,
        },
      } = setupController({
        supportedChains: [CHAIN_IDS.MAINNET],
      });
      networkControllerFindNetworkClientIdByChainIdSpy.mockResolvedValue(
        'mainnet',
      );
      tokensControllerGetStateSpy.mockResolvedValue({
        allIgnoredTokens: {},
      });
      tokensControllerAddTokensSpy.mockReturnThis();
      fetchWithCacheSpy.mockResolvedValue(mockTopAssets);

      await controller._executePoll({
        chainIds: [CHAIN_IDS.MAINNET],
        selectedAccountAddress: '0x123',
      });

      const url = new URL(
        'https://token.api.cx.metamask.io/v3/tokens/trending',
      );
      url.searchParams.set('chainIds', 'eip155:1');
      url.searchParams.set('minVolume24hUsd', '1');
      url.searchParams.set('minLiquidity', '1');
      url.searchParams.set('minMarketCap', '1');
      expect(fetchWithCacheSpy).toHaveBeenCalledWith({
        url: url.toString(),
        fetchOptions: { method: 'GET' },
        cacheOptions: { cacheRefreshTime: expect.any(Number) },
        functionName: 'fetchTopAssets',
      });
      expect(
        networkControllerFindNetworkClientIdByChainIdSpy,
      ).toHaveBeenCalledWith(CHAIN_IDS.MAINNET);
      expect(tokensControllerGetStateSpy).toHaveBeenCalled();
      expect(tokensControllerAddTokensSpy).toHaveBeenCalledWith(
        [
          {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            symbol: 'WETH',
            decimals: 18,
            name: 'Wrapped Ether',
            aggregators: [],
            image:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
          },
          {
            address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            symbol: 'WBTC',
            decimals: 8,
            name: 'Wrapped Bitcoin',
            aggregators: [],
            image:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png',
          },
        ],
        'mainnet',
      );
    });

    it('returns early when the selected account address is not set', async () => {
      const {
        controller,
        spies: {
          tokensControllerAddTokensSpy,
          networkControllerFindNetworkClientIdByChainIdSpy,
          tokensControllerGetStateSpy,
        },
      } = setupController({
        supportedChains: [CHAIN_IDS.MAINNET],
      });

      await controller._executePoll({
        chainIds: [CHAIN_IDS.MAINNET],
        selectedAccountAddress: '',
      });

      expect(
        networkControllerFindNetworkClientIdByChainIdSpy,
      ).not.toHaveBeenCalled();
      expect(tokensControllerGetStateSpy).not.toHaveBeenCalled();
      expect(tokensControllerAddTokensSpy).not.toHaveBeenCalled();
    });
  });
});
