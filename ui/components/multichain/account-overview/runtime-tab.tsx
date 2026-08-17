import React from 'react';
import {
  Box,
  BoxBackgroundColor,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react';
import {
  getRuntimeAppUrl,
  getRuntimeAppsForSurface,
} from './runtime-app-registry';
import {
  SessionPayIcon,
  NFTMarketVoxelDart,
  WillMonolith,
  FlashLoanPower,
  DexPixel,
  GiftIcon,
  PayIcon,
  RedPacketIcon,
} from './runtime-tab-icons';

const walletRuntimeApps = getRuntimeAppsForSurface('wallet').filter(
  (app) => app.id !== 'settings',
);

const ICON_BY_APP_ID = {
  redpacket: RedPacketIcon,
  gift: GiftIcon,
  pay: PayIcon,
  dex: DexPixel,
  nftmarket: NFTMarketVoxelDart,
  flashloan: FlashLoanPower,
  will: WillMonolith,
  sessionpay: SessionPayIcon,
} as const;

const RuntimeAppCard = ({
  app,
}: {
  app: (typeof walletRuntimeApps)[number];
}) => {
  const Icon = ICON_BY_APP_ID[app.id as keyof typeof ICON_BY_APP_ID];

  return (
    <button
      type="button"
      data-testid={`runtime-app-card-${app.id}`}
      className="runtime-app-card-button border-0 bg-transparent p-0 text-center"
      onClick={() => global.platform.openTab({ url: getRuntimeAppUrl(app) })}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        className="runtime-app-card"
        gap={3}
      >
        <Box
          backgroundColor={BoxBackgroundColor.BackgroundSection}
          className="runtime-app-card__icon"
        >
          {Icon ? <Icon aria-hidden="true" /> : null}
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} gap={1}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
          >
            {app.label}
          </Text>
        </Box>
      </Box>
    </button>
  );
};

export const RuntimeTab = () => {
  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      backgroundColor={BoxBackgroundColor.BackgroundDefault}
      className="px-4 py-4"
      gap={4}
    >
      <Box className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {walletRuntimeApps.map((app) => (
          <RuntimeAppCard key={app.id} app={app} />
        ))}
      </Box>
    </Box>
  );
};
