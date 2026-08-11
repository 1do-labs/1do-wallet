import React, { useCallback, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { trace, TraceName } from '../../../../../shared/lib/trace';
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
    const { primaryCurrencyProperties } = usePrimaryCurrencyProperties();

    const onTokenClick = useCallback(
      (chainId: string, tokenAddress: string) => {
        trace({ name: TraceName.AssetDetails });
        onClickAsset(chainId, tokenAddress);
      },
      [onClickAsset, primaryCurrencyProperties.suffix],
    );

    return <TokenList onTokenClick={onTokenClick} safeChains={safeChains} />;
  },
);

const AssetList = ({ onClickAsset, safeChains }: AssetListProps) => {
  const dispatch = useDispatch();
  const t = useI18nContext();
  const handleImportTokens = useCallback(() => {
    dispatch(showImportTokensModal());
  }, [dispatch]);

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
