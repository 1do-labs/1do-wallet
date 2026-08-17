import { BaseController } from '@metamask/base-controller';
import type { Hex } from '@metamask/utils';
import type { TokenDetectionControllerMessenger } from '../messenger-client-init/messengers';

const CONTROLLER_NAME = 'TokenDetectionController' as const;
// Detection consumes the token-list cache and does not make network calls.
// Keep a low-frequency fallback for callers that do not emit state changes.
const POLL_INTERVAL = 10 * 60 * 1000;

type PollingInput = { chainIds: Hex[] };

/**
 * Detects tokens from the Alchemy-backed TokenListController cache and adds
 * them to TokensController. The token-list cache contains only assets with a
 * non-zero balance for the selected account, so a second hosted accounts API
 * or balance scan is unnecessary.
 */
export class AlchemyTokenDetectionController extends BaseController<
  typeof CONTROLLER_NAME,
  Record<string, never>,
  TokenDetectionControllerMessenger
> {
  #disabled: boolean;

  readonly #polling = new Map<
    string,
    { input: PollingInput; timer: NodeJS.Timeout }
  >();

  readonly #useTokenDetection: () => boolean;

  constructor({
    messenger,
    disabled = false,
    useTokenDetection,
  }: {
    messenger: TokenDetectionControllerMessenger;
    disabled?: boolean;
    useTokenDetection: () => boolean;
  }) {
    super({
      name: CONTROLLER_NAME,
      metadata: {},
      messenger,
      state: {},
    });
    this.#disabled = disabled;
    this.#useTokenDetection = useTokenDetection;

    messenger.subscribe('TokenListController:stateChange', () => {
      this.detectTokens().catch(() => undefined);
    });
    messenger.subscribe('TransactionController:transactionConfirmed', (tx) => {
      this.detectTokens({ chainIds: [tx.chainId] }).catch(() => undefined);
    });
  }

  enable(): void {
    this.#disabled = false;
  }

  disable(): void {
    this.#disabled = true;
  }

  /**
   * Start token detection polling for the requested chains.
   *
   * This mirrors the polling API exposed by the core TokenDetectionController
   * so existing UI/background callers can use this Alchemy-backed replacement.
   * @param input
   */
  startPolling(input: PollingInput): string {
    const token = `${Date.now()}:${Math.random()}`;
    const timer = setInterval(() => {
      this.detectTokens(input).catch(() => undefined);
    }, POLL_INTERVAL);
    this.#polling.set(token, { input, timer });
    this.detectTokens(input).catch(() => undefined);
    return token;
  }

  /**
   * Stop a previously started token detection poll.
   * @param token
   */
  stopPollingByPollingToken(token: string): void {
    const polling = this.#polling.get(token);
    if (!polling) {
      return;
    }
    clearInterval(polling.timer);
    this.#polling.delete(token);
  }

  /** Stop all active token detection polls. */
  stopAllPolling(): void {
    for (const token of this.#polling.keys()) {
      this.stopPollingByPollingToken(token);
    }
  }

  destroy(): void {
    this.stopAllPolling();
    super.destroy();
  }

  async detectTokens({
    chainIds,
    selectedAddress,
  }: {
    chainIds?: Hex[];
    selectedAddress?: string;
  } = {}): Promise<void> {
    if (this.#disabled || !this.#useTokenDetection()) {
      return;
    }

    const address =
      selectedAddress ??
      this.messenger.call('AccountsController:getSelectedAccount').address;
    if (!address) {
      return;
    }
    const { tokensChainsCache } = this.messenger.call(
      'TokenListController:getState',
    );
    const targetChainIds =
      chainIds ?? (Object.keys(tokensChainsCache) as Hex[]);
    const { allIgnoredTokens, allTokens } = this.messenger.call(
      'TokensController:getState',
    );

    await Promise.allSettled(
      targetChainIds.map(async (chainId) => {
        const tokenList = tokensChainsCache[chainId]?.data ?? {};
        const existing = new Set(
          (allTokens[chainId]?.[address] ?? []).map((token) =>
            token.address.toLowerCase(),
          ),
        );
        const ignored = new Set(
          (allIgnoredTokens[chainId]?.[address] ?? []).map((token) =>
            token.toLowerCase(),
          ),
        );
        const tokens = Object.values(tokenList)
          .filter(
            ({ address: tokenAddress }) =>
              !existing.has(tokenAddress.toLowerCase()) &&
              !ignored.has(tokenAddress.toLowerCase()),
          )
          .map((token) => ({
            address: token.address,
            aggregators: token.aggregators,
            decimals: token.decimals,
            image: token.iconUrl,
            name: token.name,
            symbol: token.symbol,
          }));
        if (tokens.length === 0) {
          return;
        }
        const networkClientId = this.messenger.call(
          'NetworkController:findNetworkClientIdByChainId',
          chainId,
        );
        await this.messenger.call(
          'TokensController:addTokens',
          tokens,
          networkClientId,
        );
      }),
    );
  }
}
