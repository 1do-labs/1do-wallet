import { RestrictedMethods } from './permissions';

// This test is flawed because it doesn't take fencing into consideration
// TODO: Figure out a better way to test this
describe('RestrictedMethods', () => {
  it('has the expected permission keys', () => {
    expect(Object.keys(RestrictedMethods).sort()).toStrictEqual(
      ['eth_accounts'].sort(),
    );
  });
});
