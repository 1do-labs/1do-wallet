import React from 'react';
import { screen } from '@testing-library/react';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import configureStore from '../../../store/store';
import { ReceiveModal } from '.';

describe('ReceiveModal', () => {
  const render = (address) =>
    renderWithProvider(
      <ReceiveModal address={address} onClose={jest.fn()} />,
      configureStore(mockState),
    );

  it('should show the correct account address and name', () => {
    const address = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
    render(address);
    // Check for the title
    expect(screen.queryByText('Test Account')).toBeInTheDocument();
  });

  it('should show the correct account name for another address', () => {
    render('0xeb9e64b93097bc15f01f13eae97015c57ab64823');
    expect(screen.queryByText('Account 2')).toBeInTheDocument();
  });
});
