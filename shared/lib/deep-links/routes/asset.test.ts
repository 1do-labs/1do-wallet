import { asset, AssetQueryParams } from './asset';
import { Destination } from './route';

function assertPathDestination(
  result: Destination,
): asserts result is Extract<Destination, { path: string }> {
  expect('path' in result).toBe(true);
}

describe('assetRoute', () => {
  type TestCase = {
    assetIdParam: string | undefined;
    expectedPath: string;
  };

  const testCases: TestCase[] = [
    {
      assetIdParam:
        'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      expectedPath: '/asset/0xe708/0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    },
    {
      assetIdParam: 'eip155:59144/slip44:60',
      expectedPath: '/asset/0xe708',
    },
  ];

  // @ts-expect-error This function is missing from the Mocha type definitions
  it.each(testCases)(
    'assetRoute.handler correctly handles assetId param: input=$assetIdParam, expected=$expected',
    ({ assetIdParam: searchParamVal, expectedPath }: TestCase) => {
      const params =
        typeof searchParamVal === 'undefined'
          ? new URLSearchParams()
          : new URLSearchParams({
              [AssetQueryParams.AssetId]: searchParamVal,
            });

      const result = asset.handler(params);

      assertPathDestination(result);
      expect(result.path).toBe(expectedPath);
      expect(result.query.size).toBe(0);
    },
  );

  type TestCaseWithInvalidAssetId = {
    assetIdParam: string | undefined;
    expectedError: string;
  };

  const testCasesWithInvalidAssetId: TestCaseWithInvalidAssetId[] = [
    { assetIdParam: undefined, expectedError: 'Missing assetId parameter' },
    {
      assetIdParam: 'not-caip-asset-id',
      expectedError: 'Invalid assetId parameter',
    },
  ];

  // @ts-expect-error This function is missing from the Mocha type definitions
  it.each(testCasesWithInvalidAssetId)(
    'assetRoute.handler throws error for invalid assetId param: input=$assetIdParam, expectedError=$expectedError',
    ({ assetIdParam, expectedError }: TestCaseWithInvalidAssetId) => {
      const params =
        assetIdParam === undefined
          ? new URLSearchParams()
          : new URLSearchParams({
              [AssetQueryParams.AssetId]: assetIdParam,
            });

      expect(() => asset.handler(params)).toThrow(expectedError);
    },
  );
});
