import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { EthAccountType } from '@metamask/keyring-api';
import {
  AccountGroupType,
  AccountWalletType,
  AccountGroupId,
} from '@metamask/account-api';
import { renderWithProvider } from '../../../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../../../test/lib/i18n-helpers';
import configureStore from '../../../../store/store';
import { createMockInternalAccount } from '../../../../../test/jest/mocks';
import {
  AccountGroupWithInternalAccounts,
  AccountTreeState,
  InternalAccountsState,
} from '../../../../selectors/multichain-accounts/account-tree.types';
import { createMockMultichainAccountsState } from '../../../../selectors/multichain-accounts/test-utils';
import * as assetsSelectors from '../../../../selectors/assets';
import { MultichainEditAccountsPage } from './multichain-edit-accounts-page';

jest.mock('../../../../store/actions', () => ({
  ...jest.requireActual('../../../../store/actions'),
  forceUpdateMetamaskState: jest.fn(),
}));

const MOCK_WALLET_ID = 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ';
const MOCK_GROUP_ID_1 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0' as AccountGroupId;
const MOCK_GROUP_ID_2 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1' as AccountGroupId;
const MOCK_GROUP_ID_3 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/2' as AccountGroupId;

const TEST_IDS = {
  CONNECT_MORE_ACCOUNTS_BUTTON: 'connect-more-accounts-button',
  MULTICHAIN_ACCOUNT_CELL: (groupId: string) =>
    `multichain-account-cell-${groupId}`,
  BACK_BUTTON: 'back-button',
} as const;

const mockEvmAccount1 = createMockInternalAccount({
  id: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
  name: 'EVM Account 1',
  address: '0x1111111111111111111111111111111111111111',
  type: EthAccountType.Eoa,
});

const mockEvmAccount2 = createMockInternalAccount({
  id: '07c2cfec-36c9-46c4-8115-3836d3ac9047',
  name: 'EVM Account 2',
  address: '0x2222222222222222222222222222222222222222',
  type: EthAccountType.Eoa,
});

const mockEvmAccount3 = createMockInternalAccount({
  id: '784225f4-d30b-4e77-a900-c8bbce735b88',
  name: 'EVM Account 3',
  address: '0x3333333333333333333333333333333333333333',
  type: EthAccountType.Eoa,
});

const mockEvmAccount4 = createMockInternalAccount({
  id: '9b6b30a0-3c87-4a33-9d10-a27a2aba2ba2',
  name: 'EVM Account 4',
  address: '0x4444444444444444444444444444444444444444',
  type: EthAccountType.Eoa,
});

const mockEvmAccount5 = createMockInternalAccount({
  id: 'a1b2c3d4-5e6f-7890-abcd-ef1234567890',
  name: 'EVM Account 5',
  address: '0x5555555555555555555555555555555555555555',
  type: EthAccountType.Eoa,
});

const mockEvmAccount6 = createMockInternalAccount({
  id: 'b2c3d4e5-6f78-90ab-cdef-123456789012',
  name: 'EVM Account 6',
  address: '0x6666666666666666666666666666666666666666',
  type: EthAccountType.Eoa,
});

const createMockAccountGroups = (): AccountGroupWithInternalAccounts[] => [
  {
    id: MOCK_GROUP_ID_1,
    type: AccountGroupType.MultichainAccount,
    metadata: {
      name: 'Test Group 1',
      pinned: false,
      hidden: false,
      entropy: {
        groupIndex: 0,
      },
      lastSelected: 0,
    },
    accounts: [
      {
        ...mockEvmAccount1,
        scopes: ['eip155:1'],
      },
      {
        ...mockEvmAccount4,
        scopes: ['eip155:1'],
      },
    ],
    walletName: 'Test Wallet',
    walletId: MOCK_WALLET_ID,
  },
  {
    id: MOCK_GROUP_ID_2,
    type: AccountGroupType.MultichainAccount,
    metadata: {
      name: 'Test Group 2',
      pinned: false,
      hidden: false,
      entropy: {
        groupIndex: 1,
      },
      lastSelected: 0,
    },
    accounts: [
      {
        ...mockEvmAccount2,
        scopes: ['eip155:1'],
      },
      {
        ...mockEvmAccount5,
        scopes: ['eip155:1'],
      },
    ],
    walletName: 'Test Wallet',
    walletId: MOCK_WALLET_ID,
  },
  {
    id: MOCK_GROUP_ID_3,
    type: AccountGroupType.MultichainAccount,
    metadata: {
      name: 'Test Group 3',
      pinned: false,
      hidden: false,
      entropy: {
        groupIndex: 2,
      },
      lastSelected: 0,
    },
    accounts: [
      {
        ...mockEvmAccount3,
        scopes: ['eip155:1'],
      },
      {
        ...mockEvmAccount6,
        scopes: ['eip155:137'],
      },
    ],
    walletName: 'Test Wallet',
    walletId: MOCK_WALLET_ID,
  },
];

