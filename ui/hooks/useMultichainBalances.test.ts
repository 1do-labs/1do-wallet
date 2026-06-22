import { createSmartTransactionsMockStore } from '../../test/jest';
import { renderHookWithProvider } from '../../test/lib/render-helpers-navigate';
import { useMultichainBalances } from './useMultichainBalances';

describe('useMultichainBalances', () => {
  it('should return the native token of each imported network when no token balances are cached', () => {
    const mockStore = createSmartTransactionsMockStore({
      metamaskStateOverrides: {
        allTokens: {},
      },
    });
    const { result } = renderHookWithProvider(
      () => useMultichainBalances(),
      mockStore,
    );

    expect(result.current.assetsWithBalance).toHaveLength(3);
    expect(result.current.assetsWithBalance).toMatchInlineSnapshot(`
      [
        {
          "address": "",
          "assetId": undefined,
          "balance": "1.00001",
          "chainId": "0xe708",
          "decimals": 18,
          "image": "./images/eth_logo.svg",
          "isNative": true,
          "name": "Linea",
          "secondary": 0,
          "string": "1.00001",
          "symbol": "ETH",
          "title": "Ethereum",
          "tokenFiatAmount": 2524.2752425000003,
          "type": "NATIVE",
        },
        {
          "address": "",
          "assetId": undefined,
          "balance": "1.00001",
          "chainId": "0xa",
          "decimals": 18,
          "image": "./images/eth_logo.svg",
          "isNative": true,
          "name": "OP",
          "secondary": 0,
          "string": "1.00001",
          "symbol": "ETH",
          "title": "Ethereum",
          "tokenFiatAmount": 2524.2752425000003,
          "type": "NATIVE",
        },
        {
          "address": "",
          "assetId": undefined,
          "balance": "0.01",
          "chainId": "0x1",
          "decimals": 18,
          "image": "./images/eth_logo.svg",
          "isNative": true,
          "name": "Ethereum",
          "secondary": 0,
          "string": "0.01",
          "symbol": "ETH",
          "title": "Ethereum",
          "tokenFiatAmount": 25.2425,
          "type": "NATIVE",
        },
      ]
    `);
  });

  it('should return a list of assets with balances', () => {
    const mockStore = createSmartTransactionsMockStore();
    const { result } = renderHookWithProvider(
      () => useMultichainBalances(),
      mockStore,
    );

    expect(result.current.assetsWithBalance).toHaveLength(6);
    expect(result.current.assetsWithBalance).toMatchInlineSnapshot(`
      [
        {
          "address": "0x514910771AF9Ca656af840dff83E8264EcF986CA",
          "assetId": undefined,
          "balance": "1",
          "chainId": "0x1",
          "decimals": 18,
          "isNative": false,
          "secondary": 0,
          "string": "1",
          "symbol": "LINK",
          "title": "LINK",
          "tokenFiatAmount": 3029.1,
          "type": "TOKEN",
        },
        {
          "address": "",
          "assetId": undefined,
          "balance": "1.00001",
          "chainId": "0xe708",
          "decimals": 18,
          "image": "./images/eth_logo.svg",
          "isNative": true,
          "name": "Linea",
          "secondary": 0,
          "string": "1.00001",
          "symbol": "ETH",
          "title": "Ethereum",
          "tokenFiatAmount": 2524.2752425000003,
          "type": "NATIVE",
        },
        {
          "address": "",
          "assetId": undefined,
          "balance": "1.00001",
          "chainId": "0xa",
          "decimals": 18,
          "image": "./images/eth_logo.svg",
          "isNative": true,
          "name": "OP",
          "secondary": 0,
          "string": "1.00001",
          "symbol": "ETH",
          "title": "Ethereum",
          "tokenFiatAmount": 2524.2752425000003,
          "type": "NATIVE",
        },
        {
          "address": "",
          "assetId": undefined,
          "balance": "0.01",
          "chainId": "0x1",
          "decimals": 18,
          "image": "./images/eth_logo.svg",
          "isNative": true,
          "name": "Ethereum",
          "secondary": 0,
          "string": "0.01",
          "symbol": "ETH",
          "title": "Ethereum",
          "tokenFiatAmount": 25.2425,
          "type": "NATIVE",
        },
        {
          "address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          "assetId": undefined,
          "balance": "0.00184",
          "chainId": "0x1",
          "decimals": 6,
          "isNative": false,
          "secondary": 0,
          "string": "0.00184",
          "symbol": "UNI",
          "title": "UNI",
          "tokenFiatAmount": 10.682625999999999,
          "type": "TOKEN",
        },
        {
          "address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          "assetId": undefined,
          "balance": "0",
          "chainId": "0xe708",
          "decimals": 18,
          "isNative": false,
          "secondary": 0,
          "string": "0",
          "symbol": "UNI",
          "title": "UNI",
          "tokenFiatAmount": 0,
          "type": "TOKEN",
        },
      ]
    `);
  });

  it('should return a mapping of chainId to balance', () => {
    const mockStore = createSmartTransactionsMockStore();
    const { result } = renderHookWithProvider(
      () => useMultichainBalances(),
      mockStore,
    );

    expect(result.current.balanceByChainId).toMatchInlineSnapshot(`
      {
        "0x1": 3065.0251259999995,
        "0xa": 2524.2752425000003,
        "0xe708": 2524.2752425000003,
      }
    `);
  });
});
