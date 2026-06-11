import React, { useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { I18nContext } from '../../../contexts/i18n';
import { getUseExternalServices } from '../../../selectors';

import { INVALID_ASSET_TYPE } from '../../../helpers/constants/error-keys';
import { showModal } from '../../../store/actions';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import { AssetType } from '../../../../shared/constants/transaction';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
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
import { isEvmChainId } from '../../../../shared/lib/asset-utils';

const TokenButtons = ({
  token,
  disableSendForNonEvm = false,
  isMarketClosed = false,
}: {
  token: Asset & { type: AssetType.token };
  /** When true, disables the send button for non-EVM chains (used on asset page) */
  disableSendForNonEvm?: boolean;
  /** When true, disables the swap button because the stock market is closed */
  isMarketClosed?: boolean;
}) => {
  const dispatch = useDispatch();
  const t = useContext(I18nContext);
  const { trackEvent } = useContext(MetaMetricsContext);
  const navigate = useNavigate();
  const isExternalServicesEnabled = useSelector(getUseExternalServices);
  const isEvm = isEvmChainId(token.chainId);

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
    trackEvent(
      {
        event: MetaMetricsEventName.SendStarted,
        category: MetaMetricsEventCategory.Navigation,
        properties: {
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          token_symbol: token.symbol,
          location: MetaMetricsSwapsEventSource.TokenView,
          text: 'Send',
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          chain_id: token.chainId,
        },
      },
      { excludeMetaMetricsId: false },
    );

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
  }, [trackEvent, navigate, token]);

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
        disabled={
          token.isERC721 ||
          (disableSendForNonEvm && !isEvm && !isExternalServicesEnabled)
        }
      />
    </Box>
  );
};

export default TokenButtons;
