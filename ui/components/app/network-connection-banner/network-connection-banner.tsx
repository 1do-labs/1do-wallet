import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  BannerBase,
  ButtonLink,
  ButtonLinkSize,
  Icon,
  IconName,
  IconSize,
} from '../../component-library';
import {
  BackgroundColor,
  BorderRadius,
  IconColor,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { Text } from '../../component-library/text';
import { useNetworkConnectionBanner } from '../../../hooks/useNetworkConnectionBanner';
import { NETWORKS_ROUTE } from '../../../helpers/constants/routes';
import { setEditedNetwork } from '../../../store/actions';
import { MetaMetricsEventName } from '../../../../shared/constants/metametrics';
import { NetworkConnectionBanner as NetworkConnectionBannerType } from '../../../../shared/constants/app-state';

type BannerIcon = {
  color: IconColor;
  name: IconName;
  verticalAdjustment: string;
  className?: string;
};

const PrimaryMessage = ({
  t,
  primaryMessageKey,
  networkConnectionBanner,
}: {
  t: ReturnType<typeof useI18nContext>;
  primaryMessageKey: string;
  networkConnectionBanner: Exclude<
    NetworkConnectionBannerType,
    { status: 'unknown' | 'available' }
  >;
}) => {
  return (
    <Text
      variant={TextVariant.bodyXsMedium}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        paddingRight: '4px',
      }}
    >
      {t(primaryMessageKey, [networkConnectionBanner.networkName])}
    </Text>
  );
};

const SecondaryMessage = ({ content }: { content: React.ReactNode }) => {
  return (
    <Text
      variant={TextVariant.bodyXsMedium}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {content}
    </Text>
  );
};

const UpdateRpcButton = ({
  t,
  isLowerCase,
  updateRpc,
}: {
  t: ReturnType<typeof useI18nContext>;
  isLowerCase: boolean;
  updateRpc: () => void;
}) => {
  const updateRpcText = t('updateRpc');

  return (
    <ButtonLink
      key="updateRpc"
      size={ButtonLinkSize.Auto}
      variant={TextVariant.bodyXsMedium}
      onClick={updateRpc}
      paddingTop={0}
      paddingBottom={0}
      style={{ verticalAlign: 'bottom' }}
    >
      {isLowerCase
        ? updateRpcText[0].toLowerCase() + updateRpcText.slice(1)
        : updateRpcText}
    </ButtonLink>
  );
};

const SwitchToDefaultRpcButton = ({
  t,
  isLowerCase,
  switchToDefaultRpc,
}: {
  t: ReturnType<typeof useI18nContext>;
  isLowerCase: boolean;
  switchToDefaultRpc: () => Promise<void>;
}) => {
  const switchToDefaultRpcText = t('switchToMetaMaskDefaultRpc');

  return (
    <ButtonLink
      key="switchToDefaultRpc"
      size={ButtonLinkSize.Auto}
      variant={TextVariant.bodyXsMedium}
      onClick={switchToDefaultRpc}
      paddingTop={0}
      paddingBottom={0}
      style={{ verticalAlign: 'bottom' }}
    >
      {isLowerCase
        ? switchToDefaultRpcText[0].toLowerCase() +
          switchToDefaultRpcText.slice(1)
        : switchToDefaultRpcText}
    </ButtonLink>
  );
};

