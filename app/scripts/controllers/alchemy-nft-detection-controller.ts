import { BaseController } from '@metamask/base-controller';
import type { NftController } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import type { NftDetectionControllerMessenger } from '../messenger-client-init/messengers/assets';
import { fetchAlchemyNftsForOwner } from '../lib/alchemy-assets-service';

const CONTROLLER_NAME = 'NftDetectionController' as const;

type NftToAdd = {
  tokenAddress: string;
  tokenId: string;
  nftMetadata: Parameters<NftController['addNfts']>[0][number]['nftMetadata'];
};

type NftState = {
  ignoredNfts?: { address: string; tokenId: string }[];
};

type AddNfts = (
  nfts: NftToAdd[],
  userAddress: string,
  source: Parameters<NftController['addNfts']>[2],
) => Promise<void>;

/**
 * NFT detection controller backed by Alchemy's NFT API instead of MetaMask's
 * hosted NFT indexer. The public method and messenger namespace match the
 * existing controller so existing UI actions remain compatible.
 */
export class AlchemyNftDetectionController extends BaseController<
  typeof CONTROLLER_NAME,
  Record<string, never>,
  NftDetectionControllerMessenger
> {
  #disabled: boolean;

  readonly #addNfts: AddNfts;

  readonly #getNftState: () => NftState;

  constructor({
    messenger,
    disabled = false,
    addNfts,
    getNftState,
  }: {
    messenger: NftDetectionControllerMessenger;
    disabled?: boolean;
    addNfts: AddNfts;
    getNftState: () => NftState;
  }) {
    super({
      name: CONTROLLER_NAME,
      metadata: {},
      messenger,
      state: {},
    });
    this.#disabled = disabled;
    this.#addNfts = addNfts;
    this.#getNftState = getNftState;
    messenger.subscribe(
      'PreferencesController:stateChange',
      ({ useNftDetection }) => {
        this.#disabled = !useNftDetection;
      },
    );
  }

  async detectNfts(
    chainIds: Hex[],
    options?: { userAddress?: string; signal?: AbortSignal },
  ): Promise<void> {
    if (this.#disabled || options?.signal?.aborted || chainIds.length === 0) {
      return;
    }
    const userAddress =
      options?.userAddress ??
      this.messenger.call('AccountsController:getSelectedAccount').address;
    if (!userAddress) {
      return;
    }

    await Promise.allSettled(
      chainIds.map(async (chainId) => {
        const networkClientId = this.messenger.call(
          'NetworkController:findNetworkClientIdByChainId',
          chainId,
        );
        const networkClient = this.messenger.call(
          'NetworkController:getNetworkClientById',
          networkClientId,
        );
        const rpcUrl = getRpcUrl(networkClient?.configuration);
        if (!rpcUrl || options?.signal?.aborted) {
          return;
        }

        const chainIdDecimal = parseInt(chainId, 16);
        const ignored = new Set(
          (this.#getNftState().ignoredNfts ?? []).map(
            ({ address, tokenId }) => `${address.toLowerCase()}:${tokenId}`,
          ),
        );
        const nfts = await fetchAlchemyNftsForOwner({
          ownerAddress: userAddress as Hex,
          rpcUrl,
        });
        const nftsToAdd = nfts
          .filter(
            ({ tokenAddress, tokenId }) =>
              !ignored.has(`${tokenAddress.toLowerCase()}:${tokenId}`),
          )
          .map(({ tokenAddress, tokenId, nftMetadata }) => ({
            tokenAddress,
            tokenId,
            nftMetadata: {
              ...nftMetadata,
              chainId: chainIdDecimal,
            } as NftToAdd['nftMetadata'],
          }));
        if (nftsToAdd.length > 0) {
          await this.#addNfts(
            nftsToAdd,
            userAddress,
            'detected' as Parameters<NftController['addNfts']>[2],
          );
        }
      }),
    );
  }
}

function getRpcUrl(configuration: unknown): string | undefined {
  if (!configuration || typeof configuration !== 'object') {
    return undefined;
  }
  const { rpcUrl } = configuration as { rpcUrl?: unknown };
  return typeof rpcUrl === 'string' ? rpcUrl : undefined;
}
