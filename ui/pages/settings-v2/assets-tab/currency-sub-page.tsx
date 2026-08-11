import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react';
import availableCurrencies from '../../../helpers/constants/available-conversions.json';
import { setCurrentCurrency } from '../../../store/actions';
import { ASSETS_ROUTE } from '../../../helpers/constants/routes';
import { getCurrentCurrency } from '../../../ducks/metamask/metamask';

const sortedCurrencies = [...availableCurrencies].sort((a, b) =>
  a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
);

const currencyOptions = sortedCurrencies.map(({ code, name }) => ({
  value: code,
  label: `${code.toUpperCase()} - ${name}`,
}));

const CurrencySubPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentCurrency = useSelector(getCurrentCurrency).toLowerCase();

  const handleSelect = (value: string) => {
    dispatch(setCurrentCurrency(value));
    navigate(ASSETS_ROUTE);
  };

  return (
    <Box
      data-testid="currency-select-list"
      className="h-full min-h-0 overflow-y-auto"
    >
      {currencyOptions.map(({ value, label }) => {
        const isSelected = value.toLowerCase() === currentCurrency;
        return (
          <Box
            key={value}
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
            className={`w-full cursor-pointer border-0 p-4 ${
              isSelected
                ? 'bg-muted hover:bg-muted-hover'
                : 'bg-background-default hover:bg-background-default-hover'
            }`}
            onClick={() => handleSelect(value)}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {label}
            </Text>
            {isSelected && (
              <Icon
                name={IconName.Check}
                size={IconSize.Md}
                color={IconColor.IconDefault}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default CurrencySubPage;
