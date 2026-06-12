import { renderHook } from '@testing-library/react-hooks';
import { useAssetMetadata } from './useAssetMetadata';

const mockAbortController = { current: new AbortController() };

describe('useAssetMetadata', () => {
  it('returns undefined because remote token metadata lookup is disabled', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata(
        '0x123asdfasdfasdfasdfasdfasadssdas',
        true,
        mockAbortController,
        '0x1',
      ),
    );

    await waitForNextUpdate();

    expect(result.current).toBeUndefined();
  });
});
