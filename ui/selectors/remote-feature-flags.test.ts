import * as manifestFlags from '../../shared/lib/manifestFlags';
import { getRemoteFeatureFlags } from './remote-feature-flags';

describe('#getRemoteFeatureFlags', () => {
  let getManifestFlagsMock: jest.SpyInstance;

  beforeEach(() => {
    getManifestFlagsMock = jest
      .spyOn(manifestFlags, 'getManifestFlags')
      .mockReturnValue({});
  });

  afterEach(() => {
    getManifestFlagsMock.mockRestore();
  });

  it('returns manifest flags only', () => {
    getManifestFlagsMock.mockReturnValue({
      remoteFeatureFlags: { localFlag: true },
    });

    expect(
      getRemoteFeatureFlags({
        metamask: { remoteFeatureFlags: { staleRemoteFlag: true } },
      }),
    ).toStrictEqual({ localFlag: true });
  });

  it('returns an empty object when no manifest flags are configured', () => {
    expect(getRemoteFeatureFlags({ metamask: {} })).toStrictEqual({});
  });
});
