import React, { useCallback, useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { I18nContext } from '../../../contexts/i18n';

import { INVALID_ASSET_TYPE } from '../../../helpers/constants/error-keys';
import { showModal } from '../../../store/actions';
import { AssetType } from '../../../../shared/constants/transaction';
import {
  Display,
  IconColor,
  JustifyContent,
} from '../../../helpers/constants/design-system';
import IconButton from '../../../components/ui/icon-button/icon-button';
import {
  Box,
  Icon,
  IconName,
  IconSize,
} from '../../../components/component-library';

import { Asset } from '../types/asset';
import { navigateToSendRoute } from '../../confirmations/utils/send';

const TokenButtons = ({
  token,
}: {
  token: Asset & { type: AssetType.token };
}) => {
  const dispatch = useDispatch();
  const t = useContext(I18nContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (token.isERC721) {
      dispatch(
        showModal({
          name: 'CONVERT_TOKEN_TO_NFT',
          tokenAddress: token.address,
        }),
      );
    }
  }, [token.isERC721, token.address, dispatch]);

  const handleSendOnClick = useCallback(async () => {
    try {
      navigateToSendRoute(navigate, {
        address: token.address,
        chainId: token.chainId,
      });

      // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (!err.message.includes(INVALID_ASSET_TYPE)) {
        throw err;
      }
    }
  }, [navigate, token]);

  return (
    <Box
      display={Display.Flex}
      gap={3}
      justifyContent={JustifyContent.spaceEvenly}
    >
      <IconButton
        className="token-overview__button"
        onClick={handleSendOnClick}
        Icon={
          <Icon
            name={IconName.Send}
            color={IconColor.iconAlternative}
            size={IconSize.Md}
          />
        }
        label={t('send')}
        data-testid="eth-overview-send"
        disabled={token.isERC721}
      />
    </Box>
  );
};

export default TokenButtons;
