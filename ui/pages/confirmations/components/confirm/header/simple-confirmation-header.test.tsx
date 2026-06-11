import React from 'react';
import { DefaultRootState } from 'react-redux';
import { fireEvent } from '@testing-library/react';
import { TransactionType } from '@metamask/transaction-controller';

import { getMockConfirmStateForTransaction } from '../../../../../../test/data/confirmations/helper';
import { genUnapprovedContractInteractionConfirmation } from '../../../../../../test/data/confirmations/contract-interaction';
import { renderWithConfirmContextProvider } from '../../../../../../test/lib/confirmations/render-helpers';
import configureStore from '../../../../../store/store';
import * as ConfirmActions from '../../../hooks/useConfirmActions';
import { SimpleConfirmationHeader } from './simple-confirmation-header';

function genConfirmation(
  type: TransactionType = TransactionType.contractInteraction,
) {
  const base = genUnapprovedContractInteractionConfirmation({
    chainId: '0x1',
  });
  return {
    ...base,
    type,
    origin: 'metamask',
  };
}

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

function render(
  type: TransactionType = TransactionType.contractInteraction,
  state?: DefaultRootState,
) {
  const store = configureStore(
    state ?? getMockConfirmStateForTransaction(genConfirmation(type)),
  );
  return renderWithConfirmContextProvider(<SimpleConfirmationHeader />, store);
}

describe('<SimpleConfirmationHeader />', () => {
  it('renders the back button', () => {
    const { getByTestId } = render();

    expect(
      getByTestId('simple-confirmation-header-back-button'),
    ).toBeInTheDocument();
  });

  it('calls onCancel with navigateBackToPreviousPage when back button is pressed', () => {
    const mockOnCancel = jest.fn();
    jest.spyOn(ConfirmActions, 'useConfirmActions').mockImplementation(() => ({
      onCancel: mockOnCancel,
      resetTransactionState: jest.fn(),
    }));

    const { getByTestId } = render();
    fireEvent.click(getByTestId('simple-confirmation-header-back-button'));

    expect(mockOnCancel).toHaveBeenCalledWith({
      location: 'confirmation',
      navigateBackToPreviousPage: true,
    });
  });

  describe('default type', () => {
    it('renders the "Review" title', () => {
      const { getByTestId } = render(TransactionType.contractInteraction);

      expect(getByTestId('simple-confirmation-header-title')).toHaveTextContent(
        'Review',
      );
    });

    it('renders the advanced details button as endAccessory', () => {
      const { getByTestId } = render(TransactionType.contractInteraction);

      expect(getByTestId('header-advanced-details-button')).toBeInTheDocument();
    });

    it('renders the default end accessory', () => {
      const { getByTestId } = render(TransactionType.contractInteraction);

      expect(getByTestId('header-advanced-details-button')).toBeInTheDocument();
    });
  });
});
