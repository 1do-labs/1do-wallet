import type { OneDoRuntimeMcpController } from './onedo-runtime-mcp';

type NativePort = {
  onMessage: { addListener(listener: (message: unknown) => void): void };
  onDisconnect: { addListener(listener: () => void): void };
  postMessage(message: unknown): void;
};

type NativeRequest = {
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
};

const responseError = (id: string | undefined, error: unknown) => ({
  id,
  error: error instanceof Error ? error.message : String(error),
});

/** Bridges a localhost Native Messaging host to the existing wallet controller. */
export const connectOneDoRuntimeMcpNativeHost = ({
  controller,
  runtime = globalThis.chrome?.runtime,
}: {
  controller: OneDoRuntimeMcpController;
  runtime?: { connectNative(name: string): NativePort };
}) => {
  if (!runtime?.connectNative) throw new Error('native_messaging_unavailable');
  const port = runtime.connectNative('com.1do.wallet.mcp');
  port.onMessage.addListener((raw) => {
    const request = raw as NativeRequest;
    const id = typeof request.id === 'string' ? request.id : undefined;
    const params = request.params ?? {};
    let operation: Promise<unknown>;
    try {
      switch (request.method) {
        case 'wallet.get_account':
          operation = controller.getAccounts();
          break;
        case 'wallet.get_chain':
          operation = controller.getChainId();
          break;
        case 'wallet.call':
          operation = controller.call(params.to as `0x${string}`, params.data as `0x${string}`);
          break;
        case 'wallet.sign_typed_data':
          operation = controller.signTypedData(params.address as `0x${string}`, params.typedData as Record<string, unknown>);
          break;
        case 'wallet.send_transaction':
          operation = controller.sendTransaction(params as never);
          break;
        case 'wallet.sign_7702_authorization':
          operation = controller.signErc7702Authorization(params.address as `0x${string}`, params.authorization as never);
          break;
        case 'wallet.request_7702_activation':
          operation = controller.requestErc7702Activation(params as never);
          break;
        default:
          operation = Promise.reject(new Error('wallet_method_not_allowed'));
      }
    } catch (error) {
      operation = Promise.reject(error);
    }
    operation.then((result) => port.postMessage({ id, result }), (error) => port.postMessage(responseError(id, error)));
  });
  return port;
};
