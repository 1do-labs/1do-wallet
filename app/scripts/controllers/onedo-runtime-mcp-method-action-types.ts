/**
 * Messenger action contracts for the stateless Runtime MCP bridge.
 * Keep these actions narrow so callers cannot obtain keyring access.
 */
import type { OneDoRuntimeMcpController } from './onedo-runtime-mcp';

export type OneDoRuntimeMcpControllerGetAccountsAction = {
  type: 'OneDoRuntimeMcpController:getAccounts';
  handler: OneDoRuntimeMcpController['getAccounts'];
};

export type OneDoRuntimeMcpControllerGetChainIdAction = {
  type: 'OneDoRuntimeMcpController:getChainId';
  handler: OneDoRuntimeMcpController['getChainId'];
};

export type OneDoRuntimeMcpControllerCallAction = {
  type: 'OneDoRuntimeMcpController:call';
  handler: OneDoRuntimeMcpController['call'];
};

export type OneDoRuntimeMcpControllerSignTypedDataAction = {
  type: 'OneDoRuntimeMcpController:signTypedData';
  handler: OneDoRuntimeMcpController['signTypedData'];
};

export type OneDoRuntimeMcpControllerSendTransactionAction = {
  type: 'OneDoRuntimeMcpController:sendTransaction';
  handler: OneDoRuntimeMcpController['sendTransaction'];
};

export type OneDoRuntimeMcpControllerSignErc7702AuthorizationAction = {
  type: 'OneDoRuntimeMcpController:signErc7702Authorization';
  handler: OneDoRuntimeMcpController['signErc7702Authorization'];
};

export type OneDoRuntimeMcpControllerRequestErc7702ActivationAction = {
  type: 'OneDoRuntimeMcpController:requestErc7702Activation';
  handler: OneDoRuntimeMcpController['requestErc7702Activation'];
};

export type OneDoRuntimeMcpControllerMethodActions =
  | OneDoRuntimeMcpControllerGetAccountsAction
  | OneDoRuntimeMcpControllerGetChainIdAction
  | OneDoRuntimeMcpControllerCallAction
  | OneDoRuntimeMcpControllerSignTypedDataAction
  | OneDoRuntimeMcpControllerSendTransactionAction
  | OneDoRuntimeMcpControllerSignErc7702AuthorizationAction
  | OneDoRuntimeMcpControllerRequestErc7702ActivationAction;