const getBannerContent = (
  networkConnectionBanner: Exclude<
    NetworkConnectionBannerType,
    { status: 'unknown' | 'available' }
  >,
  t: ReturnType<typeof useI18nContext>,
  updateRpc: () => void,
  switchToDefaultRpc: () => Promise<void>,
): {
  primaryMessage: React.ReactNode;
  secondaryMessage: React.ReactNode;
  backgroundColor: BackgroundColor;
  icon: BannerIcon;
} => {
  // Align the indicator with the text
  const verticalAdjustment = '0.25em';

  // Check if we have a built-in default endpoint available to switch to.
  const hasDefaultRpcEndpoint =
    networkConnectionBanner.defaultRpcEndpointIndex !== undefined;

  if (networkConnectionBanner.status === 'degraded') {
    const primaryMessage = (
      <PrimaryMessage
        t={t}
        primaryMessageKey="stillConnectingTo"
        networkConnectionBanner={networkConnectionBanner}
      />
    );

    let secondaryMessage: React.ReactNode = null;
    if (!networkConnectionBanner.isDefaultRpcEndpoint) {
      // For custom endpoints, show either "Switch to 1do default RPC" or "Update RPC"
      const buttonContent = hasDefaultRpcEndpoint ? (
        <SwitchToDefaultRpcButton
          t={t}
          isLowerCase={false}
          switchToDefaultRpc={switchToDefaultRpc}
        />
      ) : (
        <UpdateRpcButton t={t} isLowerCase={false} updateRpc={updateRpc} />
      );
      secondaryMessage = <SecondaryMessage content={buttonContent} />;
    }

    return {
      primaryMessage,
      secondaryMessage,
      backgroundColor: BackgroundColor.backgroundSection,
      icon: {
        color: IconColor.iconDefault,
        name: IconName.Loading,
        verticalAdjustment,
        className: 'animate-spin',
      },
    };
  }

  const primaryMessage = (
    <PrimaryMessage
      t={t}
      primaryMessageKey="unableToConnectTo"
      networkConnectionBanner={networkConnectionBanner}
    />
  );

  let secondaryMessageContent: React.ReactNode;
  if (networkConnectionBanner.isDefaultRpcEndpoint) {
    // Already on the built-in default endpoint, just show connectivity message.
    secondaryMessageContent = t('checkNetworkConnectivity');
  } else if (hasDefaultRpcEndpoint) {
    // Has default endpoint available, show "Switch to 1do default RPC".
    secondaryMessageContent = t('checkNetworkConnectivityOr', [
      <SwitchToDefaultRpcButton
        key="switchToDefaultRpc"
        t={t}
        isLowerCase={true}
        switchToDefaultRpc={switchToDefaultRpc}
      />,
    ]);
  } else {
    // No default endpoint available, show "Update RPC".
    secondaryMessageContent = t('checkNetworkConnectivityOr', [
      <UpdateRpcButton
        key="updateRpc"
        t={t}
        isLowerCase={true}
        updateRpc={updateRpc}
      />,
    ]);
  }

  const secondaryMessage = (
    <SecondaryMessage content={secondaryMessageContent} />
  );

  return {
    primaryMessage,
    secondaryMessage,
    backgroundColor: BackgroundColor.errorMuted,
    icon: {
      color: IconColor.errorDefault,
      name: IconName.Danger,
      verticalAdjustment,
    },
  };
};

export const NetworkConnectionBanner = () => {
  const t = useI18nContext();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const networkConnectionBanner = useNetworkConnectionBanner();

  const updateRpc = useCallback(() => {
    if (
      networkConnectionBanner.status === 'degraded' ||
      networkConnectionBanner.status === 'unavailable'
    ) {
      networkConnectionBanner.trackNetworkBannerEvent({
        bannerType: networkConnectionBanner.status,
        eventName: MetaMetricsEventName.NetworkConnectionBannerUpdateRpcClicked,
        networkClientId: networkConnectionBanner.networkClientId,
      });

      dispatch(
        setEditedNetwork({
          chainId: networkConnectionBanner.chainId,
          trackRpcUpdateFromBanner: true,
        }),
      );
      navigate(NETWORKS_ROUTE);
    }
  }, [networkConnectionBanner, dispatch, navigate]);

  const handleSwitchToDefaultRpc = useCallback(async () => {
    if (
      networkConnectionBanner.status === 'degraded' ||
      networkConnectionBanner.status === 'unavailable'
    ) {
      networkConnectionBanner.trackNetworkBannerEvent({
        bannerType: networkConnectionBanner.status,
        eventName:
          MetaMetricsEventName.NetworkConnectionBannerSwitchToMetaMaskDefaultRpcClicked,
        networkClientId: networkConnectionBanner.networkClientId,
      });

      await networkConnectionBanner.switchToDefaultRpc();
    }
  }, [networkConnectionBanner]);

  if (
    networkConnectionBanner.status === 'degraded' ||
    networkConnectionBanner.status === 'unavailable'
  ) {
    const { primaryMessage, secondaryMessage, backgroundColor, icon } =
      getBannerContent(
        networkConnectionBanner,
        t,
        updateRpc,
        handleSwitchToDefaultRpc,
      );

    return (
      <BannerBase
        className="network-connection-banner"
        backgroundColor={backgroundColor}
        startAccessory={
          <Icon
            name={icon.name}
            size={IconSize.Sm}
            color={icon.color}
            className={icon.className}
            style={{ marginTop: icon.verticalAdjustment }}
            data-testid="icon"
          />
        }
        borderRadius={BorderRadius.MD}
      >
        {primaryMessage}
        {secondaryMessage}
      </BannerBase>
    );
  }

  return null;
};

export default NetworkConnectionBanner;
