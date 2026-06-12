import React, { useCallback, useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CaipChainId } from '@metamask/utils';

import { transitionForward } from '../../ui/transition';

import { I18nContext } from '../../../contexts/i18n';

import { MULTICHAIN_ACCOUNT_ADDRESS_LIST_PAGE_ROUTE } from '../../../helpers/constants/routes';
import {
  AddressListQueryParams,
  AddressListSource,
} from '../../../pages/multichain-accounts/multichain-account-address-list-page';
import { getNetworkConfigurationIdByChainId } from '../../../selectors';
import { getSelectedAccountGroup } from '../../../selectors/multichain-accounts/account-tree';
import Tooltip from '../../ui/tooltip';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  BlockSize,
  Display,
  IconColor,
  JustifyContent,
} from '../../../helpers/constants/design-system';
import { Box, Icon, IconName, IconSize } from '../../component-library';
import IconButton from '../../ui/icon-button';
import { ReceiveModal } from '../../multichain/receive-modal';
import { setActiveNetworkWithError } from '../../../store/actions';
import {
  getMultichainNativeCurrency,
  getMultichainNetwork,
} from '../../../selectors/multichain';
import { useMultichainSelector } from '../../../hooks/useMultichainSelector';
import { getCurrentChainId } from '../../../../shared/lib/selectors/networks';
import { trace, TraceName } from '../../../../shared/lib/trace';
import { navigateToSendRoute } from '../../../pages/confirmations/utils/send';

type CoinButtonsProps = {
  account: InternalAccount;
  chainId: `0x${string}` | CaipChainId | number;
  trackingLocation: string;
  isSigningEnabled: boolean;
  classPrefix?: string;
};

const CoinButtons = ({
  account,
  chainId,
  trackingLocation,
  isSigningEnabled,
  classPrefix = 'coin',
}: CoinButtonsProps) => {
  const t = useContext(I18nContext);
  const dispatch = useDispatch();

  const { trackEvent } = useContext(MetaMetricsContext);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const { address: selectedAddress } = account;
  const navigate = useNavigate();
  const networks = useSelector(getNetworkConfigurationIdByChainId) as Record<
    string,
    string
  >;
  const currentChainId = useSelector(getCurrentChainId);
  const selectedAccountGroup = useSelector(getSelectedAccountGroup);

  // Initially, those events were using a "ETH" as `token_symbol`, so we keep this behavior
  // for EVM, no matter the currently selected native token (e.g. SepoliaETH if you are on Sepolia
  // network).
  const { isEvmNetwork, chainId: multichainChainId } = useMultichainSelector(
    getMultichainNetwork,
    account,
  );
  const multichainNativeToken = useMultichainSelector(
    getMultichainNativeCurrency,
    account,
  );
  const nativeToken = isEvmNetwork ? 'ETH' : multichainNativeToken;

  const buttonTooltips = {
    sendButton: [
      { condition: !isSigningEnabled, message: 'methodNotSupported' },
    ],
  };

  const generateTooltip = (
    buttonKey: keyof typeof buttonTooltips,
    contents: React.ReactElement,
  ) => {
    const conditions = buttonTooltips[buttonKey];
    const tooltipInfo = conditions.find(({ condition }) => condition);
    if (tooltipInfo?.message) {
      return (
        <Tooltip
          title={t(tooltipInfo.message)}
          position="bottom"
          wrapperClassName="tooltip-button-wrapper"
        >
          {contents}
        </Tooltip>
      );
    }
    return contents;
  };

  const setCorrectChain = useCallback(async () => {
    if (currentChainId !== chainId && multichainChainId !== chainId) {
      try {
        const networkConfigurationId = networks[chainId];
        await dispatch(setActiveNetworkWithError(networkConfigurationId));
      } catch (err) {
        console.error(`Failed to switch chains.
        Target chainId: ${chainId}, Current chainId: ${currentChainId}.
        ${
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31893
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          err
        }`);
        throw err;
      }
    }
  }, [currentChainId, multichainChainId, chainId, networks, dispatch]);

  const handleSendOnClick = useCallback(async () => {
    trackEvent(
      {
        event: MetaMetricsEventName.SendStarted,
        category: MetaMetricsEventCategory.Navigation,
        properties: {
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          account_type: account.type,
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          token_symbol: nativeToken,
          location: 'Home',
          text: 'Send',
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          chain_id: chainId,
        },
      },
      { excludeMetaMetricsId: false },
    );

    // Native Send flow
    await setCorrectChain();
    const params =
      trackingLocation === 'home' ? undefined : { chainId: chainId.toString() };
    transitionForward(() => navigateToSendRoute(navigate, params));
  }, [
    account,
    chainId,
    nativeToken,
    navigate,
    setCorrectChain,
    trackEvent,
    trackingLocation,
  ]);

  const handleReceiveOnClick = useCallback(() => {
    trace({ name: TraceName.ReceiveModal });
    trackEvent({
      event: MetaMetricsEventName.NavReceiveButtonClicked,
      category: MetaMetricsEventCategory.Navigation,
      properties: {
        text: 'Receive',
        location: trackingLocation,
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        chain_id: chainId,
      },
    });

    if (selectedAccountGroup) {
      // Navigate to the multichain address list page with receive source
      transitionForward(() =>
        navigate(
          `${MULTICHAIN_ACCOUNT_ADDRESS_LIST_PAGE_ROUTE}?accountGroupId=${encodeURIComponent(selectedAccountGroup)}&${AddressListQueryParams.Source}=${AddressListSource.Receive}`,
        ),
      );
    } else {
      // Show the traditional receive modal
      setShowReceiveModal(true);
    }
  }, [selectedAccountGroup, navigate, trackEvent, trackingLocation, chainId]);

  return (
    <Box
      display={Display.Flex}
      justifyContent={JustifyContent.spaceBetween}
      width={BlockSize.Full}
      gap={3}
    >
      <IconButton
        className={`${classPrefix}-overview__button`}
        data-testid={`${classPrefix}-overview-send`}
        Icon={
          <Icon
            name={IconName.Send}
            color={IconColor.iconAlternative}
            size={IconSize.Md}
          />
        }
        disabled={!isSigningEnabled}
        label={t('send')}
        onClick={handleSendOnClick}
        width={BlockSize.Full}
        tooltipRender={(contents: React.ReactElement) =>
          generateTooltip('sendButton', contents)
        }
      />
      {showReceiveModal && (
        <ReceiveModal
          address={selectedAddress}
          onClose={() => setShowReceiveModal(false)}
        />
      )}
      <IconButton
        className={`${classPrefix}-overview__button`}
        data-testid={`${classPrefix}-overview-receive`}
        Icon={
          <Icon
            name={IconName.Received}
            color={IconColor.iconAlternative}
            size={IconSize.Md}
          />
        }
        label={t('receive')}
        width={BlockSize.Full}
        onClick={handleReceiveOnClick}
      />
    </Box>
  );
};

export default CoinButtons;
