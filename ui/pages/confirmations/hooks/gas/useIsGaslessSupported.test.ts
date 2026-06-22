import { renderHookWithConfirmContextProvider } from '../../../../../test/lib/confirmations/render-helpers';
import { useIsGaslessSupported } from './useIsGaslessSupported';

describe('useIsGaslessSupported', () => {
  it('returns unsupported because 1do does not use gasless relay', () => {
    const { result } = renderHookWithConfirmContextProvider(
      useIsGaslessSupported,
    );

    expect(result.current).toStrictEqual({
      isSupported: false,
      isSmartTransaction: false,
      pending: false,
    });
  });
});
