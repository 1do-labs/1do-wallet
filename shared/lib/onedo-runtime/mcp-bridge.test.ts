import { createEip1193RuntimeMcpBridge } from './mcp-bridge';

describe('Runtime MCP bridge', () => {
  it('maps read, signing, and transaction methods to EIP-1193', async () => {
    const calls: string[] = [];
    const responses = new Map<string, unknown>([
      ['eth_accounts', ['0x1111111111111111111111111111111111111111']],
      ['eth_chainId', '0xaa36a7'],
      ['eth_call', '0x1234'],
      ['eth_signTypedData_v4', '0xsignature'],
      ['eth_sendTransaction', '0xtx'],
      ['eth_signAuthorization', { r: '0x1', s: '0x2', yParity: 0 }],
    ]);
    const bridge = createEip1193RuntimeMcpBridge({
      request: async ({ method }) => {
        calls.push(method);
        return responses.get(method);
      },
    });
    expect(await bridge.getChainId()).toBe(11155111);
    expect(await bridge.getAccounts()).toHaveLength(1);
    expect(
      await bridge.call('0x1111111111111111111111111111111111111111', '0x'),
    ).toBe('0x1234');
    expect(
      await bridge.sendTransaction({
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
      }),
    ).toBe('0xtx');
    await expect(
      bridge.signErc7702Authorization({
        chainId: 11155111,
        address: '0x3333333333333333333333333333333333333333',
        nonce: 2n,
      }),
    ).resolves.toStrictEqual({ r: '0x1', s: '0x2', yParity: 0 });
    expect(calls).toStrictEqual([
      'eth_chainId',
      'eth_accounts',
      'eth_call',
      'eth_sendTransaction',
      'eth_signAuthorization',
    ]);
  });

  it('returns a standard fallback error when ERC-7702 signing is unavailable', async () => {
    const bridge = createEip1193RuntimeMcpBridge({
      request: async ({ method }) => {
        if (method === 'eth_signAuthorization') {
          throw new Error('method not found');
        }
        return [];
      },
    });
    await expect(
      bridge.signErc7702Authorization({
        chainId: 11155111,
        address: '0x3333333333333333333333333333333333333333',
        nonce: 0n,
      }),
    ).rejects.toThrow('runtime_mcp_erc7702_unsupported');
  });
});
