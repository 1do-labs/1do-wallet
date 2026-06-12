import { NameType } from '@metamask/name-controller';
import React, { memo } from 'react';
import {
  AlignItems,
  Display,
  FlexDirection,
} from '../../../../../helpers/constants/design-system';
import { Box } from '../../../../component-library';
import Name from '../../../name/name';
import { useFallbackDisplayName } from './hook';

export type ConfirmInfoRowAddressProps = {
  address: string;
  chainId: string;
  showFullName?: boolean;
};

export const ConfirmInfoRowAddress = memo(
  ({ address, chainId, showFullName = false }: ConfirmInfoRowAddressProps) => {
    const { hexAddress } = useFallbackDisplayName(address);

    return (
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
      >
        <Name
          value={hexAddress}
          type={NameType.ETHEREUM_ADDRESS}
          preferContractSymbol
          variation={chainId}
          showFullName={showFullName}
          className="overflow-hidden"
        />
      </Box>
    );
  },
);
