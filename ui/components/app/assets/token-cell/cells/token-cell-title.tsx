import { Box, BoxFlexDirection } from '@metamask/design-system-react';
import React from 'react';
import { TokenFiatDisplayInfo } from '../../types';
import { AssetCellTitle } from '../../asset-list/cells/asset-title';
import { Tag } from '../../../../component-library';
import { ACCOUNT_TYPE_LABELS } from '../../constants';

type TokenCellTitleProps = {
  token: TokenFiatDisplayInfo;
};

export const TokenCellTitle = React.memo(
  ({ token }: TokenCellTitleProps) => {
    const label = token.accountType
      ? ACCOUNT_TYPE_LABELS[token.accountType]
      : undefined;

    return (
      <Box flexDirection={BoxFlexDirection.Row} gap={2} className="min-w-0">
        <AssetCellTitle title={token.title} />
        {label && <Tag label={label} />}
      </Box>
    );
  },
  (prevProps, nextProps) =>
    prevProps.token.title === nextProps.token.title &&
    prevProps.token.address === nextProps.token.address &&
    prevProps.token.chainId === nextProps.token.chainId &&
    prevProps.token.symbol === nextProps.token.symbol,
);
