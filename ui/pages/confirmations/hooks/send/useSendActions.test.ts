import { TransactionMeta } from '@metamask/transaction-controller';
import { waitFor } from '@testing-library/react';

import mockState from '../../../../../test/data/mock-state.json';
import { EVM_ASSET } from '../../../../../test/data/send/assets';
import { renderHookWithProvider } from '../../../../../test/lib/render-helpers-navigate';
import * as SendUtils from '../../utils/send';
import * as SendContext from '../../context/send';
import { useSendActions } from './useSendActions';

const MOCK_ADDRESS_1 = '0xdB055877e6c13b6A6B25aBcAA29B393777dD0a73';
const MOCK_ADDRESS_2 = '0xd12662965960f3855a09f85396459429a595d741';
const MOCK_UNSUPPORTED_ADDRESS = 'unsupported-address';
const UNSUPPORTED_ASSET = {
  address: 'unsupported:token',
  chainId: 'unsupported:chain',
  decimals: 6,
  isNative: false,
  symbol: 'UNSUPPORTED',
};

const mockUseNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  return {
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockUseNavigate,
  };
});

beforeEach(() => {
  mockUseNavigate.mockClear();
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => (fn: () => void) => {
    if (fn) {
      fn();
    }
  },
}));

function renderHook() {
  const { result } = renderHookWithProvider(useSendActions, mockState);
  return result.current;
}

describe('useSendQueryParams', () => {
  it('result returns method handleCancel to cancel send', () => {
    const result = renderHook();
    result.handleCancel();
    expect(mockUseNavigate).toHaveBeenCalledWith('/');
  });

  it('result returns method handleBack to goto previous page', () => {
    const result = renderHook();
    result.handleBack();
    expect(mockUseNavigate).toHaveBeenCalledWith(-1);
  });

  it('handleSubmit is able to submit evm send', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_ASSET,
      chainId: '0x5',
      from: MOCK_ADDRESS_1,
      to: MOCK_ADDRESS_2,
      value: 10,
      maxValueMode: true,
      updateNonEVMSubmitError: jest.fn(),
    } as unknown as SendContext.SendContextType);

    const mockSubmitEvmTransaction = jest
      .spyOn(SendUtils, 'submitEvmTransaction')
      .mockImplementation(() =>
        Promise.resolve(() =>
          Promise.resolve({} as unknown as TransactionMeta),
        ),
      );

    const result = renderHook();
    result.handleSubmit();

    expect(mockSubmitEvmTransaction).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith(
        '/confirm-transaction?maxValueMode=true&loader=send',
      );
    });
  });

  it('normalizes trailing dot values before submitting evm transaction', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_ASSET,
      chainId: '0x5',
      from: MOCK_ADDRESS_1,
      to: MOCK_ADDRESS_2,
      value: '0.',
      updateNonEVMSubmitError: jest.fn(),
    } as unknown as SendContext.SendContextType);

    const mockSubmitEvmTransaction = jest
      .spyOn(SendUtils, 'submitEvmTransaction')
      .mockImplementation(() =>
        Promise.resolve(() =>
          Promise.resolve({} as unknown as TransactionMeta),
        ),
      );

    const result = renderHook();
    result.handleSubmit();

    expect(mockSubmitEvmTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ value: '0' }),
    );
  });

  it('handleSubmit blocks non-evm send when remote transaction support is disabled', async () => {
    const mockUpdateNonEVMSubmitError = jest.fn();
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: UNSUPPORTED_ASSET,
      from: MOCK_UNSUPPORTED_ADDRESS,
      to: MOCK_UNSUPPORTED_ADDRESS,
      value: '10',
      updateNonEVMSubmitError: mockUpdateNonEVMSubmitError,
    } as unknown as SendContext.SendContextType);

    const result = renderHook();
    result.handleSubmit();

    await waitFor(() => {
      expect(mockUpdateNonEVMSubmitError).toHaveBeenCalledWith(
        expect.any(String),
      );
      expect(mockUseNavigate).toHaveBeenCalledWith('/send/loader');
      expect(mockUseNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
