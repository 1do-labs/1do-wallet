import {
  getEip7702DelegationAddress,
  isOneDo7702DelegationCode,
  ONE_DO_7702_DELEGATE,
} from './eip7702-utils';

describe('eip7702-utils', () => {
  it('recognizes 1Do EIP-7702 delegation code', () => {
    const code = `0xef0100${ONE_DO_7702_DELEGATE.slice(2).toLowerCase()}`;

    expect(getEip7702DelegationAddress(code)).toBe(
      ONE_DO_7702_DELEGATE.toLowerCase(),
    );
    expect(isOneDo7702DelegationCode(code)).toBe(true);
  });

  it('does not recognize non-1Do delegation code', () => {
    expect(
      isOneDo7702DelegationCode(
        '0xef01001111111111111111111111111111111111111111',
      ),
    ).toBe(false);
  });
});
