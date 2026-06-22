import { renderHookWithConfirmContextProvider } from '../../../../test/lib/confirmations/render-helpers';
import { getMockTypedSignConfirmStateForRequest } from '../../../../test/data/confirmations/helper';
import { unapprovedTypedSignMsgV4 } from '../../../../test/data/confirmations/typed_sign';
import * as useTransactionEventFragmentHook from '../../confirmations/hooks/useTransactionEventFragment';
import * as useSignatureEventFragmentHook from '../../confirmations/hooks/useSignatureEventFragment';
import { useTrustSignalMetrics } from './useTrustSignalMetrics';

jest.mock('../../confirmations/hooks/useTransactionEventFragment');
jest.mock('../../confirmations/hooks/useSignatureEventFragment');

const mockUpdateTransactionEventFragment = jest.fn();
const mockUpdateSignatureEventFragment = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (
    useTransactionEventFragmentHook.useTransactionEventFragment as jest.Mock
  ).mockReturnValue({
    updateTransactionEventFragment: mockUpdateTransactionEventFragment,
  });
  (
    useSignatureEventFragmentHook.useSignatureEventFragment as jest.Mock
  ).mockReturnValue({
    updateSignatureEventFragment: mockUpdateSignatureEventFragment,
  });
});

describe('useTrustSignalMetrics', () => {
  it('does not update event fragments when trust signal services are disabled', () => {
    const state = getMockTypedSignConfirmStateForRequest({
      ...unapprovedTypedSignMsgV4,
      id: '123',
      chainId: '0x1',
    });

    renderHookWithConfirmContextProvider(() => useTrustSignalMetrics(), state);

    expect(mockUpdateTransactionEventFragment).not.toHaveBeenCalled();
    expect(mockUpdateSignatureEventFragment).not.toHaveBeenCalled();
  });
});