const createMockState = (overrides = {}) => {
  const accountTreeState = {
    wallets: {
      [MOCK_WALLET_ID]: {
        id: MOCK_WALLET_ID,
        type: AccountWalletType.Entropy,
        metadata: {
          name: 'Test Wallet',
          entropy: {
            id: '01JKAF3DSGM3AB87EM9N0K41AJ',
          },
        },
        groups: {
          [MOCK_GROUP_ID_1]: {
            id: MOCK_GROUP_ID_1,
            type: AccountGroupType.MultichainAccount,
            metadata: {
              name: 'Test Group 1',
              pinned: false,
              hidden: false,
              entropy: {
                groupIndex: 0,
              },
              lastSelected: 0,
            },
            accounts: [mockEvmAccount1.id, mockEvmAccount3.id],
          },
          [MOCK_GROUP_ID_2]: {
            id: MOCK_GROUP_ID_2,
            type: AccountGroupType.MultichainAccount,
            metadata: {
              name: 'Test Group 2',
              pinned: false,
              hidden: false,
              entropy: {
                groupIndex: 1,
              },
              lastSelected: 0,
            },
            accounts: [mockEvmAccount2.id, mockEvmAccount4.id],
          },
          [MOCK_GROUP_ID_3]: {
            id: MOCK_GROUP_ID_3,
            type: AccountGroupType.MultichainAccount,
            metadata: {
              name: 'Test Group 3',
              pinned: false,
              hidden: false,
              entropy: {
                groupIndex: 2,
              },
              lastSelected: 0,
            },
            accounts: [mockEvmAccount3.id, mockEvmAccount6.id],
          },
        },
      },
    },
  };

  const internalAccountsState = {
    accounts: {
      [mockEvmAccount1.id]: {
        ...mockEvmAccount1,
        scopes: ['eip155:1'],
      },
      [mockEvmAccount2.id]: {
        ...mockEvmAccount2,
        scopes: ['eip155:1'],
      },
      [mockEvmAccount3.id]: {
        ...mockEvmAccount3,
        scopes: ['eip155:1'],
      },
      [mockEvmAccount3.id]: {
        ...mockEvmAccount3,
        scopes: ['eip155:137'],
      },
      [mockEvmAccount4.id]: {
        ...mockEvmAccount4,
        scopes: ['eip155:137'],
      },
      [mockEvmAccount6.id]: {
        ...mockEvmAccount6,
        scopes: ['eip155:137'],
      },
    },
    selectedAccount: mockEvmAccount1.id,
  };

  const mockMultichainState = createMockMultichainAccountsState(
    accountTreeState as unknown as AccountTreeState,
    internalAccountsState as unknown as InternalAccountsState,
    undefined,
    MOCK_GROUP_ID_1,
  );

  return {
    ...mockMultichainState,
    metamask: {
      ...mockMultichainState.metamask,
      keyrings: [],
      defaultHomeActiveTabName: 'activity',
      preferences: {
        ...(
          mockMultichainState.metamask as {
            preferences?: Record<string, unknown>;
          }
        )?.preferences,
        defaultAddressScope: 'eip155',
      },
      ...overrides,
    },
    activeTab: {
      origin: 'https://test-dapp.com',
      protocol: 'https:',
      url: 'https://test-dapp.com',
    },
  };
};

const render = (
  props: {
    supportedAccountGroups?: AccountGroupWithInternalAccounts[];
    defaultSelectedAccountGroups?: AccountGroupId[];
    onSubmit?: (accountGroups: AccountGroupId[]) => void;
    onClose?: () => void;
  } = {},
  state = {},
) => {
  const store = configureStore(createMockState(state));

  const defaultProps = {
    supportedAccountGroups: createMockAccountGroups(),
    defaultSelectedAccountGroups: [MOCK_GROUP_ID_1],
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...props,
  };

  return renderWithProvider(
    <MultichainEditAccountsPage {...defaultProps} />,
    store,
  );
};

