import type { Hex } from 'viem';
import {
  createEip1193RuntimeMcpBridge,
  type OneDoRuntimeMcpBridge,
} from '../../../shared/lib/onedo-runtime/mcp-bridge';

export const controllerName = 'OneDoRuntimeMcpController' as const;

export type OneDoRuntimeMcpProvider = {
  request(args: {
    method: string;
    params?: readonly unknown[];
  }): Promise<unknown>;
  requestErc7702Activation?: (params: {
    address: `0x${string}`;
    implementation: `0x${string}`;
    chainId: number;
  }) => Promise<unknown>;
};

/**
 * Stateless action service for the Runtime MCP bridge. The injected provider
 * must be the same restricted provider used by the active wallet/network
 * confirmation path; this class never accesses a keyring directly.
 */
export class OneDoRuntimeMcpController {
  readonly #bridge: OneDoRuntimeMcpBridge;

  constructor({ provider }: { provider: OneDoRuntimeMcpProvider }) {
    this.#bridge = createEip1193RuntimeMcpBridge(provider);
  }

  getAccounts() {
    return this.#bridge.getAccounts();
  }

  getChainId() {
    return this.#bridge.getChainId();
  }

  async #assertCurrentAccount(address: `0x${string}`) {
    const accounts = await this.#bridge.getAccounts();
    if (accounts[0]?.toLowerCase() !== address.toLowerCase()) {
      throw new Error('runtime_mcp_account_changed');
    }
  }

  call(to: `0x${string}`, data: Hex) {
    return this.#bridge.call(to, data);
  }

  signTypedData(address: `0x${string}`, typedData: Record<string, unknown>) {
    return this.#assertCurrentAccount(address).then(() =>
      this.#bridge.signTypedData(address, typedData),
    );
  }

  async sendTransaction(
    transaction: Parameters<OneDoRuntimeMcpBridge['sendTransaction']>[0],
  ) {
    await this.#assertCurrentAccount(transaction.from);
    return this.#bridge.sendTransaction(transaction);
  }

  async signErc7702Authorization(
    address: `0x${string}`,
    authorization: Parameters<
      OneDoRuntimeMcpBridge['signErc7702Authorization']
    >[0],
  ) {
    await this.#assertCurrentAccount(address);
    return this.#bridge.signErc7702Authorization(authorization);
  }

  requestErc7702Activation(
    params: Parameters<
      NonNullable<OneDoRuntimeMcpProvider['requestErc7702Activation']>
    >[0],
  ) {
    return this.#assertCurrentAccount(params.address).then(() =>
      this.#bridge.requestErc7702Activation(params),
    );
  }
}
