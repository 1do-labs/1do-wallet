import React from 'react';
import { waitFor } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { Interface } from '@ethersproject/abi';
import {
  getMockConfirmState,
  getMockConfirmStateForTransaction,
  getMockContractInteractionConfirmState,
} from '../../../../../../../../test/data/confirmations/helper';
import { renderWithConfirmContextProvider } from '../../../../../../../../test/lib/confirmations/render-helpers';
import { enLocale as messages } from '../../../../../../../../test/lib/i18n-helpers';
import { CHAIN_IDS } from '../../../../../../../../shared/constants/network';
import { genUnapprovedContractInteractionConfirmation } from '../../../../../../../../test/data/confirmations/contract-interaction';
import {
  downgradeAccountConfirmation,
  upgradeAccountConfirmationOnly,
} from '../../../../../../../../test/data/confirmations/batch-transaction';
import { RowAlertKey } from '../../../../../../../components/app/confirm/info/row/constants';
import { Severity } from '../../../../../../../helpers/constants/design-system';
import * as useUserPreferencedCurrencyModule from '../../../../../../../hooks/useUserPreferencedCurrency';
import { RecipientRow, TransactionDetails } from './transaction-details';

const accountRuntimeInterface = new Interface([
  'function enableApp(address app)',
]);

const DNS_STATE = {
  chainId: null,
  domainName: null,
  error: null,
  resolutions: null,
  stage: 'UNINITIALIZED',
  warning: null,
};

const createMockStore = (
  state: Record<string, unknown>,
  middleware = [thunk],
) =>
  configureMockStore(middleware)({
    ...state,
    DNS: DNS_STATE,
  });

jest.mock(
  '../../../../../../../components/app/alert-system/contexts/alertMetricsContext',
  () => ({
    useAlertMetrics: jest.fn(() => ({
      trackAlertMetrics: jest.fn(),
    })),
  }),
);

