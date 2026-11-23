import { connectOneDoRuntimeMcpNativeHost } from './onedo-runtime-mcp-native';

describe('OneDo Runtime MCP native host bridge', () => {
  it('routes allowed requests to the wallet controller', async () => {
    const messages: unknown[] = [];
    let listener: ((message: unknown) => void) | undefined;
    const port = {
      onMessage: { addListener: (next: (message: unknown) => void) => { listener = next; } },
      onDisconnect: { addListener: jest.fn() },
      postMessage: (message: unknown) => messages.push(message),
    };
    const controller = {
      getAccounts: jest.fn().mockResolvedValue(['0x1111111111111111111111111111111111111111']),
      getChainId: jest.fn().mockResolvedValue(11155111),
      call: jest.fn(),
      signTypedData: jest.fn(),
      sendTransaction: jest.fn(),
      signErc7702Authorization: jest.fn(),
      requestErc7702Activation: jest.fn(),
    };
    connectOneDoRuntimeMcpNativeHost({
      controller: controller as never,
      runtime: { connectNative: jest.fn().mockReturnValue(port) },
    });
    listener?.({ id: '1', method: 'wallet.get_chain' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(messages).toEqual([{ id: '1', result: 11155111 }]);
  });

  it('rejects methods outside the wallet surface', async () => {
    const messages: unknown[] = [];
    let listener: ((message: unknown) => void) | undefined;
    const port = {
      onMessage: { addListener: (next: (message: unknown) => void) => { listener = next; } },
      onDisconnect: { addListener: jest.fn() },
      postMessage: (message: unknown) => messages.push(message),
    };
    connectOneDoRuntimeMcpNativeHost({
      controller: {} as never,
      runtime: { connectNative: jest.fn().mockReturnValue(port) },
    });
    listener?.({ id: '2', method: 'wallet.export_private_key' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(messages).toEqual([{ id: '2', error: 'wallet_method_not_allowed' }]);
  });
});
