import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getOpenSeaEnabled, getUseNftDetection } from '../../../selectors';
import { setOpenSeaEnabled, setUseNftDetection } from '../../../store/actions';
import { ASSET_ITEMS } from '../search-config';
import { SettingsToggleItem } from './settings-toggle-item';

export const AutodetectNftsToggleItem = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const openSeaEnabled = useSelector(getOpenSeaEnabled);
  const useNftDetection = useSelector(getUseNftDetection);

  return (
    <SettingsToggleItem
      title={t(ASSET_ITEMS['autodetect-nfts'])}
      description={t('useNftDetectionDescription')}
      value={useNftDetection}
      onToggle={(value) => {
        if (!value && !openSeaEnabled) {
          dispatch(setOpenSeaEnabled(true));
        }
        dispatch(setUseNftDetection(!value));
      }}
      dataTestId="use-nft-detection-input"
      containerDataTestId="use-nft-detection"
    />
  );
};
