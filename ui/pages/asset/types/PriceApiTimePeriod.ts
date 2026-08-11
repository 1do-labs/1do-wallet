/**
 * Values supported by the Price API for the `timePeriod` parameter.
 *
 * Used to choose an Alchemy historical-price time window.
 */
export type PriceApiTimePeriod = `${number}${
  | 'D'
  | 'd'
  | 'M'
  | 'm'
  | 'Y'
  | 'y'}`;
