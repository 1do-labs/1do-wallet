import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextButton,
  TextButtonSize,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react';
import { useNavigate } from 'react-router-dom';
import ToggleButton from '../../ui/toggle-button';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { GENERAL_ROUTE } from '../../../helpers/constants/routes';
import {
  DEFAULT_ADDRESS_DISPLAY_KEY_BY_SCOPE,
  DefaultAddressScope,
} from '../../../../shared/constants/default-address';
import {
  getDefaultAddressScope,
  getShowDefaultAddressPreference,
} from '../../../selectors';
import { setShowDefaultAddress } from '../../../store/actions';

const METRICS_LOCATION = 'Account Hover Menu';

export const DefaultAddress = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const showDefaultAddress = useSelector(getShowDefaultAddressPreference);
  const defaultAddressScope = useSelector(
    getDefaultAddressScope,
  ) as DefaultAddressScope;
  const defaultScopeDisplayLabel = t(
    DEFAULT_ADDRESS_DISPLAY_KEY_BY_SCOPE[defaultAddressScope],
  );

  return (
    <Box paddingLeft={4} paddingBottom={2}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
      >
        <Box flexDirection={BoxFlexDirection.Column}>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {t('showDefaultAddress')}
          </Text>
          <Box flexDirection={BoxFlexDirection.Row} gap={2}>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {t('default')}: {defaultScopeDisplayLabel}
            </Text>
            <TextButton
              size={TextButtonSize.BodyXs}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                navigate(`${GENERAL_ROUTE}#show-default-address`);
              }}
              data-testid="change-in-settings-link"
            >
              {t('changeInSettings')}
            </TextButton>
          </Box>
        </Box>
        <ToggleButton
          value={showDefaultAddress}
          onToggle={(value: boolean) => {
            const newValue = !value;
            dispatch(setShowDefaultAddress(newValue));
          }}
          dataTestId="show-default-address-toggle"
        />
      </Box>
    </Box>
  );
};
