import React from 'react';
import { CaipAccountId } from '@metamask/utils';
import { fireEvent, waitFor } from '@testing-library/react';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import mockState from '../../../../test/data/mock-state.json';
import configureStore from '../../../store/store';
import { MergedInternalAccount } from '../../../selectors/selectors.types';
import { createMockInternalAccount } from '../../../../test/jest/mocks';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import { EditAccountsModal } from '.';

const mockKeyringId = '01JKAF3DSGM3AB87EM9N0K41AJ';

const goToAddNewAccount = (
  getByTestId: (testId: string) => HTMLElement,
  accountType: 'evm',
) => {
  const addNewAccountButton = getByTestId('add-new-account-button');
  fireEvent.click(addNewAccountButton);

  const addEvmAccountButton = getByTestId(
    'multichain-account-menu-popover-add-account',
  );
  fireEvent.click(addEvmAccountButton);
};

const mockNewAccount = createMockInternalAccount({
  name: 'Account 2',
});

const mockAddNewAccount = jest.fn();
jest.mock('../../../store/actions.ts', () => ({
  ...jest.requireActual('../../../store/actions.ts'),
  addNewAccount: (keyringId: string) => {
    mockAddNewAccount(keyringId);
    return Promise.resolve(mockNewAccount);
  },
  setAccountLabel: jest.fn(),
}));

const getCaipAccountId = (account: InternalAccount): CaipAccountId => {
  const [scope] = account.scopes;
  return `${scope}:${account.address}`;
};

const render = (
  props: {
    onSubmit: (addresses: string[]) => void;
    onClose: () => void;
  } = {
    onSubmit: jest.fn(),
    onClose: jest.fn(),
  },
  state = {},
) => {
  const store = configureStore({
    ...mockState,
    metamask: {
      ...mockState.metamask,
      ...state,
      permissionHistory: {
        'https://test.dapp': {
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          eth_accounts: {
            accounts: {
              '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': 1709225290848,
            },
          },
        },
      },
    },
    activeTab: {
      origin: 'https://test.dapp',
    },
  });

  const accounts = Object.values(
    mockState.metamask.internalAccounts.accounts,
  ) as unknown as MergedInternalAccount[];

  const accountsWithCaipAccountId = accounts.map((account) => {
    return {
      ...account,
      caipAccountId: `${account.scopes[0]}:${account.address}` as CaipAccountId,
    };
  });

  return renderWithProvider(
    <EditAccountsModal
      accounts={accountsWithCaipAccountId}
      defaultSelectedAccountAddresses={[
        accountsWithCaipAccountId[0].caipAccountId,
      ]}
      {...props}
    />,
    store,
  );
};
describe('EditAccountsModal', () => {
  it('should render correctly', () => {
    const { container } = render();
    expect(container).toMatchSnapshot();
  });

  it('shows select all button', async () => {
    const { getByLabelText } = render();
    expect(getByLabelText(messages.selectAll.message)).toBeInTheDocument();
  });

  it('calls onSubmit with the selected account addresses when the connect button is clicked', async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render({
      onSubmit,
      onClose: jest.fn(),
    });
    fireEvent.click(getByTestId('connect-more-accounts-button'));
    expect(onSubmit).toHaveBeenCalledWith([
      'eip155:0:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    ]);
  });

  it('calls onClose when the connect button is clicked', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render({
      onSubmit: jest.fn(),
      onClose,
    });
    fireEvent.click(getByTestId('connect-more-accounts-button'));
    expect(onClose).toHaveBeenCalledWith();
  });

  it('shows the disconnect text button when nothing is selected', () => {
    const { getByLabelText, getByTestId } = render();
    fireEvent.click(getByLabelText(messages.selectAll.message));
    fireEvent.click(getByLabelText(messages.selectAll.message));
    expect(getByTestId('disconnect-accounts-button')).toHaveTextContent(
      'Disconnect',
    );
  });

  describe('adding accounts', () => {
    it('shows the evm account option', () => {
      const { getByTestId } = render();

      const addNewAccountButton = getByTestId('add-new-account-button');
      fireEvent.click(addNewAccountButton);

      expect(
        getByTestId('multichain-account-menu-popover-add-account'),
      ).toBeInTheDocument();
    });

    it('adds a new evm account', async () => {
      const { getByTestId } = render();
      goToAddNewAccount(getByTestId, 'evm');

      await waitFor(() =>
        expect(getByTestId('account-name-input')).toBeInTheDocument(),
      );

      const addAccountButton = getByTestId('submit-add-account-with-name');
      fireEvent.click(addAccountButton);

      await waitFor(() =>
        expect(mockAddNewAccount).toHaveBeenCalledWith(mockKeyringId),
      );
    });
    it('shows the srp list when the srp button is clicked', async () => {
      const hdAccount = createMockInternalAccount({
        address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      });
      const hdAccount2 = createMockInternalAccount({
        address: '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      });

      const hdKeyring = {
        type: KeyringTypes.hd,
        accounts: [hdAccount.address],
        metadata: {
          id: '01JKAF3DSGM3AB87EM9N0K41AJ',
          name: '',
        },
      };
      const hdKeyring2 = {
        type: KeyringTypes.hd,
        accounts: [hdAccount2.address],
        metadata: {
          id: '01JKAF3DSGM3AB87EM9N0K4444',
          name: '',
        },
      };

      const { getByTestId } = render(undefined, {
        internalAccounts: {
          accounts: {
            [hdAccount.id]: hdAccount,
            [hdAccount2.id]: hdAccount2,
          },
          selectedAccount: hdAccount.id,
        },
        keyrings: [hdKeyring, hdKeyring2],
      });
      goToAddNewAccount(getByTestId, 'evm');

      const srpButton = getByTestId('select-srp-Secret Recovery Phrase 1');
      fireEvent.click(srpButton);

      expect(getByTestId('srp-list')).toBeInTheDocument();
    });
  });

  it('selects the new CAIP account ID of the account when it is created', async () => {
    const caipAccountIdOfOriginalAccount = getCaipAccountId(
      mockState.metamask.internalAccounts.accounts[
        'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3'
      ] as InternalAccount,
    );
    const expectedNewCaipAccountId = getCaipAccountId(mockNewAccount);
    const mockOnSubmit = jest.fn();
    const { getByTestId } = render({
      onSubmit: mockOnSubmit,
      onClose: jest.fn(),
    });
    goToAddNewAccount(getByTestId, 'evm');

    await waitFor(() =>
      expect(getByTestId('account-name-input')).toBeInTheDocument(),
    );

    const addAccountButton = getByTestId('submit-add-account-with-name');
    fireEvent.click(addAccountButton);

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith([
        caipAccountIdOfOriginalAccount,
        expectedNewCaipAccountId,
      ]),
    );
  });
});
