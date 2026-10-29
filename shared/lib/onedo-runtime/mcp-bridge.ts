import type { Hex } from 'viem';

/**
 * Narrow bridge contract for a Runtime MCP client. Implementations must route
 * signing and transaction methods through the normal Wallet confirmation flow.
 */
export type OneDoRuntimeMcpBridge = {
  getAccounts(): Promise<readonly `0x${string}`[]>;
  getChainId(): Promise<number>;
  call(to: `0x${string}`, data: Hex): Promise<Hex>;
  signTypedData(
    address: `0x${string}`,
    typedData: Record<string, unknown>,
  ): Promise<Hex>;
  sendTransaction(transaction: {
    from: `0x${string}`;
    to: `0x${string}`;
    data?: Hex;
    value?: Hex;
  }): Promise<Hex>;
  signErc7702Authorization(authorization: {
    chainId: number;
    address: `0x${string}`;
    nonce: bigint;
  }): Promise<Record<string, unknown>>;
  requestErc7702Activation(params: {
    address: `0x${string}`;
    implementation: `0x${string}`;
    chainId: number;
  }): Promise<unknown>;
};

export const createEip1193RuntimeMcpBridge = (provider: {
  request(args: {
    method: string;
    params?: readonly unknown[];
  }): Promise<unknown>;
  requestErc7702Activation?: (params: {
    address: `0x${string}`;
    implementation: `0x${string}`;
    chainId: number;
  }) => Promise<unknown>;
}): OneDoRuntimeMcpBridge => ({
  async getAccounts() {
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (!Array.isArray(accounts)) {
      throw new Error('invalid wallet accounts');
    }
    return accounts as readonly `0x${string}`[];
  },
  async getChainId() {
    const chainId = await provider.request({ method: 'eth_chainId' });
    if (typeof chainId !== 'string') {
      throw new Error('invalid wallet chain id');
    }
    return Number.parseInt(chainId, 16);
  },
  async call(to, data) {
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    });
    if (typeof result !== 'string') {
      throw new Error('invalid wallet call result');
    }
    return result as Hex;
  },
  async signTypedData(address, typedData) {
    const signature = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [
        address,
        JSON.stringify(typedData, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      ],
    });
    if (typeof signature !== 'string') {
      throw new Error('invalid typed-data signature');
    }
    return signature as Hex;
  },
  async sendTransaction(transaction) {
    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [transaction],
    });
    if (typeof hash !== 'string') {
      throw new Error('invalid transaction hash');
    }
    return hash as Hex;
  },
  async signErc7702Authorization(authorization) {
    let result: unknown;
    try {
      result = await provider.request({
        method: 'eth_signAuthorization',
        params: [
          {
            chainId: `0x${authorization.chainId.toString(16)}`,
            address: authorization.address,
            nonce: `0x${authorization.nonce.toString(16)}`,
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (
        message.includes('unsupported') ||
        message.includes('not found') ||
        message.includes('method')
      ) {
        throw new Error('runtime_mcp_erc7702_unsupported');
      }
      throw error;
    }
    if (!result || typeof result !== 'object') {
      throw new Error('invalid ERC-7702 authorization');
    }
    return result as Record<string, unknown>;
  },
  async requestErc7702Activation(params) {
    if (!provider.requestErc7702Activation) {
      throw new Error('runtime_mcp_erc7702_activation_unavailable');
    }
    return provider.requestErc7702Activation(params);
  },
});
