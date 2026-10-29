import { OneDoRuntimeMcpInit } from './onedo-runtime-mcp-init';

describe('OneDoRuntimeMcpInit', () => {
  it('registers all Runtime MCP actions', async () => {
    const handlers = new Map<string, (...args: never[]) => unknown>();
    const controller = OneDoRuntimeMcpInit({
      controllerMessenger: {
        registerActionHandler: (
          type: string,
          handler: (...args: never[]) => unknown,
        ) => handlers.set(type, handler),
      } as never,
      provider: {
        request: async ({ method }) => (method === 'eth_chainId' ? '0x1' : []),
      },
    });
    expect(handlers.size).toBe(7);
    expect(await handlers.get('OneDoRuntimeMcpController:getChainId')?.()).toBe(
      1,
    );
    expect(controller).toBeDefined();
  });
});
