/* eslint-disable @typescript-eslint/naming-convention */
import BigNumber from 'bignumber.js';
import { calcGasTotal, calcTokenAmount } from './transactions-controller-utils';

describe('transaction controller utils', () => {
  describe('calcGasTotal()', () => {
    it('should correctly compute gasTotal', () => {
      const result = calcGasTotal(12, 15);
      expect(result).toStrictEqual('17a');
    });
  });

  describe('calcTokenAmount()', () => {
    // @ts-expect-error This is missing from the Mocha type definitions
    it.each([
      // number values
      [0, 5, '0'],
      [123456, undefined, '123456'],
      [123456, 5, '1.23456'],
      [123456, 6, '0.123456'],
      // Do not delete the following test. Testing decimal = 36 is important because it has broken
      // BigNumber#div in the past when the value that was passed into it was not a BigNumber.
      [123456, 36, '1.23456e-31'],
      [3000123456789678, 6, '3000123456.789678'],
      // eslint-disable-next-line no-loss-of-precision
      [3000123456789123456789123456789, 3, '3.0001234567891233e+27'], // expected precision lost
      // eslint-disable-next-line no-loss-of-precision
      [3000123456789123456789123456789, 6, '3.0001234567891233e+24'], // expected precision lost
      // string values
      ['0', 5, '0'],
      ['123456', undefined, '123456'],
      ['123456', 5, '1.23456'],
      ['123456', 6, '0.123456'],
      ['3000123456789678', 6, '3000123456.789678'],
      [
        '3000123456789123456789123456789',
        3,
        '3.000123456789123456789123456789e+27',
      ],
      [
        '3000123456789123456789123456789',
        6,
        '3.000123456789123456789123456789e+24',
      ],
      // BigNumber values
      [new BigNumber('3000123456789678'), 6, '3000123456.789678'],
      [
        new BigNumber('3000123456789123456789123456789'),
        6,
        '3.000123456789123456789123456789e+24',
      ],
    ])(
      'returns the value %s divided by 10^%s = %s',
      (
        value: string | number | BigNumber,
        decimals: number | undefined,
        expected: string,
      ) => {
        expect(calcTokenAmount(value, decimals).toString()).toBe(expected);
      },
    );
  });
});
