import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useMemo } from 'react';

import { useSendContext } from '../../context/send';

export const useSendType = () => {
  const { asset } = useSendContext();
  const address = asset?.address || asset?.assetId;

  const isEvmSendType = useMemo(
    () => (address && asset?.chainId ? isEvmAddress(address) : undefined),
    [address, asset?.chainId],
  );

  const assetIsNative = asset ? asset?.isNative === true : undefined;

  return useMemo(
    () => ({
      isEvmSendType,
      isEvmNativeSendType: isEvmSendType && assetIsNative,
    }),
    [isEvmSendType, assetIsNative],
  );
};
