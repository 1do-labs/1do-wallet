import type {
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import requestEthereumAccounts from './request-accounts';

const baseRequest = {
  jsonrpc: '2.0' as const,
  id: 0,
  method: 'eth_requestAccounts',
  networkClientId: 'mainnet',
  origin: 'http://test.com',
  params: [],
};

const createMockedHandler = () => {
  const next = jest.fn();
  const end = jest.fn();
  const getAccounts = jest.fn().mockReturnValue([]);
  const getCaip25PermissionFromLegacyPermissionsForOrigin = jest
    .fn()
    .mockResolvedValue({});
  const requestPermissionsForOrigin = jest.fn().mockReturnValue({});
  const response: PendingJsonRpcResponse<string[]> = {
    jsonrpc: '2.0' as const,
    id: 0,
    result: undefined,
  };
  const handler = (
    request: JsonRpcRequest<JsonRpcParams> & { origin: string },
  ) =>
    requestEthereumAccounts.implementation(request, response, next, end, {
      getAccounts,
      getCaip25PermissionFromLegacyPermissionsForOrigin,
      requestPermissionsForOrigin,
    });

  return {
    response,
    next,
    end,
    getAccounts,
    getCaip25PermissionFromLegacyPermissionsForOrigin,
    requestPermissionsForOrigin,
    handler,
  };
};

describe('requestEthereumAccountsHandler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('checks if there are any eip155 accounts permissioned', async () => {
    const { handler, getAccounts } = createMockedHandler();

    await handler(baseRequest);
    expect(getAccounts).toHaveBeenCalled();
  });

  describe('eip155 account permissions exist', () => {
    it('returns the accounts', async () => {
      const { handler, response, getAccounts } = createMockedHandler();
      getAccounts.mockReturnValue(['0xdead', '0xbeef']);

      await handler(baseRequest);
      expect(response.result).toStrictEqual(['0xdead', '0xbeef']);
    });
  });

  describe('eip155 account permissions do not exist', () => {
    it('gets the CAIP-25 permission object to request approval for', async () => {
      const { handler, getCaip25PermissionFromLegacyPermissionsForOrigin } =
        createMockedHandler();

      await handler({ ...baseRequest, origin: 'http://test.com' });
      expect(
        getCaip25PermissionFromLegacyPermissionsForOrigin,
      ).toHaveBeenCalledWith();
    });

    it('throws an error if the CAIP-25 approval is rejected', async () => {
      const { handler, requestPermissionsForOrigin, end } =
        createMockedHandler();
      requestPermissionsForOrigin.mockRejectedValue(
        new Error('approval rejected'),
      );

      await handler(baseRequest);
      expect(end).toHaveBeenCalledWith(new Error('approval rejected'));
    });

    it('grants the CAIP-25 approval', async () => {
      const {
        handler,
        getCaip25PermissionFromLegacyPermissionsForOrigin,
        requestPermissionsForOrigin,
      } = createMockedHandler();

      getCaip25PermissionFromLegacyPermissionsForOrigin.mockReturnValue({
        foo: 'bar',
      });

      await handler({ ...baseRequest, origin: 'http://test.com' });
      expect(requestPermissionsForOrigin).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('returns the newly granted and properly ordered eth accounts', async () => {
      const { handler, getAccounts, response } = createMockedHandler();
      getAccounts
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['0xdead', '0xbeef']);

      await handler(baseRequest);
      expect(response.result).toStrictEqual(['0xdead', '0xbeef']);
      expect(getAccounts).toHaveBeenCalledTimes(2);
    });
  });
});
