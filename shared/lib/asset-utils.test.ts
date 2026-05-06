/* eslint-disable prefer-template */
import {
  CaipAssetType,
  CaipAssetTypeStruct,
  CaipChainId,
  Hex,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
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
  const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

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
      expect(result).toBe(getNativeAssetForChainId(chainId).assetId);
      expect(CaipAssetTypeStruct.validate(result)).toStrictEqual([
        undefined,
        result,
      ]);
    });

    it('should return native asset ID for null EVM address', () => {
      const nativeAddress = null;
      const chainId = 'eip155:1' as CaipChainId;

      const result = toAssetId(nativeAddress as never, chainId);
      expect(result).toBe(getNativeAssetForChainId(chainId).assetId);
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

    it('should return undefined for non-EVM chain IDs', () => {
      const address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

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

    it('should return undefined for non-EVM asset IDs', () => {
      const assetId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:aBCD' as CaipAssetType;

      expect(getAssetImageUrl(assetId, 'eip155:1')).toBe(undefined);
    });

    it('should handle asset IDs with multiple colons', () => {
      const assetId = 'test:chain:1/token:0x123' as CaipAssetType;

      expect(getAssetImageUrl(assetId, 'eip155:1')).toBe(undefined);
    });
  });

  describe('fetchAssetMetadata', () => {
    const mockAddress = '0x123' as Hex;
    const mockChainId = 'eip155:1' as CaipChainId;
    const mockHexChainId = '0x1' as Hex;
    const mockAssetId = 'eip155:1/erc20:0x123' as CaipAssetType;

    beforeEach(() => {
      mockFetchWithTimeout.mockReset();
      jest.clearAllMocks();
      (toEvmCaipChainId as jest.Mock).mockReturnValue(mockChainId);
    });

    it('should fetch EVM token metadata successfully', async () => {
      const mockMetadata = {
        assetId: mockAssetId + 'ABcDe',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      };

      mockFetchWithTimeout.mockResolvedValueOnce({
        json: async () => await Promise.resolve([mockMetadata]),
      });

      const result = await fetchAssetMetadata(
        mockAddress + 'ABcDe',
        mockHexChainId,
      );

      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        `${TOKEN_API_V3_BASE_URL}/assets?assetIds=${mockAssetId + 'ABcDe'}`,
        {
          method: 'GET',
          headers: { 'X-Client-Id': 'extension' },
        },
      );

      expect(result).toStrictEqual({
        symbol: 'TEST',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x123abcde.png',
        assetId: 'eip155:1/erc20:0x123ABcDe',
        address: '0x123abcde',
        chainId: mockHexChainId,
      });
    });

    it('should return undefined for non-EVM chain IDs', async () => {
      const result = await fetchAssetMetadata(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );

      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle CAIP chain IDs', async () => {
      const mockMetadata = {
        assetId: mockAssetId,
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      };

      mockFetchWithTimeout.mockResolvedValueOnce({
        json: async () => await Promise.resolve([mockMetadata]),
      });

      const result = await fetchAssetMetadata(mockAddress, mockChainId);

      expect(toEvmCaipChainId).not.toHaveBeenCalled();

      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0x123',
        {
          headers: { 'X-Client-Id': 'extension' },
          method: 'GET',
          signal: undefined,
        },
      );

      expect(result).toStrictEqual({
        symbol: 'TEST',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x123.png',
        assetId: mockAssetId,
        address: mockAddress,
        chainId: mockHexChainId,
      });
    });

    it('should handle hex chain IDs', async () => {
      const mockMetadata = {
        assetId: mockAssetId,
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      };

      mockFetchWithTimeout.mockResolvedValueOnce({
        json: async () => await Promise.resolve([mockMetadata]),
      });

      const result = await fetchAssetMetadata(mockAddress, mockHexChainId);

      expect(toEvmCaipChainId).toHaveBeenCalledWith(mockHexChainId);
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0x123',
        {
          headers: { 'X-Client-Id': 'extension' },
          method: 'GET',
          signal: undefined,
        },
      );

      expect(result).toStrictEqual({
        symbol: 'TEST',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x123.png',
        assetId: mockAssetId,
        address: mockAddress,
        chainId: mockHexChainId,
      });
    });

    it('should return undefined when API call fails', async () => {
      mockFetchWithTimeout.mockRejectedValueOnce(new Error('API Error'));
      const result = await fetchAssetMetadata(mockAddress, mockHexChainId);
      expect(result).toBeUndefined();
    });

    it('should return undefined when metadata processing fails', async () => {
      mockFetchWithTimeout.mockResolvedValueOnce([null]);
      const result = await fetchAssetMetadata(mockAddress, mockHexChainId);
      expect(result).toBeUndefined();
    });

    it('should return undefined when EVM address is not valid', async () => {
      const result = await fetchAssetMetadata('abc', mockHexChainId);
      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
      expect(result).toStrictEqual(undefined);
    });
  });

  describe('fetchAssetMetadataForAssetIds', () => {
    const mockChainId = 'eip155:1' as CaipChainId;
    const mockAssetId = 'eip155:1/erc20:0x123' as CaipAssetType;

    beforeEach(() => {
      mockFetchWithTimeout.mockReset();
      jest.clearAllMocks();
      (toEvmCaipChainId as jest.Mock).mockReturnValue(mockChainId);
    });

    it('should fetch EVM token metadata successfully', async () => {
      const mockMetadata = {
        assetId: (mockAssetId + 'ABcDe').toLowerCase(),
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      };

      mockFetchWithTimeout.mockResolvedValueOnce({
        json: async () => await Promise.resolve([mockMetadata]),
      });

      const result = await fetchAssetMetadataForAssetIds([
        (mockAssetId + 'ABcDe') as never,
      ]);

      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        `${TOKEN_API_V3_BASE_URL}/assets?assetIds=${mockAssetId + 'ABcDe'.toLowerCase()}`,
        {
          method: 'GET',
          headers: { 'X-Client-Id': 'extension' },
        },
      );

      expect(result).toStrictEqual({
        [(mockAssetId + 'ABcDe').toLowerCase()]: {
          symbol: 'TEST',
          decimals: 18,
          assetId: 'eip155:1/erc20:0x123abcde',
          name: 'Test Token',
        },
      });
    });

    it('should return null when asset IDs are not valid EVM assets', async () => {
      const result = await fetchAssetMetadataForAssetIds([
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as never,
      ]);

      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when API call fails', async () => {
      mockFetchWithTimeout.mockRejectedValueOnce(new Error('API Error'));
      const result = await fetchAssetMetadataForAssetIds([mockAssetId]);
      expect(result).toBeNull();
    });

    it('should return null when metadata processing fails', async () => {
      mockFetchWithTimeout.mockResolvedValueOnce([null]);
      const result = await fetchAssetMetadataForAssetIds([mockAssetId]);
      expect(result).toBeNull();
    });

    it('should return null when EVM address is not valid', async () => {
      const result = await fetchAssetMetadataForAssetIds(['abc' as never]);
      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
      expect(result).toStrictEqual(null);
    });
  });

  describe('isEvmChainId', () => {
    it('should return true for EVM chain ids on caip format', () => {
      expect(isEvmChainId('eip155:1')).toBe(true);
    });

    it('should return true for EVM chain ids on hex format', () => {
      expect(isEvmChainId('0x1')).toBe(true);
    });

    it('should return false for non-EVM chain ids', () => {
      expect(isEvmChainId('solana:1')).toBe(false);
    });

    it('should return true for EVM chain ids passed as decimal strings', () => {
      // Test Injective testnet (1439) - the original bug case
      expect(isEvmChainId('1439' as Hex)).toBe(true);
      // Test other EVM chains as decimal strings
      expect(isEvmChainId('1' as Hex)).toBe(true); // Ethereum mainnet
      expect(isEvmChainId('137' as Hex)).toBe(true); // Polygon
      expect(isEvmChainId('1776' as Hex)).toBe(true); // Injective mainnet
    });

    it('should return false for non-EVM chain ids passed as decimal strings', () => {
      // Test Solana (1151111081099710)
      expect(isEvmChainId('1151111081099710' as Hex)).toBe(false);
      // Test Bitcoin (20000000000001)
      expect(isEvmChainId('20000000000001' as Hex)).toBe(false);
      // Test Tron (728126428)
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
