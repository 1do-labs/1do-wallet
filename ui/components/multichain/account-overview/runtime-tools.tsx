import React, { useCallback, useState } from 'react';
import { Text, TextColor, TextVariant } from '@metamask/design-system-react';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SmartAccountHeaderButton } from '../app-header/smart-account-header-button';
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

const defaultVisibleAppCount = 4;

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

export const RuntimeTools = () => {
  const t = useI18nContext();
  const [showAllApps, setShowAllApps] = useState(false);
  const [runtimeActive, setRuntimeActive] = useState(false);
  const handleRuntimeStatusChange = useCallback(
    ({ isActive, isChecking }: { isActive: boolean; isChecking: boolean }) => {
      setRuntimeActive(isActive && !isChecking);
    },
    [],
  );
  const visibleApps = showAllApps
    ? walletRuntimeApps
    : walletRuntimeApps.slice(0, defaultVisibleAppCount);

  return (
    <section className="runtime-tools" data-testid="runtime-tools">
      <div className="runtime-tools__header">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {t('runtime')}
        </Text>
        {runtimeActive ? (
          <button
            type="button"
            className="runtime-tools__toggle"
            data-testid="runtime-tools-toggle"
            aria-expanded={showAllApps}
            onClick={() => setShowAllApps((isExpanded) => !isExpanded)}
          >
            {t(showAllApps ? 'showLess' : 'all')}
          </button>
        ) : null}
      </div>
      <SmartAccountHeaderButton
        placement="runtime"
        onStatusChange={handleRuntimeStatusChange}
      />
      {runtimeActive ? (
        <div className="runtime-tools__grid">
          {visibleApps.map((app) => {
            const Icon = ICON_BY_APP_ID[app.id as keyof typeof ICON_BY_APP_ID];

            return (
              <button
                type="button"
                key={app.id}
                className="runtime-tools__item"
                data-testid={`runtime-tool-${app.id}`}
                onClick={() =>
                  global.platform.openTab({ url: getRuntimeAppUrl(app) })
                }
              >
                {Icon ? (
                  <span className="runtime-tools__icon-frame">
                    <Icon
                      aria-hidden="true"
                      className={`runtime-tools__icon runtime-tools__icon--${app.id}`}
                    />
                  </span>
                ) : null}
                <span className="runtime-tools__label">{app.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
