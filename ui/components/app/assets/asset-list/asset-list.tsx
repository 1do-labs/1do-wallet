import React, { useCallback, useContext } from 'react';
import { useDispatch } from 'react-redux';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../../shared/constants/metametrics';
import { trace, TraceName } from '../../../../../shared/lib/trace';
import { MetaMetricsContext } from '../../../../contexts/metametrics';
import { showImportTokensModal } from '../../../../store/actions';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { Icon, IconName, IconSize } from '../../../component-library';
import { type SafeChain } from '../../../../pages/settings/networks-tab/networks-form/use-safe-chains';
import { usePrimaryCurrencyProperties } from '../hooks';
import TokenList from '../token-list';

export type AssetListProps = {
  onClickAsset: (chainId: string, address: string) => void;
  safeChains?: SafeChain[];
};

const TokenListContainer = React.memo(
  ({
    onClickAsset,
    safeChains,
  }: Pick<AssetListProps, 'onClickAsset' | 'safeChains'>) => {
    const { trackEvent } = useContext(MetaMetricsContext);
    const { primaryCurrencyProperties } = usePrimaryCurrencyProperties();

    const onTokenClick = useCallback(
      (chainId: string, tokenAddress: string) => {
        trace({ name: TraceName.AssetDetails });
        onClickAsset(chainId, tokenAddress);
        trackEvent({
          event: MetaMetricsEventName.TokenScreenOpened,
          category: MetaMetricsEventCategory.Navigation,
          properties: {
            // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
            // eslint-disable-next-line @typescript-eslint/naming-convention
            token_symbol: primaryCurrencyProperties.suffix,
            location: 'Home',
          },
        });
      },
      [onClickAsset, primaryCurrencyProperties.suffix, trackEvent],
    );

    return <TokenList onTokenClick={onTokenClick} safeChains={safeChains} />;
  },
);

const AssetList = ({ onClickAsset, safeChains }: AssetListProps) => {
  const dispatch = useDispatch();
  const t = useI18nContext();
  const { trackEvent } = useContext(MetaMetricsContext);
  const handleImportTokens = useCallback(() => {
    dispatch(showImportTokensModal());
    trackEvent({
      category: MetaMetricsEventCategory.Navigation,
      event: MetaMetricsEventName.TokenImportButtonClicked,
      properties: {
        location: 'HOME',
      },
    });
  }, [dispatch, trackEvent]);

  return (
    <>
      <TokenListContainer onClickAsset={onClickAsset} safeChains={safeChains} />
      <div className="asset-import-footer">
        <button
          type="button"
          className="asset-import-footer__button"
          data-testid="importTokens-button-bottom"
          onClick={handleImportTokens}
        >
          <Icon name={IconName.Add} size={IconSize.Sm} />
          <span>{t('importTokensCamelCase')}</span>
        </button>
      </div>
    </>
  );
};

export default AssetList;
