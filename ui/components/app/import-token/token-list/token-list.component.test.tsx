import React from 'react';
import configureMockStore from 'redux-mock-store';
import { screen } from '@testing-library/react';
import * as chainUtilsModule from '../../../../../shared/lib/chain-utils';
import { renderWithProvider } from '../../../../../test/lib/render-helpers-navigate';
import mockState from '../../../../../test/data/mock-state.json';
import * as assetUtilsModule from '../../../../../shared/lib/asset-utils';
import * as utilModule from '../../../../helpers/utils/util';
import TokenList from './token-list.component';

jest.mock('../../../../../shared/lib/chain-utils');
jest.mock('../../../../../shared/lib/asset-utils');
jest.mock('../../../../helpers/utils/util');

describe('TokenList Component', () => {
  const mockStore = configureMockStore()(mockState);
  const mockAccountAddress = '0x1234567890123456789012345678901234567890';

  const defaultProps = {
    results: [],
    selectedTokens: {},
    onToggleToken: jest.fn(),
    allTokens: {},
    currentNetwork: { chainId: '0x1', nickname: 'Ethereum Mainnet' },
    testNetworkBackgroundColor: {},
    accountAddress: mockAccountAddress,
    accountsAssets: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when token is on an EVM chain', () => {
    const mockEvmToken = {
      symbol: 'DAI',
      name: 'Dai',
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
      iconUrl: 'http://example.com/dai.png',
    };

    it('should use checkExistingAllTokens to determine if token is already added', () => {
      jest.spyOn(chainUtilsModule, 'isNonEvmChainId').mockReturnValue(false);
      jest.spyOn(utilModule, 'checkExistingAllTokens').mockReturnValue(false);

      const props = {
        ...defaultProps,
        results: [mockEvmToken],
      };

      renderWithProvider(<TokenList {...props} />, mockStore);

      expect(chainUtilsModule.isNonEvmChainId).toHaveBeenCalledWith(
        mockEvmToken.chainId,
      );
      expect(utilModule.checkExistingAllTokens).toHaveBeenCalledWith(
        mockEvmToken.address,
        mockEvmToken.chainId,
        mockAccountAddress,
        props.allTokens,
      );
      expect(assetUtilsModule.toAssetId).not.toHaveBeenCalled();
    });
  });
});
