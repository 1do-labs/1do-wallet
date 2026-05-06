import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import {
  getEnabledNetworksByNamespace,
  getSelectedInternalAccount,
} from '../../../../selectors';
import {
  TranslateFunction,
  networkTitleOverrides,
} from '../util/networkTitleOverrides';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { formatWithThreshold } from '../util/formatWithThreshold';
import { getIntlLocale } from '../../../../ducks/locale/locale';
import { getCurrentCurrency } from '../../../../ducks/metamask/metamask';
import { TokenWithFiatAmount } from '../types';
import { getMultiChainAssets } from '../../../../selectors/assets';
import { filterAssets } from '../util/filter';

const useMultiChainAssets = () => {
  const t = useI18nContext();
  const locale = useSelector(getIntlLocale);
  const selectedAccount = useSelector(getSelectedInternalAccount);
  const currentCurrency = useSelector(getCurrentCurrency);
  const enabledNetworksByNamespace = useSelector(getEnabledNetworksByNamespace);

  const multichainAssets = useSelector((state) =>
    getMultiChainAssets(state, selectedAccount),
  );

  const filteredMultichainAssets = useMemo(() => {
    return filterAssets(multichainAssets, [
      {
        key: 'chainId',
        opts: enabledNetworksByNamespace,
        filterCallback: 'inclusive',
      },
    ]);
  }, [multichainAssets, enabledNetworksByNamespace]);

  return filteredMultichainAssets.map((asset: TokenWithFiatAmount) => {
    const fiatAmount = formatWithThreshold(asset.secondary, 0.01, locale, {
      style: 'currency',
      currency: currentCurrency.toUpperCase(),
    });

    return {
      ...asset,
      title: asset.isNative
        ? networkTitleOverrides(t as TranslateFunction, {
            title: asset.title,
          })
        : asset.title,

      secondary: fiatAmount, // secondary balance (usually in fiat)
    };
  });
};

export default useMultiChainAssets;
