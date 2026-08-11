import { renderHook } from '@testing-library/react-hooks';
import { TrustSignalDisplayState } from './useTrustSignals';
import { useOriginTrustSignals } from './useOriginTrustSignals';

describe('useOriginTrustSignals', () => {
  it('returns unknown because remote trust signals are disabled', () => {
    const { result } = renderHook(() =>
      useOriginTrustSignals('https://example.com'),
    );

    expect(result.current).toStrictEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });
});
