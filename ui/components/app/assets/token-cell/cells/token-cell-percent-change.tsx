import React from 'react';
import { useSelector } from 'react-redux';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { getMarketData } from '../../../../../selectors';
import { TokenFiatDisplayInfo } from '../../types';
import { PercentageChange } from '../../../../multichain/token-list-item/price/percentage-change';

type TokenCellPercentChangeProps = {
  token: TokenFiatDisplayInfo;
  price?: number;
  comparePrice?: number;
};

export const TokenCellPercentChange = React.memo(
  ({ token, price, comparePrice }: TokenCellPercentChangeProps) => {
    const multiChainMarketData = useSelector(getMarketData);

    const tokenAddress = token.isNative
      ? getNativeTokenAddress(token.chainId as Hex)
      : token.address;

    let tokenPercentageChange;

    // Compare null and undefined
    // eslint-disable-next-line no-eq-null
    if (price != null && comparePrice != null) {
      tokenPercentageChange = ((price - comparePrice) / comparePrice) * 100;
    } else {
      tokenPercentageChange =
        multiChainMarketData?.[token.chainId as Hex]?.[tokenAddress as Hex]
          ?.pricePercentChange1d;
    }

    return (
      <PercentageChange value={tokenPercentageChange} address={tokenAddress} />
    );
  },
  (prevProps, nextProps) =>
    prevProps.token.address === nextProps.token.address &&
    prevProps.price === nextProps.price &&
    prevProps.comparePrice === nextProps.comparePrice,
);
