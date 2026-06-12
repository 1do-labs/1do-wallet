import nock from 'nock';
import {
  TokenFeature,
  TokenFeatureType,
} from '../../types/security-alerts-api';
import {
  getTokenFeatureTitleDescriptionIds,
  fetchTxAlerts,
  convertChainIdToBlockAidChainName,
  isSecurityAlertsAPIEnabled,
} from './security-alerts-api.util';

// Mock environment variables
const originalEnv = process.env;
const BASE_URL = 'https://api.example.com';

let signal: AbortSignal;

describe('Security alerts utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signal = new AbortController().signal;
    process.env = { ...originalEnv };
    process.env.SECURITY_ALERTS_API_ENABLED = 'true';
    process.env.SECURITY_ALERTS_API_URL = BASE_URL;
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getTokenFeatureTitleDescriptionIds', () => {
    it('should correctly add title Id and Description Id', async () => {
      const mockTokenAlert = {
        type: TokenFeatureType.MALICIOUS,
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        feature_id: 'UNSTABLE_TOKEN_PRICE',
        description: 'This token is Malicious',
      } as TokenFeature;

      const tokenAlertWithLabelIds =
        getTokenFeatureTitleDescriptionIds(mockTokenAlert);
      expect(tokenAlertWithLabelIds.titleId).toBeTruthy();
      expect(tokenAlertWithLabelIds.descriptionId).toBeTruthy();
    });

    it('should correctly return title Id and Description Id null if not available', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const mockTokenAlert = {
        type: TokenFeatureType.BENIGN,
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        feature_id: 'BENIGN_TYPE',
        description: 'This token is Benign',
      } as TokenFeature;

      const tokenAlertWithLabelIds =
        getTokenFeatureTitleDescriptionIds(mockTokenAlert);
      expect(tokenAlertWithLabelIds.titleId).toBeNull();
      expect(tokenAlertWithLabelIds.descriptionId).toBeNull();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('fetchTxAlerts', () => {
    const mockChainId = 'eip155:1' as const;
    const mockTrade =
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQALEC+B/mrGX4B49j9Pt3cLS/moZQX+WeeNTFbg8tHgHtaeI3upde+TaWP4z3riqaHdNZ98/ZUKdQiAK953SSApKYw0ycVL/4j0T5DoJd6lAe/rPLCUHCHYB6gn8UZyB66MfR6MT6uJlElMjx5cEodEWykX1gxDx5qpWRYvXWAAWY0yNaBm/qy58sC4y0qyEMejJKjQYQhW8amNWJqBmVTkVv0DBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKkEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTj8b6evO+2606PWXzaqvJdDGxu+TC0vbg5HymAgNFL11htD/6J/XX9kp0wJsfKVh53ksJqzbfyd1RSzIap7OM5ejnStls42Wf0xNRAChL93gEW4UQqPNOSYySLu5vwwX4aVJh0UqsxbwO7GNdqHBaH3CjnuNams8L+PIsxs5JAZ16KD0N0oI1T+8K47DiJ9N82JyiZvsX3fj3y3zO++Tr3FUGp9UXGMd0yShWY5hpHV62i164o5tLbVxzVVshAAAAAPPvWeGt7MppdBwkmIZQA+0op8AFkAFcDizwhodc7RDPG6lguUcBUafedbpvY415gYoZ6UmeWoc/FesM7J0/XNwJBQAFApeWAgAFAAkDriEBAAAAAAAGAgABDAIAAADadkgdAAAAAAcBAQERCBYHAAECCAkICggUEAsMERIBAhMVFgAHJOUXy5d6460qAQAAADoBZAAB2nZIHQAAAACtQU8EAAAAADIAAAcDAQAAAQkNAg4PCQD043liGeeMAAYCAAMMAgAAAAAAAAAAAAAABgIABAwCAAAATSxCAAAAAAAB6BwQxsr3h83KgxKA07LOpN5ZFYWarna+9W5g8zXGhz0EDRETDgMQEg8=';
    const mockAccountAddress = '4CT8Uuah9FCv37NfkKZaTmaJXsC9KWd7cE2btFgChmvV';

    it('returns null without making a remote request', async () => {
      const scope = nock(BASE_URL).post('/ethereum/message/scan').reply(200);

      const result = await fetchTxAlerts({
        signal,
        chainId: mockChainId,
        trade: mockTrade,
        accountAddress: mockAccountAddress,
      });

      expect(result).toBeNull();
      expect(scope.isDone()).toBe(false);
    });
  });

  describe('convertChainIdToBlockAidChainName', () => {
    it('should return correct chain name for Ethereum mainnet', () => {
      const result = convertChainIdToBlockAidChainName('eip155:1');
      expect(result).toBe('ethereum');
    });

    it('should return null for unsupported chain', () => {
      const result = convertChainIdToBlockAidChainName('unknown:testnet');
      expect(result).toBeNull();
    });
  });

  describe('isSecurityAlertsAPIEnabled', () => {
    it('should return true when SECURITY_ALERTS_API_ENABLED is set to true', () => {
      process.env.SECURITY_ALERTS_API_ENABLED = 'true';
      expect(isSecurityAlertsAPIEnabled()).toBe(true);
    });

    it('should return false when SECURITY_ALERTS_API_ENABLED is set to false', () => {
      process.env.SECURITY_ALERTS_API_ENABLED = 'false';
      expect(isSecurityAlertsAPIEnabled()).toBe(false);
    });

    it('should return false when SECURITY_ALERTS_API_ENABLED is not set', () => {
      delete process.env.SECURITY_ALERTS_API_ENABLED;
      expect(isSecurityAlertsAPIEnabled()).toBe(false);
    });
  });
});
