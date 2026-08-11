import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import type { MetaMaskReduxState } from '../../../store/store';
import type { SettingItemProps } from '../types';
import { SettingsToggleItem } from './settings-toggle-item';

const selectAlwaysFalse = (): boolean => false;

type TranslateFunction = ReturnType<typeof useI18nContext>;

export type ToggleItemConfig = {
  name: string;
  titleKey: string;
  /** Simple description via i18n key */
  descriptionKey?: string;
  /** Custom description formatter. Receives translation function for i18n. Takes precedence over descriptionKey. */
  formatDescription?: (t: TranslateFunction) => string | React.ReactNode;
  selector: (state: MetaMaskReduxState) => boolean;
  action: (value: boolean) => unknown;
  dataTestId: string;
  containerDataTestId?: string;
  disabledSelector?: (state: MetaMaskReduxState) => boolean;
};

/**
 * Factory function to create a simple toggle settings item component.
 * @param config
 */
export const createToggleItem = (
  config: ToggleItemConfig,
): React.FC<SettingItemProps> => {
  const ToggleItem = () => {
    const t = useI18nContext();
    const dispatch = useDispatch();
    const value = useSelector(config.selector);
    const disabled = useSelector(config.disabledSelector ?? selectAlwaysFalse);

    const handleToggle = (currentValue: boolean) => {
      const newValue = !currentValue;

      const result = config.action(newValue);
      if (result !== undefined) {
        dispatch(result);
      }
    };

    let description: string | React.ReactNode;
    if (config.formatDescription) {
      description = config.formatDescription(t);
    } else if (config.descriptionKey) {
      description = t(config.descriptionKey);
    }

    return (
      <SettingsToggleItem
        title={t(config.titleKey)}
        description={description}
        value={value}
        onToggle={handleToggle}
        dataTestId={config.dataTestId}
        containerDataTestId={config.containerDataTestId}
        disabled={disabled}
      />
    );
  };

  ToggleItem.displayName = config.name;
  return ToggleItem;
};
