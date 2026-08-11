import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getOpenSeaEnabled, getUseNftDetection } from '../../../selectors';
import { setOpenSeaEnabled, setUseNftDetection } from '../../../store/actions';
import { ASSET_ITEMS } from '../search-config';
import { SettingsToggleItem } from './settings-toggle-item';

export const DisplayNftMediaToggleItem = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const openSeaEnabled = useSelector(getOpenSeaEnabled);
  const useNftDetection = useSelector(getUseNftDetection);

  return (
    <SettingsToggleItem
      title={t(ASSET_ITEMS['display-nft-media'])}
      description={t('displayNftMediaDescriptionV2')}
      value={openSeaEnabled}
      onToggle={(value) => {
        if (value && useNftDetection) {
          dispatch(setUseNftDetection(false));
        }
        dispatch(setOpenSeaEnabled(!value));
      }}
      dataTestId="display-nft-media"
    />
  );
};
