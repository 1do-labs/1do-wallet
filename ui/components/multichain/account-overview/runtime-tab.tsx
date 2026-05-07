import React from 'react';
import {
  Box,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react';
import {
  getRuntimeAppHostLabel,
  getRuntimeAppUrl,
  getRuntimeAppsForSurface,
} from '../../../../shared/lib/1do-runtime-app-registry';

const walletRuntimeApps = getRuntimeAppsForSurface('wallet');

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
          <button
            key={app.id}
            type="button"
            data-testid={`runtime-app-card-${app.id}`}
            className="rounded-2xl border-0 bg-transparent p-0 text-left"
            onClick={() =>
              global.platform.openTab({ url: getRuntimeAppUrl(app) })
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Column}
              justifyContent={BoxJustifyContent.Between}
              backgroundColor={BoxBackgroundColor.BackgroundSection}
              className="min-h-[132px] rounded-2xl border border-default p-3 transition-transform hover:-translate-y-0.5"
              gap={3}
            >
              <Box
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-bold tracking-[0.12em] ${app.walletBadgeClassName}`}
              >
                {app.walletBadge}
              </Box>
              <Box flexDirection={BoxFlexDirection.Column} gap={1}>
                <Text
                  variant={TextVariant.BodyMdMedium}
                  color={TextColor.textDefault}
                >
                  {app.label}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.textAlternative}
                >
                  {getRuntimeAppHostLabel(app)}
                </Text>
              </Box>
            </Box>
          </button>
        ))}
      </Box>
    </Box>
  );
};
