import { existsSync } from 'fs';
import { join } from 'path';
import {
  CHAIN_IDS,
  CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP,
  FEATURED_RPCS,
  NETWORK_TO_NAME_MAP,
} from './network';

describe('NetworkConstants', () => {
  it('has images files that exist for defined networks', () => {
    Object.values(CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP).forEach((image) =>
      expect(existsSync(join('app', image))).toBe(true),
    );
  });

  it('returns network name for chain ids', () => {
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.ARBITRUM]).toBe('Arbitrum');
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.AVALANCHE]).toBe('Avalanche');
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.BSC]).toBe('BNB');
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.MAINNET]).toBe('Ethereum');
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.LINEA_MAINNET]).toBe('Linea');
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.OPTIMISM]).toBe('OP');
    expect(NETWORK_TO_NAME_MAP[CHAIN_IDS.POLYGON]).toBe('Polygon');
  });
  describe('popularNetwork', () => {
    it('should have correct chainIds for all popular network', () => {
      const expectedChainIds: { [key: string]: string } = {
        Arbitrum: CHAIN_IDS.ARBITRUM,
        BNB: CHAIN_IDS.BSC,
        OP: CHAIN_IDS.OPTIMISM,
        Polygon: CHAIN_IDS.POLYGON,
        Base: CHAIN_IDS.BASE,
        Linea: CHAIN_IDS.LINEA_MAINNET,
        MegaETH: CHAIN_IDS.MEGAETH_MAINNET,
        'BNB Smart Chain Testnet': CHAIN_IDS.BSC_TESTNET,
      };

      FEATURED_RPCS.forEach((rpc) => {
        expect(rpc.chainId).toBe(expectedChainIds[rpc.name]);
      });
    });
  });

  describe('FEATURED_RPCS provider usage', () => {
    const alchemyChainIds = [
      CHAIN_IDS.ARBITRUM,
      CHAIN_IDS.BSC,
      CHAIN_IDS.OPTIMISM,
      CHAIN_IDS.POLYGON,
      CHAIN_IDS.BASE,
    ];

    alchemyChainIds.forEach((chainId) => {
      it(`uses Alchemy for chain ${chainId}`, () => {
        const rpc = FEATURED_RPCS.find((entry) => entry.chainId === chainId);
        expect(rpc?.rpcEndpoints[0].url).toContain('.g.alchemy.com/v2/');
      });
    });
  });
});
