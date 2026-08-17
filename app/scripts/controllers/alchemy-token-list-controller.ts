import type {
  ControllerStateChangeEvent,
  ControllerGetStateAction,
} from '@metamask/base-controller';
import { BaseController } from '@metamask/base-controller';
import type { TokenListState } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import type { TokenListControllerMessenger } from '../messenger-client-init/messengers';
import {
  fetchAlchemyTokensForOwner,
  type AlchemyTokenMetadataCache,
} from '../lib/alchemy-assets-service';

const CONTROLLER_NAME = 'TokenListController' as const;
// Token discovery is deliberately slower than balance polling. Account
// changes and confirmed transactions still trigger an immediate refresh.
const POLL_INTERVAL = 10 * 60 * 1000;

type PollingInput = { chainId: Hex };

export type AlchemyTokenListControllerMessenger = TokenListControllerMessenger;

export type AlchemyTokenListControllerActions = ControllerGetStateAction<
  typeof CONTROLLER_NAME,
  TokenListState
>;

export type AlchemyTokenListControllerEvents = ControllerStateChangeEvent<
  typeof CONTROLLER_NAME,
  TokenListState
>;

const metadata = {
  tokensChainsCache: {
    includeInDebugSnapshot: false,
    anonymous: true,
    includeInStateLogs: false,
    persist: true,
    usedInUi: true,
  },
};

export function getDefaultAlchemyTokenListState(): TokenListState {
  return { tokensChainsCache: {} };
}

/**
 * Token-list compatible controller backed by Alchemy token-balance and token
 * metadata RPC methods. It intentionally keeps the existing controller name
 * and polling API so TokenDetectionController and the UI remain unchanged.
 */
export class AlchemyTokenListController extends BaseController<
  typeof CONTROLLER_NAME,
  TokenListState,
  AlchemyTokenListControllerMessenger
> {
  readonly #metadataCaches = new Map<string, AlchemyTokenMetadataCache>();

  readonly #inFlight = new Set<string>();

  readonly #polling = new Map<
    string,
    { input: PollingInput; timer: NodeJS.Timeout }
  >();

  constructor({
    messenger,
    state,
  }: {
    messenger: AlchemyTokenListControllerMessenger;
    state?: Partial<TokenListState>;
  }) {
    super({
      name: CONTROLLER_NAME,
      metadata,
      messenger,
      state: { ...getDefaultAlchemyTokenListState(), ...state },
    });
    messenger.subscribe('AccountsController:selectedEvmAccountChange', () => {
      for (const { input } of this.#polling.values()) {
        this.#fetchTokenList(input).catch(() => undefined);
      }
    });
  }

  async initialize(): Promise<void> {
    // State is persisted by ComposableObservableStore; there is no remote cache
    // to hydrate.
  }

  startPolling(input: PollingInput): string {
    const token = `${input.chainId}:${Date.now()}:${Math.random()}`;
    const timer = setInterval(() => {
      this.#fetchTokenList(input).catch(() => undefined);
    }, POLL_INTERVAL);
    this.#polling.set(token, { input, timer });
    this.#fetchTokenList(input).catch(() => undefined);
    return token;
  }

  stopPollingByPollingToken(token: string): void {
    const polling = this.#polling.get(token);
    if (!polling) {
      return;
    }
    clearInterval(polling.timer);
    this.#polling.delete(token);
  }

  stopAllPolling(): void {
    for (const token of this.#polling.keys()) {
      this.stopPollingByPollingToken(token);
    }
  }

  destroy(): void {
    this.stopAllPolling();
    super.destroy();
  }

  async #fetchTokenList({ chainId }: PollingInput): Promise<void> {
    if (this.#inFlight.has(chainId)) {
      return;
    }
    this.#inFlight.add(chainId);

    try {
      const selectedAccount = this.messenger.call(
        'AccountsController:getSelectedAccount',
      );
      const networkClientId = this.messenger.call(
        'NetworkController:findNetworkClientIdByChainId',
        chainId,
      );
      const networkClient = this.messenger.call(
        'NetworkController:getNetworkClientById',
        networkClientId,
      );
      if (!selectedAccount?.address || !networkClient?.provider) {
        return;
      }

      let metadataCache = this.#metadataCaches.get(chainId);
      if (!metadataCache) {
        metadataCache = new Map();
        this.#metadataCaches.set(chainId, metadataCache);
      }

      const tokens = await fetchAlchemyTokensForOwner({
        ownerAddress: selectedAccount.address as Hex,
        provider: networkClient.provider as unknown as Parameters<
          typeof fetchAlchemyTokensForOwner
        >[0]['provider'],
        metadataCache,
      });
      const data = Object.fromEntries(
        tokens.map((token) => [
          token.address,
          {
            address: token.address,
            aggregators: [],
            decimals: token.decimals,
            iconUrl: token.iconUrl,
            name: token.name,
            occurrences: 0,
            symbol: token.symbol,
          },
        ]),
      );
      this.update((state) => {
        state.tokensChainsCache[chainId] = {
          data,
          timestamp: Date.now(),
        };
      });
    } finally {
      this.#inFlight.delete(chainId);
    }
  }
}
