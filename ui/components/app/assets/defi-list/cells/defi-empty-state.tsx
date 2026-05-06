import React, { FC } from 'react';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { useTheme } from '../../../../../hooks/useTheme';
import { TabEmptyState } from '../../../../ui/tab-empty-state';
import { ThemeType } from '../../../../../../shared/constants/preferences';

export const DeFiEmptyStateMessage: FC = () => {
  const t = useI18nContext();
  const theme = useTheme();

  const defiIcon =
    theme === ThemeType.dark
      ? '/images/empty-state-defi-dark.png'
      : '/images/empty-state-defi-light.png';

  return (
    <TabEmptyState
      icon={<img src={defiIcon} alt={t('defi')} width={72} height={72} />}
      description={t('defiEmptyDescription')}
      data-testid="defi-tab-empty-state"
      className="mx-auto mt-5 mb-6 max-w-48"
    />
  );
};
