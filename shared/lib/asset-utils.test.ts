/* eslint-disable prefer-template */
import {
  CaipAssetType,
  CaipAssetTypeStruct,
  CaipChainId,
  Hex,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { getNativeAssetForChainId } from './chain-utils';
import {
  getAssetImageUrl,
  fetchAssetMetadata,
  toAssetId,
  fetchAssetMetadataForAssetIds,
  isEvmChainId,
} from './asset-utils';

jest.mock('@metamask/multichain-network-controller');
jest.mock('@metamask/controller-utils');

const mockFetchWithTimeout = jest.fn();
jest.mock('./fetch-with-timeout', () => ({
  // eslint-disable-next-line  @typescript-eslint/naming-convention
  __esModule: true,
  default: jest
    .fn()
    .mockReturnValue((...args: unknown[]) => mockFetchWithTimeout(...args)),
}));

describe('asset-utils', () => {
  const STATIC_METAMASK_BASE_URL = 'https://static.cx.metamask.io';

  beforeEach(() => {
    (toEvmCaipChainId as jest.Mock).mockImplementation((chainId: string) => {
      const chainIdDecimal = chainId.startsWith('0x')
        ? parseInt(chainId, 16)
        : Number(chainId);
      return `eip155:${chainIdDecimal}`;
    });
  });

  describe('toAssetId', () => {
    beforeEach(() => {
      mockFetchWithTimeout.mockReset();
      jest.clearAllMocks();
    });

    it('should return the same asset ID if input is already a CAIP asset type', () => {
      const caipAssetId = CaipAssetTypeStruct.create('eip155:1/erc20:0x123');
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(caipAssetId, chainId);
      expect(result).toBe(caipAssetId);
    });

    it('should return native asset ID for native EVM address', () => {
      const nativeAddress = '0x0000000000000000000000000000000000000000';
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(nativeAddress, chainId);
      expect(result).toBe(getNativeAssetForChainId(chainId)?.assetId);
      expect(CaipAssetTypeStruct.validate(result)).toStrictEqual([
        undefined,
        result,
      ]);
    });

    it('should return native asset ID for null EVM address', () => {
      const nativeAddress = null;
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(nativeAddress as never, chainId);
      expect(result).toBe(getNativeAssetForChainId(chainId)?.assetId);
      expect(CaipAssetTypeStruct.validate(result)).toStrictEqual([
        undefined,
        result,
      ]);
    });

    it('should return undefined if getNativeAssetForChainId returns undefined for unsupported chain', () => {
      const nativeAddress = '0x0000000000000000000000000000000000000000';
      const chainId = 'eip155:1231' as CaipChainId;

      // getNativeAssetForChainId returns undefined (not throws) for chains not in the swaps map
      // Format normalization in isEvmChainId should prevent conversion errors
      const result = toAssetId(nativeAddress, chainId);
      expect(result).toBeUndefined();
    });

    it('should return undefined for unsupported non-EVM chain IDs', () => {
      const address = 'unsupported-address';
      const chainId = 'unknown:1' as CaipChainId;

      const result = toAssetId(address, chainId);
      expect(result).toBeUndefined();
    });

    it('should create EVM token asset ID correctly', () => {
      const address = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(address, chainId);
      expect(result).toBe(`eip155:1/erc20:${address}`);
      expect(CaipAssetTypeStruct.validate(result)).toStrictEqual([
        undefined,
        result,
      ]);
    });

    it('should return undefined for non-hex address on EVM chains', () => {
      const address = 'not-a-hex-address';
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(address, chainId);
      expect(result).toBeUndefined();
    });

    it('should handle different EVM chain IDs', () => {
      const address = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
      const chainId = 'eip155:137' as CaipChainId;

      const result = toAssetId(address, chainId);
      expect(result).toBe(`eip155:137/erc20:${address}`);
      expect(CaipAssetTypeStruct.validate(result)).toStrictEqual([
        undefined,
        result,
      ]);
    });

    it('should handle checksummed addresses', () => {
      const address = '0x1F9840a85d5aF5bf1D1762F925BDADdC4201F984';
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(address, chainId);
      expect(result).toBe(`eip155:1/erc20:${address}`);
      expect(CaipAssetTypeStruct.validate(result)).toStrictEqual([
        undefined,
        result,
      ]);
    });
  });

  describe('getAssetImageUrl', () => {
    it('should return correct image URL for a CAIP asset ID', () => {
      const assetId = 'eip155:1/erc20:0x123' as CaipAssetType;
      const expectedUrl = `${STATIC_METAMASK_BASE_URL}/api/v2/tokenIcons/assets/eip155/1/erc20/0x123.png`;

      expect(getAssetImageUrl(assetId, 'eip155:1')).toBe(expectedUrl);
    });

    it('should return undefined for unsupported asset IDs', () => {
      const assetId = 'unknown:1/token:aBCD' as CaipAssetType;

      expect(getAssetImageUrl(assetId, 'eip155:1')).toBe(undefined);
    });

    it('should handle asset IDs with multiple colons', () => {
      const assetId = 'test:chain:1/token:0x123' as CaipAssetType;

      expect(getAssetImageUrl(assetId, 'eip155:1')).toBe(undefined);
    });
  });

  describe('fetchAssetMetadata', () => {
    it('returns undefined without calling the remote token metadata API', async () => {
      const result = await fetchAssetMetadata('0x123' as Hex, '0x1' as Hex);

      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('fetchAssetMetadataForAssetIds', () => {
    it('returns null without calling the remote token metadata API', async () => {
      const result = await fetchAssetMetadataForAssetIds([
        'eip155:1/erc20:0x123' as CaipAssetType,
      ]);

      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('isEvmChainId', () => {
    it('should return true for EVM chain ids on caip format', () => {
      expect(isEvmChainId('eip155:1')).toBe(true);
    });

    it('should return true for EVM chain ids on hex format', () => {
      expect(isEvmChainId('0x1')).toBe(true);
    });

    it('should return false for unsupported chain ids', () => {
      expect(isEvmChainId('unknown:1')).toBe(false);
    });

    it('should return true for EVM chain ids passed as decimal strings', () => {
      // Test Injective testnet (1439) - the original bug case
      expect(isEvmChainId('1439' as Hex)).toBe(true);
      // Test other EVM chains as decimal strings
      expect(isEvmChainId('1' as Hex)).toBe(true); // Ethereum mainnet
      expect(isEvmChainId('137' as Hex)).toBe(true); // Polygon
      expect(isEvmChainId('1776' as Hex)).toBe(true); // Injective mainnet
    });

    it('should return false for unsupported chain ids passed as decimal strings', () => {
      expect(isEvmChainId('1151111081099710' as Hex)).toBe(false);
      expect(isEvmChainId('20000000000001' as Hex)).toBe(false);
      expect(isEvmChainId('728126428' as Hex)).toBe(false);
    });

    it('should handle Injective testnet chainId in different formats', () => {
      // All these should return true for Injective testnet (1439)
      expect(isEvmChainId('1439' as Hex)).toBe(true); // Decimal string
      expect(isEvmChainId('0x59f' as Hex)).toBe(true); // Hex format
      expect(isEvmChainId('eip155:1439' as CaipChainId)).toBe(true); // CAIP format
    });
  });
});
