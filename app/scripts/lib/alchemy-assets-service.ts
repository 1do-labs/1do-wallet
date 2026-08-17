import type { Hex } from '@metamask/utils';

const TOKEN_METADATA_CONCURRENCY = 25;
const ALCHEMY_RPC_URL_PATTERN =
  /^(https:\/\/[^/]+\.g\.alchemy\.com)\/v2\/([^/?#]+)$/u;

type JsonRpcProvider = {
  request: (request: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

type AlchemyTokenBalance = {
  contractAddress?: Hex;
  tokenBalance?: Hex | null;
};

type AlchemyTokenBalancesResponse = {
  pageKey?: string;
  tokenBalances?: AlchemyTokenBalance[];
};

type AlchemyTokenMetadata = {
  decimals?: number | null;
  logo?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export type AlchemyToken = {
  address: Hex;
  decimals: number;
  iconUrl: string;
  name: string;
  symbol: string;
};

export type AlchemyTokenMetadataCache = Map<string, AlchemyToken>;

type AlchemyOwnedNft = {
  balance?: string;
  contract?: {
    address?: Hex;
    symbol?: string | null;
    tokenType?: string | null;
  };
  description?: string | null;
  image?: {
    cachedUrl?: string | null;
    originalUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  name?: string | null;
  raw?: {
    metadata?: {
      attributes?: unknown[];
      image?: string;
      name?: string;
    } | null;
  };
  tokenId?: string;
  tokenType?: string | null;
};

type AlchemyNftsForOwnerResponse = {
  ownedNfts?: AlchemyOwnedNft[];
  pageKey?: string;
};

export type AlchemyNft = {
  tokenAddress: Hex;
  tokenId: string;
  nftMetadata: {
    attributes?: unknown[];
    description?: string;
    image?: string;
    imageOriginal?: string;
    imageThumbnail?: string;
    name?: string;
    standard?: string;
  };
};

/**
 * Loads the ERC-20 assets with non-zero balances for an account using the
 * configured Alchemy JSON-RPC provider.
 *
 * @param options - Request options.
 * @param options.ownerAddress - Account whose token balances are requested.
 * @param options.provider - Network provider backed by an Alchemy endpoint.
 * @param options.metadataCache
 * @returns Token metadata for assets held by the account.
 */
export async function fetchAlchemyTokensForOwner({
  ownerAddress,
  provider,
  metadataCache,
}: {
  ownerAddress: Hex;
  provider: JsonRpcProvider;
  /** Previously fetched token metadata, keyed by lowercase contract address. */
  metadataCache?: AlchemyTokenMetadataCache;
}): Promise<AlchemyToken[]> {
  const balances = await fetchAllTokenBalances(provider, ownerAddress);
  const addresses = [
    ...new Map(
      balances.flatMap(({ contractAddress, tokenBalance }) => {
        if (!contractAddress || !hasNonZeroBalance(tokenBalance)) {
          return [];
        }
        return [[contractAddress.toLowerCase(), contractAddress] as const];
      }),
    ).values(),
  ];

  const tokens: AlchemyToken[] = [];
  for (
    let index = 0;
    index < addresses.length;
    index += TOKEN_METADATA_CONCURRENCY
  ) {
    const batch = addresses.slice(index, index + TOKEN_METADATA_CONCURRENCY);
    const uncachedAddresses = batch.filter(
      (address) => !metadataCache?.has(address.toLowerCase()),
    );
    const metadataResults = await Promise.allSettled(
      uncachedAddresses.map(async (address) => ({
        address,
        metadata: (await provider.request({
          method: 'alchemy_getTokenMetadata',
          params: [address],
        })) as AlchemyTokenMetadata,
      })),
    );

    for (const result of metadataResults) {
      if (result.status !== 'fulfilled') {
        continue;
      }
      const { address, metadata } = result.value;
      if (
        typeof metadata.decimals !== 'number' ||
        !Number.isInteger(metadata.decimals) ||
        metadata.decimals < 0
      ) {
        continue;
      }
      const token = {
        address,
        decimals: metadata.decimals,
        iconUrl: metadata.logo ?? '',
        name: metadata.name ?? metadata.symbol ?? address,
        symbol: metadata.symbol ?? '',
      } satisfies AlchemyToken;
      metadataCache?.set(address.toLowerCase(), token);
      tokens.push(token);
    }

    for (const address of batch) {
      const cachedToken = metadataCache?.get(address.toLowerCase());
      if (
        cachedToken &&
        !tokens.some(
          (token) => token.address.toLowerCase() === address.toLowerCase(),
        )
      ) {
        tokens.push(cachedToken);
      }
    }
  }

  return tokens;
}

/**
 * Loads all NFTs owned by an account from the Alchemy NFT API associated with
 * the configured JSON-RPC endpoint.
 *
 * @param options - Request options.
 * @param options.ownerAddress - NFT owner address.
 * @param options.rpcUrl - Alchemy JSON-RPC URL for the network.
 * @returns NFTs formatted for the extension NftController.
 */
export async function fetchAlchemyNftsForOwner({
  ownerAddress,
  rpcUrl,
}: {
  ownerAddress: Hex;
  rpcUrl: string;
}): Promise<AlchemyNft[]> {
  const endpoint = getAlchemyNftEndpoint(rpcUrl);
  if (!endpoint) {
    return [];
  }

  const nfts: AlchemyNft[] = [];
  let pageKey: string | undefined;
  do {
    const url = new URL(`${endpoint}/getNFTsForOwner`);
    url.searchParams.set('owner', ownerAddress);
    url.searchParams.set('withMetadata', 'true');
    url.searchParams.set('excludeFilters[]', 'SPAM');
    if (pageKey) {
      url.searchParams.set('pageKey', pageKey);
    }

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Alchemy NFT request failed (${response.status})`);
    }
    const result = (await response.json()) as AlchemyNftsForOwnerResponse;
    nfts.push(...(result.ownedNfts ?? []).flatMap(formatOwnedNft));
    pageKey = result.pageKey;
  } while (pageKey);

  return nfts;
}

function getAlchemyNftEndpoint(rpcUrl: string): string | undefined {
  const match = ALCHEMY_RPC_URL_PATTERN.exec(rpcUrl);
  if (!match) {
    return undefined;
  }
  return `${match[1]}/nft/v3/${match[2]}`;
}

async function fetchAllTokenBalances(
  provider: JsonRpcProvider,
  ownerAddress: Hex,
): Promise<AlchemyTokenBalance[]> {
  const balances: AlchemyTokenBalance[] = [];
  let pageKey: string | undefined;
  do {
    const params: unknown[] = [ownerAddress, 'erc20'];
    if (pageKey) {
      params.push({ pageKey });
    }
    const response = (await provider.request({
      method: 'alchemy_getTokenBalances',
      params,
    })) as AlchemyTokenBalancesResponse;
    balances.push(...(response.tokenBalances ?? []));
    pageKey = response.pageKey;
  } while (pageKey);
  return balances;
}

function hasNonZeroBalance(balance: Hex | null | undefined): boolean {
  if (!balance) {
    return false;
  }
  try {
    return BigInt(balance) > 0n;
  } catch {
    return false;
  }
}

function formatOwnedNft(nft: AlchemyOwnedNft): AlchemyNft[] {
  const tokenAddress = nft.contract?.address;
  const { tokenId } = nft;
  if (!tokenAddress || !tokenId || nft.balance === '0') {
    return [];
  }

  const image = nft.image?.cachedUrl ?? nft.raw?.metadata?.image;
  const standard = nft.tokenType ?? nft.contract?.tokenType;
  return [
    {
      tokenAddress,
      tokenId,
      nftMetadata: {
        ...((nft.name ?? nft.raw?.metadata?.name)
          ? { name: nft.name ?? nft.raw?.metadata?.name }
          : {}),
        ...(nft.description ? { description: nft.description } : {}),
        ...(image ? { image } : {}),
        ...(nft.image?.thumbnailUrl
          ? { imageThumbnail: nft.image.thumbnailUrl }
          : {}),
        ...(nft.image?.originalUrl
          ? { imageOriginal: nft.image.originalUrl }
          : {}),
        ...(standard ? { standard: standard.toUpperCase() } : {}),
        ...(nft.raw?.metadata?.attributes
          ? { attributes: nft.raw.metadata.attributes }
          : {}),
      },
    },
  ];
}
