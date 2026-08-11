import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getUseExternalServices } from '../../../selectors';
import { toggleExternalServices } from '../../../store/actions';
import { openBasicFunctionalityModal } from '../../../ducks/app/app';
import { SettingsToggleItem } from '../shared/settings-toggle-item';
import { PrivacyPolicyLink } from '../shared';
import { PRIVACY_ITEMS } from '../search-config';

export const BasicFunctionalityToggleItem = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const useExternalServices = useSelector(getUseExternalServices);

  const handleToggle = (value: boolean) => {
    if (value) {
      dispatch(openBasicFunctionalityModal());
    } else {
      dispatch(toggleExternalServices(true));
    }
  };

  const description = t('basicConfigurationDescriptionV2', [
    <PrivacyPolicyLink key="basic-functionality-privacy-link" />,
  ]);

  return (
    <SettingsToggleItem
      title={t(PRIVACY_ITEMS['basic-functionality'])}
      description={description}
      value={useExternalServices}
      onToggle={handleToggle}
      dataTestId="basic-functionality-toggle"
    />
  );
};
