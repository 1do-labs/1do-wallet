import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getDataCollectionForMarketing,
  getParticipateInMetaMetrics,
} from '../../../selectors/metametrics';
import { getUseExternalServices } from '../../../selectors';
import { setDataCollectionForMarketing } from '../../../store/actions';
import { SettingsToggleItem } from '../shared/settings-toggle-item';
import { PRIVACY_ITEMS } from '../search-config';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsUserTrait,
} from '../../../../shared/constants/metametrics';

export const DataCollectionToggleItem = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const { trackEvent } = useContext(MetaMetricsContext);

  const dataCollectionForMarketing = useSelector(getDataCollectionForMarketing);
  const useExternalServices = useSelector(getUseExternalServices);
  const participateInMetaMetrics = useSelector(getParticipateInMetaMetrics);

  const isDisabled = !useExternalServices || !participateInMetaMetrics;

  const handleToggle = (currentValue: boolean) => {
    const newValue = !currentValue;

    dispatch(setDataCollectionForMarketing(newValue));

    trackEvent({
      category: MetaMetricsEventCategory.Settings,
      event: MetaMetricsEventName.AnalyticsPreferenceSelected,
      properties: {
        /* eslint-disable @typescript-eslint/naming-convention */
        [MetaMetricsUserTrait.IsMetricsOptedIn]: true,
        [MetaMetricsUserTrait.HasMarketingConsent]: Boolean(newValue),
        /* eslint-enable @typescript-eslint/naming-convention */
        location: 'Settings',
      },
    });
  };

  return (
    <SettingsToggleItem
      title={t(PRIVACY_ITEMS['data-collection'])}
      description={t('dataCollectionForMarketingDescription')}
      value={dataCollectionForMarketing}
      onToggle={handleToggle}
      dataTestId="data-collection-for-marketing-input"
      containerDataTestId="data-collection-for-marketing-toggle"
      disabled={isDisabled}
    />
  );
};
