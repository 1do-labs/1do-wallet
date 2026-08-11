import { NameType } from '@metamask/name-controller';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { useDisplayName } from '../../../hooks/useDisplayName';
import { TrustSignalDisplayState } from '../../../hooks/useTrustSignals';
import Name from './name';

jest.mock('../../../hooks/useDisplayName');
jest.mock('./name-details/name-display', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: ({ handleClick }: { handleClick: () => void }) => (
    <button onClick={handleClick}>Account name</button>
  ),
}));
jest.mock('./name-details/name-details', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: () => <div>Name details</div>,
}));

describe('Name', () => {
  beforeEach(() => {
    jest.mocked(useDisplayName).mockReturnValue({
      name: 'Account name',
      hasPetname: true,
      isAccount: false,
      displayState: TrustSignalDisplayState.Petname,
    });
  });

  it('opens name details for a non-account address', () => {
    renderWithProvider(
      <Name
        type={NameType.ETHEREUM_ADDRESS}
        value="0x0000000000000000000000000000000000000001"
        variation="0x1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account name' }));

    expect(screen.getByText('Name details')).toBeInTheDocument();
  });

  it('does not open name details for an account', () => {
    jest.mocked(useDisplayName).mockReturnValue({
      name: 'Account name',
      hasPetname: true,
      isAccount: true,
      displayState: TrustSignalDisplayState.Petname,
    });

    renderWithProvider(
      <Name
        type={NameType.ETHEREUM_ADDRESS}
        value="0x0000000000000000000000000000000000000001"
        variation="0x1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account name' }));

    expect(screen.queryByText('Name details')).not.toBeInTheDocument();
  });
});
