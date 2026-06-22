import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Text } from '../../../../components/component-library';
import { SrpList } from '../../../../components/multichain/multi-srp/srp-list/srp-list';
import {
  TextColor,
  TextTransform,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import {
  ONBOARDING_REVIEW_SRP_ROUTE,
  REVEAL_SEED_ROUTE,
} from '../../../../helpers/constants/routes';

export const RevealSrpList = () => {
  const t = useI18nContext();
  const navigate = useNavigate();

  const onSrpActionComplete = (keyringId: string, triggerBackup?: boolean) => {
    if (triggerBackup) {
      const backUpSRPRoute = `${ONBOARDING_REVIEW_SRP_ROUTE}/?isFromReminder=true&isFromSettingsSecurity=true`;
      navigate(backUpSRPRoute);
    } else {
      navigate(`${REVEAL_SEED_ROUTE}/${keyringId}`);
    }
  };

  return (
    <Box className="srp-reveal-list">
      <Box
        paddingTop={4}
        paddingLeft={4}
        paddingRight={4}
        paddingBottom={0}
        className="srp-reveal-list__srp-list"
        data-testid="select-srp-container"
      >
        <Text
          marginBottom={2}
          variant={TextVariant.bodyMd}
          color={TextColor.textAlternative}
          textTransform={TextTransform.Uppercase}
        >
          {t('securitySrpLabel')}
        </Text>
        <SrpList onActionComplete={onSrpActionComplete} />
      </Box>
    </Box>
  );
};
