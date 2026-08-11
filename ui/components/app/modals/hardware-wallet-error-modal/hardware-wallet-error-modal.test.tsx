import { ErrorCode } from '@metamask/hw-wallet-sdk';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { createHardwareWalletError } from '../../../../contexts/hardware-wallets/errors';
import { HardwareWalletType } from '../../../../contexts/hardware-wallets/types';
import { HardwareWalletErrorModal } from './hardware-wallet-error-modal';

const mockOnClose = jest.fn();

jest.mock('../../../../hooks/useModalProps', () => ({
  useModalProps: () => ({ hideModal: jest.fn(), props: {} }),
}));

jest.mock('../../../../contexts/hardware-wallets', () => ({
  ...jest.requireActual('../../../../contexts/hardware-wallets'),
  useHardwareWalletConfig: () => ({ walletType: HardwareWalletType.Ledger }),
  useHardwareWalletActions: () => ({
    ensureDeviceReady: jest.fn(),
    clearError: jest.fn(),
    setConnectionReady: jest.fn(),
  }),
}));

describe('HardwareWalletErrorModal', () => {
  it('renders recovery guidance for a locked device', () => {
    const error = createHardwareWalletError(
      ErrorCode.AuthenticationDeviceLocked,
      HardwareWalletType.Ledger,
      'Unlock the device',
    );

    render(<HardwareWalletErrorModal error={error} onClose={mockOnClose} />);

    expect(
      screen.getByText('[hardwareWalletErrorTitleDeviceLocked]'),
    ).toBeInTheDocument();
  });

  it('closes when no error is available', () => {
    render(<HardwareWalletErrorModal onClose={mockOnClose} />);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