describe('Transaction Details', () => {
  const middleware = [thunk];

  describe('<TransactionDetails />', () => {
    it('does not render component for transaction details', () => {
      const state = getMockConfirmState();
      const mockStore = createMockStore(state);
      const { container } = renderWithConfirmContextProvider(
        <TransactionDetails />,
        mockStore,
      );
      expect(container).toMatchSnapshot();
    });

    it('renders component for transaction details', () => {
      const state = getMockContractInteractionConfirmState();
      const mockStore = createMockStore(state);
      const { container } = renderWithConfirmContextProvider(
        <TransactionDetails />,
        mockStore,
      );
      expect(container).toMatchSnapshot();
    });

    it('renders 1Do clear signing for direct enableApp calldata', async () => {
      const transaction = genUnapprovedContractInteractionConfirmation({
        address: '0x1111111111111111111111111111111111111111',
        chainId: CHAIN_IDS.SEPOLIA,
      });
      transaction.txParams = {
        ...transaction.txParams,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x1111111111111111111111111111111111111111',
        data: accountRuntimeInterface.encodeFunctionData('enableApp', [
          '0x3C7618FdAb069e8888E5587cA2766497B866afD5',
        ]),
        value: '0x0',
      };

      const state = getMockConfirmStateForTransaction(transaction);
      const mockStore = createMockStore(state);
      const { getByTestId, getByText } = renderWithConfirmContextProvider(
        <TransactionDetails />,
        mockStore,
      );

      await waitFor(() => {
        expect(getByTestId('onedo-clear-signing-section')).toBeInTheDocument();
        expect(getByText('Enable Dex')).toBeInTheDocument();
        expect(getByText('Enable app')).toBeInTheDocument();
      });
    });

    describe('AmountRow', () => {
      describe('should be in the document', () => {
        it('when showAdvancedDetails is true', () => {
          const contractInteraction =
            genUnapprovedContractInteractionConfirmation({
              chainId: CHAIN_IDS.GOERLI,
            });
          const state = getMockConfirmStateForTransaction(contractInteraction, {
            metamask: {
              preferences: {
                showConfirmationAdvancedDetails: true,
              },
            },
          });
          const mockStore = createMockStore(state);
          const { getByTestId } = renderWithConfirmContextProvider(
            <TransactionDetails />,
            mockStore,
          );
          expect(
            getByTestId('transaction-details-amount-row'),
          ).toBeInTheDocument();
        });

        it('when value and simulated native balance mismatch', () => {
          // Transaction value is set to 0x3782dace9d900000 below mock
          const simulationDataMock = {
            tokenBalanceChanges: [],
            nativeBalanceChange: {
              difference: '0x1' as Hex,
              isDecrease: false,
              previousBalance: '0x2' as Hex,
              newBalance: '0x1' as Hex,
            },
          };
          const contractInteraction =
            genUnapprovedContractInteractionConfirmation({
              simulationData: simulationDataMock,
              chainId: CHAIN_IDS.GOERLI,
            });
          const state = getMockConfirmStateForTransaction(contractInteraction, {
            metamask: {
              preferences: {
                // Intentionally setting to false to test the condition
                showConfirmationAdvancedDetails: false,
              },
            },
          });
          const mockStore = createMockStore(state);
          const { getByTestId } = renderWithConfirmContextProvider(
            <TransactionDetails />,
            mockStore,
          );
          expect(
            getByTestId('transaction-details-amount-row'),
          ).toBeInTheDocument();
        });
      });

      it('should not be in the document when value and simulated native balance mismatch is within threshold', () => {
        // Transaction value is set to 0x3782dace9d900000 below mock
        const transactionValueInDecimal = 4000000000000000000;
        const transactionValueInHex = toHex(transactionValueInDecimal);
        const newBalanceInDecimal = 1;
        const newBalanceInHex = toHex(newBalanceInDecimal);
        const previousBalanceInDecimal =
          transactionValueInDecimal + newBalanceInDecimal;
        const previousBalanceInHex = toHex(previousBalanceInDecimal);

        const simulationDataMock = {
          tokenBalanceChanges: [],
          nativeBalanceChange: {
            difference: transactionValueInHex,
            isDecrease: true,
            previousBalance: previousBalanceInHex,
            newBalance: newBalanceInHex,
          },
        };
        const contractInteraction =
          genUnapprovedContractInteractionConfirmation({
            simulationData: simulationDataMock,
            chainId: CHAIN_IDS.GOERLI,
          });
        const state = getMockConfirmStateForTransaction(contractInteraction, {
          metamask: {
            preferences: {
              // Intentionally setting to false to test the condition
              showConfirmationAdvancedDetails: false,
            },
          },
        });
        const mockStore = createMockStore(state);
        const { queryByTestId } = renderWithConfirmContextProvider(
          <TransactionDetails />,
          mockStore,
        );
        expect(
          queryByTestId('transaction-details-amount-row'),
        ).not.toBeInTheDocument();
      });

      it('uses transaction chainId to determine currency symbol', () => {
        const useUserPreferencedCurrencySpy = jest.spyOn(
          useUserPreferencedCurrencyModule,
          'useUserPreferencedCurrency',
        );

        const contractInteraction =
          genUnapprovedContractInteractionConfirmation({
            chainId: CHAIN_IDS.POLYGON,
          });
        const state = getMockConfirmStateForTransaction(contractInteraction, {
          metamask: {
            preferences: {
              showConfirmationAdvancedDetails: true,
            },
          },
        });
        const mockStore = createMockStore(state);
        renderWithConfirmContextProvider(<TransactionDetails />, mockStore);

        // Verify useUserPreferencedCurrency was called with the transaction's chainId
        expect(useUserPreferencedCurrencySpy).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          CHAIN_IDS.POLYGON,
        );

        useUserPreferencedCurrencySpy.mockRestore();
      });

      it('passes chainId to ConfirmInfoRowCurrency for proper formatting', () => {
        const contractInteraction =
          genUnapprovedContractInteractionConfirmation({
            chainId: CHAIN_IDS.POLYGON,
          });
        const state = getMockConfirmStateForTransaction(contractInteraction, {
          metamask: {
            preferences: {
              showConfirmationAdvancedDetails: true,
            },
          },
        });
        const mockStore = createMockStore(state);
        const { getByTestId } = renderWithConfirmContextProvider(
          <TransactionDetails />,
          mockStore,
        );

        const amountRow = getByTestId('transaction-details-amount-row');
        expect(amountRow).toBeInTheDocument();
      });
    });

    it('display network info if there is an alert on that field', () => {
      const contractInteraction =
        genUnapprovedContractInteractionConfirmation();
      const state = {
        ...getMockConfirmStateForTransaction(contractInteraction),
        confirmAlerts: {
          alerts: {
            [contractInteraction.id]: [
              {
                key: 'networkSwitchInfo',
                field: RowAlertKey.Network,
                severity: Severity.Info,
                message: 'dummy message',
                reason: 'dummy reason',
              },
            ],
          },
          confirmed: {},
        },
      };
      const mockStore = createMockStore(state, []);
      const { getByText } = renderWithConfirmContextProvider(
        <TransactionDetails />,
        mockStore,
      );
      expect(getByText(messages.network.message)).toBeInTheDocument();
      expect(getByText(messages.networkNameGoerli.message)).toBeInTheDocument();
    });

    describe('RecipientRow', () => {
      it('renders when address is valid', () => {
        const contractInteraction =
          genUnapprovedContractInteractionConfirmation();
        const state = getMockConfirmStateForTransaction(contractInteraction, {
          metamask: {
            preferences: {
              showConfirmationAdvancedDetails: true,
            },
          },
        });
        const mockStore = createMockStore(state);
        const { getByTestId } = renderWithConfirmContextProvider(
          <TransactionDetails />,
          mockStore,
        );
        expect(
          getByTestId('transaction-details-recipient-row'),
        ).toBeInTheDocument();
      });

      it('does not render when address is invalid', () => {
        const contractInteraction =
          genUnapprovedContractInteractionConfirmation({
            address: '0xinvalid_address',
          });
        const state = getMockConfirmStateForTransaction(contractInteraction, {
          metamask: {
            preferences: {
              showConfirmationAdvancedDetails: true,
            },
          },
        });
        const mockStore = createMockStore(state);
        const { getByTestId } = renderWithConfirmContextProvider(
          <TransactionDetails />,
          mockStore,
        );
        expect(
          getByTestId('transaction-details-recipient-row'),
        ).toBeInTheDocument();
      });
    });

    it('return null for transaction of type revokeDelegation', () => {
      const state = getMockConfirmStateForTransaction(
        downgradeAccountConfirmation,
      );
      const mockStore = createMockStore(state, []);
      const { container } = renderWithConfirmContextProvider(
        <TransactionDetails />,
        mockStore,
      );
      expect(container.firstChild).toBeNull();
    });

    it('return null for transaction of type smart account upgrade transaction if there are no nested transactions', () => {
      const state = getMockConfirmStateForTransaction(
        upgradeAccountConfirmationOnly,
      );
      const mockStore = createMockStore(state, []);
      const { container } = renderWithConfirmContextProvider(
        <TransactionDetails />,
        mockStore,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('<RecipientRow />', () => {
    const useAdvanceDetails = {
      metamask: {
        preferences: {
          showConfirmationAdvancedDetails: true,
        },
      },
    };

    it('does not display SmartContractWithLogo when to and from are not equal or there are no nested transactions', () => {
      const contractInteraction = genUnapprovedContractInteractionConfirmation({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        nestedTransactions: [
          {
            to: '0x1234567890abcdef1234567890abcdef12345678',
            data: '0x1',
          },
        ],
      });
      const state = getMockConfirmStateForTransaction(
        contractInteraction,
        useAdvanceDetails,
      );
      const mockStore = createMockStore(state);
      const { getByTestId } = renderWithConfirmContextProvider(
        <RecipientRow />,
        mockStore,
      );
      expect(
        getByTestId('transaction-details-recipient-row'),
      ).toBeInTheDocument();
      expect(
        getByTestId('transaction-details-recipient-row'),
      ).not.toContainElement(
        document.querySelector('img[src="images/logo/1do-mark.svg"]'),
      );
    });
  });
});
