import {
  OneDoRuntimeMcpController,
  controllerName,
} from '../controllers/onedo-runtime-mcp';
import type { BaseControllerMessenger } from './types';

type Provider = {
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

type RuntimeMcpActionHandler = (...args: never[]) => unknown;

/**
 * Register the stateless Runtime MCP actions on the background messenger.
 * @param options - Initialization options.
 * @param options.controllerMessenger - Background controller messenger.
 * @param options.provider - Current network provider adapter.
 */
export const OneDoRuntimeMcpInit = ({
  controllerMessenger,
  provider,
}: {
  controllerMessenger: BaseControllerMessenger;
  provider: Provider;
}) => {
  const controller = new OneDoRuntimeMcpController({ provider });
  // These actions are intentionally local to the Runtime MCP bridge. The
  // generated root messenger action union does not include this optional
  // integration yet, so registration is kept at this narrow boundary.
  const register = (name: string, handler: RuntimeMcpActionHandler) =>
    controllerMessenger.registerActionHandler(name as never, handler as never);
  register(
    `${controllerName}:getAccounts`,
    controller.getAccounts.bind(controller),
  );
  register(
    `${controllerName}:getChainId`,
    controller.getChainId.bind(controller),
  );
  register(`${controllerName}:call`, controller.call.bind(controller));
  register(
    `${controllerName}:signTypedData`,
    controller.signTypedData.bind(controller),
  );
  register(
    `${controllerName}:sendTransaction`,
    controller.sendTransaction.bind(controller),
  );
  register(
    `${controllerName}:signErc7702Authorization`,
    controller.signErc7702Authorization.bind(controller),
  );
  register(
    `${controllerName}:requestErc7702Activation`,
    controller.requestErc7702Activation.bind(controller),
  );
  return controller;
};
