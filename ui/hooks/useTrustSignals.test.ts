import { renderHook } from '@testing-library/react-hooks';
import { NameType } from '@metamask/name-controller';
import {
  useTrustSignal,
  useTrustSignals,
  TrustSignalDisplayState,
  UseTrustSignalRequest,
} from './useTrustSignals';

const VALUE_MOCK = '0x1234567890123456789012345678901234567890';
const VALUE_MOCK_2 = '0x9876543210987654321098765432109876543210';

describe('useTrustSignals', () => {
  it('returns unknown state for a single trust signal request', () => {
    const { result } = renderHook(() =>
      useTrustSignal(VALUE_MOCK, NameType.ETHEREUM_ADDRESS, '0x1'),
    );

    expect(result.current).toStrictEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  it('returns unknown states for multiple trust signal requests', () => {
    const requests: UseTrustSignalRequest[] = [
      {
        value: VALUE_MOCK,
        type: NameType.ETHEREUM_ADDRESS,
        chainId: '0x1',
      },
      {
        value: VALUE_MOCK_2,
        type: NameType.ETHEREUM_ADDRESS,
        chainId: '0x1',
      },
    ];

    const { result } = renderHook(() => useTrustSignals(requests));

    expect(result.current).toStrictEqual([
      {
        state: TrustSignalDisplayState.Unknown,
        label: null,
      },
      {
        state: TrustSignalDisplayState.Unknown,
        label: null,
      },
    ]);
  });

  it('handles an empty requests array', () => {
    const { result } = renderHook(() => useTrustSignals([]));

    expect(result.current).toStrictEqual([]);
  });
});