describe('MultichainEditAccountsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the balance selector to return empty balances
    jest.spyOn(assetsSelectors, 'selectBalanceForAllWallets').mockReturnValue({
      wallets: {},
      totalBalanceInUserCurrency: 0,
      userCurrency: 'USD',
    } as ReturnType<typeof assetsSelectors.selectBalanceForAllWallets>);
  });

  it('renders modal with correct title', () => {
    const { getByText } = render();
    expect(getByText(messages.editAccounts.message)).toBeInTheDocument();
  });

  it('renders connect button', () => {
    const { getByTestId } = render();
    expect(
      getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON),
    ).toBeInTheDocument();
    expect(
      getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON),
    ).toHaveTextContent('Connect');
  });

  it('renders all account groups', () => {
    const { getByText } = render();
    expect(getByText('Test Group 1')).toBeInTheDocument();
    expect(getByText('Test Group 2')).toBeInTheDocument();
    expect(getByText('Test Group 3')).toBeInTheDocument();
  });

  it('shows selected accounts with visual indication', () => {
    const { getByTestId } = render({
      defaultSelectedAccountGroups: [MOCK_GROUP_ID_1],
    });

    // The selected account should have a border indicating selection
    const selectedAccount = getByTestId(
      TEST_IDS.MULTICHAIN_ACCOUNT_CELL(MOCK_GROUP_ID_1),
    );
    expect(selectedAccount).toBeInTheDocument();
  });

  it('toggles account selection when account is clicked', () => {
    const onSubmit = jest.fn();
    const { getByText, getByTestId } = render({
      defaultSelectedAccountGroups: [MOCK_GROUP_ID_1],
      onSubmit,
    });

    fireEvent.click(getByText('Test Group 2'));
    fireEvent.click(getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON));

    expect(onSubmit).toHaveBeenCalledWith([MOCK_GROUP_ID_1, MOCK_GROUP_ID_2]);
  });

  it('deselects account when already selected account is clicked', () => {
    const onSubmit = jest.fn();
    const { getByText, getByTestId } = render({
      defaultSelectedAccountGroups: [MOCK_GROUP_ID_1, MOCK_GROUP_ID_2],
      onSubmit,
    });

    fireEvent.click(getByText('Test Group 1'));
    fireEvent.click(getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON));

    expect(onSubmit).toHaveBeenCalledWith([MOCK_GROUP_ID_2]);
  });

  it('shows connect button with correct text', () => {
    const { getByTestId } = render({
      defaultSelectedAccountGroups: [MOCK_GROUP_ID_1],
    });

    expect(
      getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON),
    ).toBeInTheDocument();
    expect(
      getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON),
    ).toHaveTextContent('Connect');
  });

  it('calls onSubmit with selected account groups when connect button is clicked', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render({
      defaultSelectedAccountGroups: [MOCK_GROUP_ID_1, MOCK_GROUP_ID_2],
      onSubmit,
    });

    fireEvent.click(getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON));

    expect(onSubmit).toHaveBeenCalledWith([MOCK_GROUP_ID_1, MOCK_GROUP_ID_2]);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    const { getByTestId } = render({ onClose });

    const backButton = getByTestId(TEST_IDS.BACK_BUTTON);
    fireEvent.click(backButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles empty account groups array', () => {
    const { getByText } = render({
      supportedAccountGroups: [],
      defaultSelectedAccountGroups: [],
    });

    expect(getByText(messages.editAccounts.message)).toBeInTheDocument();
  });

  it('updates selected accounts when defaultSelectedAccountGroups prop changes', async () => {
    const { rerender, getByTestId } = render({
      defaultSelectedAccountGroups: [MOCK_GROUP_ID_1],
    });

    // Initially only first account should be selected
    expect(
      getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CELL(MOCK_GROUP_ID_1)),
    ).toBeInTheDocument();

    // Rerender with all accounts selected
    rerender(
      <MultichainEditAccountsPage
        supportedAccountGroups={createMockAccountGroups()}
        defaultSelectedAccountGroups={[
          MOCK_GROUP_ID_1,
          MOCK_GROUP_ID_2,
          MOCK_GROUP_ID_3,
        ]}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CELL(MOCK_GROUP_ID_1)),
      ).toBeInTheDocument();
      expect(
        getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CELL(MOCK_GROUP_ID_2)),
      ).toBeInTheDocument();
      expect(
        getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CELL(MOCK_GROUP_ID_3)),
      ).toBeInTheDocument();
    });
  });

  it('enables button when no accounts are selected', () => {
    const { getByTestId } = render({
      defaultSelectedAccountGroups: [],
    });

    expect(
      getByTestId(TEST_IDS.CONNECT_MORE_ACCOUNTS_BUTTON),
    ).not.toBeDisabled();
  });

  it('always shows the header', () => {
    const { getByTestId } = render();

    expect(getByTestId(TEST_IDS.BACK_BUTTON)).toBeInTheDocument();
  });
});
