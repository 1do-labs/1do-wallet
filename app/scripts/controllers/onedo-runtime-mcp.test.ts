import { OneDoRuntimeMcpController } from './onedo-runtime-mcp';

describe('OneDoRuntimeMcpController', () => {
  it('delegates Runtime MCP actions to the injected provider', async () => {
    const methods: string[] = [];
    const controller = new OneDoRuntimeMcpController({
      provider: {
        request: async ({ method }) => {
          methods.push(method);
          if (method === 'eth_accounts') {
            return ['0x1111111111111111111111111111111111111111'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          if (method === 'eth_call') {
            return '0x1234';
          }
          return '0xtx';
        },
      },
    });
    await expect(controller.getAccounts()).resolves.toHaveLength(1);
    await expect(controller.getChainId()).resolves.toBe(11155111);
    await expect(
      controller.call('0x1111111111111111111111111111111111111111', '0x'),
    ).resolves.toBe('0x1234');
    await expect(
      controller.sendTransaction({
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
      }),
    ).resolves.toBe('0xtx');
    expect(methods).toEqual([
      'eth_accounts',
      'eth_chainId',
      'eth_call',
      'eth_accounts',
      'eth_sendTransaction',
    ]);
  });

  it('rejects signing and sending from a non-current account', async () => {
    const controller = new OneDoRuntimeMcpController({
      provider: {
        request: async ({ method }) => {
          if (method === 'eth_accounts') {
            return ['0x1111111111111111111111111111111111111111'];
          }
          return '0x1';
        },
      },
    });
    await expect(
      controller.signTypedData(
        '0x2222222222222222222222222222222222222222',
        {},
      ),
    ).rejects.toThrow('account_changed');
    await expect(
      controller.sendTransaction({
        from: '0x2222222222222222222222222222222222222222',
        to: '0x3333333333333333333333333333333333333333',
      }),
    ).rejects.toThrow('account_changed');
  });

  it('delegates ERC-7702 activation to the wallet confirmation flow', async () => {
    const activate = jest.fn().mockResolvedValue({ transactionHash: '0xtx' });
    const controller = new OneDoRuntimeMcpController({
      provider: {
        request: async ({ method }) =>
          method === 'eth_accounts'
            ? ['0x1111111111111111111111111111111111111111']
            : [],
        requestErc7702Activation: activate,
      },
    });
    await expect(
      controller.requestErc7702Activation({
        address: '0x1111111111111111111111111111111111111111',
        implementation: '0x2222222222222222222222222222222222222222',
        chainId: 11155111,
      }),
    ).resolves.toEqual({ transactionHash: '0xtx' });
    expect(activate).toHaveBeenCalledWith({
      address: '0x1111111111111111111111111111111111111111',
      implementation: '0x2222222222222222222222222222222222222222',
      chainId: 11155111,
    });
  });

  it('returns a fallback when the wallet has no activation confirmation flow', async () => {
    const controller = new OneDoRuntimeMcpController({
      provider: {
        request: async ({ method }) =>
          method === 'eth_accounts'
            ? ['0x1111111111111111111111111111111111111111']
            : [],
      },
    });
    await expect(
      controller.requestErc7702Activation({
        address: '0x1111111111111111111111111111111111111111',
        implementation: '0x2222222222222222222222222222222222222222',
        chainId: 11155111,
      }),
    ).rejects.toThrow('runtime_mcp_erc7702_activation_unavailable');
  });
});
