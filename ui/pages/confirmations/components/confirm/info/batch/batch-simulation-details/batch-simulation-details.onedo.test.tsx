import React from 'react';
import { render } from '@testing-library/react';
import { Interface } from '@ethersproject/abi';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import { useConfirmContext } from '../../../../../context/confirm';
import { SimulationDetails } from '../../../../simulation-details/simulation-details';
import { useBatchApproveBalanceChanges } from '../../hooks/useBatchApproveBalanceChanges';
import { useIsUpgradeTransaction } from '../../hooks/useIsUpgradeTransaction';
import { BatchSimulationDetails } from './batch-simulation-details';

jest.mock('../../../../../context/confirm', () => ({
  useConfirmContext: jest.fn(),
}));

jest.mock('../../../../simulation-details/simulation-details', () => ({
  SimulationDetails: jest.fn(() => null),
}));

jest.mock('../../hooks/useBatchApproveBalanceChanges', () => ({
  useBatchApproveBalanceChanges: jest.fn(),
}));

jest.mock('../../hooks/useIsUpgradeTransaction', () => ({
  useIsUpgradeTransaction: jest.fn(),
}));

jest.mock('../../../../../../../hooks/useI18nContext', () => ({
  useI18nContext: () => (key: string) => key,
}));

const walletNativeTransferInterface = new Interface([
  'function tokenTransferWithSig(address asset, address to, uint256 value, uint256 deadline, bytes signature)',
]);

const accountRuntimeInterface = new Interface([
  'function enableApp(address app)',
  'function disableApp(address app)',
  'function executeRuntimeApp(address app, bytes data)',
  'function executeWithTokenPull(address target, bytes data, address asset, uint256 maxAmount)',
  'function executeWithNftPull(address target, bytes data, address asset, uint256 tokenId)',
]);

const claimData = walletNativeTransferInterface.encodeFunctionData(
  'tokenTransferWithSig',
  [
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    '200000000000000',
    '4102444800',
    `0x${'22'.repeat(65)}`,
  ],
);

const buildTransactionMeta = (data: string) => ({
  chainId: '0xaa36a7',
  id: 'onedo-transaction',
  networkClientId: 'sepolia',
  origin: 'http://localhost:3000',
  status: TransactionStatus.unapproved,
  time: Date.now(),
  type: TransactionType.contractInteraction,
  txParams: {
    from: '0x6666666666666666666666666666666666666666',
    to: '0x1111111111111111111111111111111111111111',
    data,
    value: '0x0',
  },
  simulationData: {
    nativeBalanceChange: {
      difference: '0x1bccdba198e000',
      isDecrease: false,
      newBalance: '0x1bccdba198e000',
      previousBalance: '0x0',
    },
    tokenBalanceChanges: [],
  },
});

describe('BatchSimulationDetails 1Do wallet-native transfers', () => {
  const useConfirmContextMock = jest.mocked(useConfirmContext);
  const useBatchApproveBalanceChangesMock = jest.mocked(
    useBatchApproveBalanceChanges,
  );
  const useIsUpgradeTransactionMock = jest.mocked(useIsUpgradeTransaction);
  const SimulationDetailsMock = jest.mocked(SimulationDetails);

  beforeEach(() => {
    jest.clearAllMocks();
    useBatchApproveBalanceChangesMock.mockReturnValue({
      pending: false,
      value: [],
    });
    useIsUpgradeTransactionMock.mockReturnValue({
      isUpgrade: false,
      isUpgradeOnly: false,
    });
  });

  it('keeps generic simulation details visible for 1Do wallet-native token claims', () => {
    const transactionMeta = buildTransactionMeta(claimData);
    useConfirmContextMock.mockReturnValue({
      currentConfirmation: transactionMeta,
    } as never);

    render(<BatchSimulationDetails />);

    expect(SimulationDetailsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsOnly: false,
        transaction: transactionMeta,
      }),
      expect.anything(),
    );
  });

  (['enableApp', 'disableApp'] as const).forEach((functionName) => {
    it(`keeps generic simulation details visible for 1Do ${functionName} access updates`, () => {
      const transactionMeta = buildTransactionMeta(
        accountRuntimeInterface.encodeFunctionData(functionName, [
          '0x3C7618FdAb069e8888E5587cA2766497B866afD5',
        ]),
      );
      useConfirmContextMock.mockReturnValue({
        currentConfirmation: transactionMeta,
      } as never);

      render(<BatchSimulationDetails />);

      expect(SimulationDetailsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metricsOnly: true,
          transaction: transactionMeta,
        }),
        expect.anything(),
      );
    });
  });

  const runtimeCalls: [string, string][] = [
    [
      'executeRuntimeApp',
      accountRuntimeInterface.encodeFunctionData('executeRuntimeApp', [
        '0x3C7618FdAb069e8888E5587cA2766497B866afD5',
        '0x12345678',
      ]),
    ],
    [
      'executeWithTokenPull',
      accountRuntimeInterface.encodeFunctionData('executeWithTokenPull', [
        '0x3C7618FdAb069e8888E5587cA2766497B866afD5',
        '0x12345678',
        '0x0000000000000000000000000000000000000000',
        '1',
      ]),
    ],
    [
      'executeWithNftPull',
      accountRuntimeInterface.encodeFunctionData('executeWithNftPull', [
        '0x3C7618FdAb069e8888E5587cA2766497B866afD5',
        '0x12345678',
        '0x0000000000000000000000000000000000000000',
        '1',
      ]),
    ],
  ];
  runtimeCalls.forEach(([_name, data]) => {
    it(`keeps generic simulation details visible for 1Do ${_name}`, () => {
      const transactionMeta = buildTransactionMeta(data);
      useConfirmContextMock.mockReturnValue({
        currentConfirmation: transactionMeta,
      } as never);

      render(<BatchSimulationDetails />);

      expect(SimulationDetailsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metricsOnly: false,
          transaction: transactionMeta,
        }),
        expect.anything(),
      );
    });
  });
});
