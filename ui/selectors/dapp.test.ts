import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import { getNetworkConfigurationsByChainId } from '../../shared/lib/selectors/networks';
import { getDappActiveNetwork } from './dapp';
import {
  getOrderedConnectedAccountsForActiveTab,
  getOriginOfCurrentTab,
  getAllDomains,
} from './selectors';

// Mocked value for testing purposes only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedValue = any;

// Mock the selectors that the new getDappActiveNetwork uses
jest.mock('./selectors', () => ({
  getOrderedConnectedAccountsForActiveTab: jest.fn(),
  getOriginOfCurrentTab: jest.fn(),
  getAllDomains: jest.fn(),
}));

jest.mock('../../shared/lib/selectors/networks', () => ({
  getNetworkConfigurationsByChainId: jest.fn(),
}));

const mockGetOrderedConnectedAccountsForActiveTab = jest.mocked(
  getOrderedConnectedAccountsForActiveTab,
);
const mockGetOriginOfCurrentTab = jest.mocked(getOriginOfCurrentTab);
const mockGetAllDomains = jest.mocked(getAllDomains);
const mockGetNetworkConfigurationsByChainId = jest.mocked(
  getNetworkConfigurationsByChainId,
);

describe('getDappActiveNetwork selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrigin = 'MOCK_ORIGIN';
  const mockNetworkClientId = '111';
  const mockNetworkConfig: NetworkConfiguration = {
    chainId: '0x1',
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: mockNetworkClientId,
        type: RpcEndpointType.Custom,
        url: '',
      },
    ],
    blockExplorerUrls: [],
    name: '',
    nativeCurrency: '',
  };

  const mockEvmAccount = {
    id: 'eip155:1:0x1234567890123456789012345678901234567890',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    metadata: {
      name: 'Test Account',
      lastSelected: Date.now(),
    },
    scopes: ['eip155:1'],
    methods: [],
    options: {},
  };

  const mockUnsupportedAccount = {
    id: 'unknown:mainnet:0x1234567890123456789012345678901234567890',
    address: '0x1234567890123456789012345678901234567890',
    type: 'unknown:data-account',
    metadata: {
      name: 'Test Unsupported Account',
      lastSelected: Date.now(),
    },
    scopes: ['unknown:mainnet'],
    methods: [],
    options: {},
  };

  const arrangeMocks = () => {
    mockGetOrderedConnectedAccountsForActiveTab.mockReturnValue([
      mockEvmAccount as MockedValue,
    ]);
    mockGetOriginOfCurrentTab.mockReturnValue(mockOrigin);
    mockGetAllDomains.mockReturnValue({
      [mockOrigin]: mockNetworkClientId,
    });
    mockGetNetworkConfigurationsByChainId.mockReturnValue({
      '0x1': mockNetworkConfig,
    });

    return {
      mockOrigin,
      mockNetworkClientId,
      mockGetOrderedConnectedAccountsForActiveTab,
      mockGetOriginOfCurrentTab,
      mockGetAllDomains,
      mockGetNetworkConfigurationsByChainId,
      mockState: {},
    };
  };

  it('returns correct EVM network configuration when all data is available', () => {
    const mocks = arrangeMocks();
    const result = getDappActiveNetwork(mocks.mockState);
    expect(result).toEqual({ ...mockNetworkConfig, isEvm: true });
  });

  it('returns null for unsupported accounts', () => {
    const mocks = arrangeMocks();
    mocks.mockGetOrderedConnectedAccountsForActiveTab.mockReturnValue([
      mockUnsupportedAccount as MockedValue,
    ]);

    const result = getDappActiveNetwork(mocks.mockState);
    expect(result).toBeNull();
  });

  it('returns null when no connected accounts', () => {
    const mocks = arrangeMocks();
    mocks.mockGetOrderedConnectedAccountsForActiveTab.mockReturnValue([]);
    const result = getDappActiveNetwork(mocks.mockState);
    expect(result).toBeNull();
  });

  it('returns null when orderedConnectedAccounts is null', () => {
    const mocks = arrangeMocks();
    mocks.mockGetOrderedConnectedAccountsForActiveTab.mockReturnValue(
      null as MockedValue,
    );
    const result = getDappActiveNetwork(mocks.mockState);
    expect(result).toBeNull();
  });

  it('returns null when no matching EVM network configuration exists', () => {
    const mocks = arrangeMocks();
    mocks.mockGetNetworkConfigurationsByChainId.mockReturnValue({});
    const result = getDappActiveNetwork(mocks.mockState);
    expect(result).toBeNull();
  });

  it('returns null when no active tab origin exists', () => {
    const mocks = arrangeMocks();
    mocks.mockGetOriginOfCurrentTab.mockReturnValue(undefined as MockedValue);

    const result = getDappActiveNetwork(mocks.mockState);
    expect(result).toBeNull();
  });
});
