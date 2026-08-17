import {
  fetchAlchemyNftsForOwner,
  fetchAlchemyTokensForOwner,
} from './alchemy-assets-service';

describe('Alchemy assets service', () => {
  describe('fetchAlchemyTokensForOwner', () => {
    it('loads non-zero balances and token metadata from Alchemy RPC', async () => {
      const provider = {
        request: jest
          .fn()
          .mockResolvedValueOnce({
            tokenBalances: [
              {
                contractAddress: '0x0000000000000000000000000000000000000001',
                tokenBalance: '0x10',
              },
              {
                contractAddress: '0x0000000000000000000000000000000000000002',
                tokenBalance: '0x0',
              },
            ],
          })
          .mockResolvedValueOnce({
            decimals: 6,
            logo: 'https://logo.example/usdc.png',
            name: 'USD Coin',
            symbol: 'USDC',
          }),
      };

      const result = await fetchAlchemyTokensForOwner({
        ownerAddress: '0x0000000000000000000000000000000000000003',
        provider,
      });

      expect(result).toStrictEqual([
        {
          address: '0x0000000000000000000000000000000000000001',
          decimals: 6,
          iconUrl: 'https://logo.example/usdc.png',
          name: 'USD Coin',
          symbol: 'USDC',
        },
      ]);
      expect(provider.request).toHaveBeenNthCalledWith(1, {
        method: 'alchemy_getTokenBalances',
        params: ['0x0000000000000000000000000000000000000003', 'erc20'],
      });
    });

    it('reuses cached token metadata without another metadata request', async () => {
      const provider = {
        request: jest
          .fn()
          .mockResolvedValueOnce({
            tokenBalances: [
              {
                contractAddress: '0x0000000000000000000000000000000000000001',
                tokenBalance: '0x10',
              },
            ],
          })
          .mockResolvedValueOnce({
            decimals: 6,
            logo: 'https://logo.example/usdc.png',
            name: 'USD Coin',
            symbol: 'USDC',
          })
          .mockResolvedValueOnce({
            tokenBalances: [
              {
                contractAddress: '0x0000000000000000000000000000000000000001',
                tokenBalance: '0x20',
              },
            ],
          }),
      };
      const metadataCache = new Map();
      const options = {
        ownerAddress: '0x0000000000000000000000000000000000000003' as const,
        provider,
        metadataCache,
      };

      await fetchAlchemyTokensForOwner(options);
      await fetchAlchemyTokensForOwner(options);

      expect(provider.request).toHaveBeenCalledTimes(3);
      expect(provider.request).toHaveBeenLastCalledWith({
        method: 'alchemy_getTokenBalances',
        params: [options.ownerAddress, 'erc20'],
      });
    });
  });

  describe('fetchAlchemyNftsForOwner', () => {
    it('loads NFT metadata through the Alchemy NFT endpoint', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ownedNfts: [
            {
              contract: {
                address: '0x0000000000000000000000000000000000000004',
                tokenType: 'ERC721',
              },
              image: {
                cachedUrl: 'https://nft.example/image.png',
              },
              name: 'Example NFT',
              tokenId: '1',
            },
          ],
        }),
      } as Response);

      const result = await fetchAlchemyNftsForOwner({
        ownerAddress: '0x0000000000000000000000000000000000000003',
        rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test-key',
      });

      expect(result).toStrictEqual([
        {
          tokenAddress: '0x0000000000000000000000000000000000000004',
          tokenId: '1',
          nftMetadata: {
            image: 'https://nft.example/image.png',
            name: 'Example NFT',
            standard: 'ERC721',
          },
        },
      ]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'https://eth-sepolia.g.alchemy.com/nft/v3/test-key/getNFTsForOwner',
        ),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('does not make a request for non-Alchemy RPC endpoints', async () => {
      global.fetch = jest.fn();

      await expect(
        fetchAlchemyNftsForOwner({
          ownerAddress: '0x0000000000000000000000000000000000000003',
          rpcUrl: 'https://example.com/rpc',
        }),
      ).resolves.toStrictEqual([]);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
