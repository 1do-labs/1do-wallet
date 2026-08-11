import React, { useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Hex } from '@metamask/utils';
import ErrorBoundary from '../../app/error-boundary/error-boundary';
import {
  ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP,
  AccountOverviewTabKey,
  AccountOverviewTab,
} from '../../../../shared/constants/app-state';
import { endTrace, trace } from '../../../../shared/lib/trace';
import { ASSET_ROUTE } from '../../../helpers/constants/routes';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useTabState } from '../../../hooks/useTabState';
import { useSafeChains } from '../../../pages/settings/networks-tab/networks-form/use-safe-chains';
import {
  getDefaultHomeActiveTabName,
  getEnabledChainIds,
} from '../../../selectors';
import {
  detectNfts,
  setDefaultHomeActiveTabName,
} from '../../../store/actions';
import AssetList from '../../app/assets/asset-list';
import NftsTab from '../../app/assets/nfts/nfts-tab';
import { Tab, Tabs } from '../../ui/tabs';
import { useTokenBalances } from '../../../hooks/useTokenBalances';
import { ActivityList } from '../activity-v2/activity-list';
import { usePrefetchTransactions } from '../activity-v2/hooks';
import { transitionForward } from '../../ui/transition';
import { AccountOverviewCommonProps } from './common';
import { RuntimeTab } from './runtime-tab';

export type AccountOverviewTabsProps = AccountOverviewCommonProps & {
  showTokens: boolean;
  showNfts: boolean;
  showActivity: boolean;
  showRuntime?: boolean;
};

export const AccountOverviewTabs = ({
  showTokens,
  showNfts,
  showActivity,
  showRuntime,
}: AccountOverviewTabsProps) => {
  const persistedTab = useSelector(getDefaultHomeActiveTabName);
  const [urlTab, setActiveTabKey] = useTabState();
  const activeTabKey = urlTab || persistedTab;

  const navigate = useNavigate();
  const t = useI18nContext();
  const dispatch = useDispatch();
  const selectedChainIds = useSelector(getEnabledChainIds);
  const prefetchTransactions = usePrefetchTransactions();

  useEffect(() => {
    if (activeTabKey in ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP) {
      setDefaultHomeActiveTabName(activeTabKey);
    }
  }, [activeTabKey]);

  // EVM specific tokenBalance polling, updates state via polling loop per chainId
  useTokenBalances({
    chainIds: selectedChainIds as Hex[],
  });

  const handleTabClick = useCallback(
    (tabName: AccountOverviewTab) => {
      if (activeTabKey in ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP) {
        endTrace({
          name: ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP[activeTabKey],
        });
      }

      setActiveTabKey(tabName);

      if (tabName === AccountOverviewTabKey.Nfts) {
        dispatch(detectNfts(selectedChainIds));
      }
      if (tabName in ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP) {
        trace({
          name: ACCOUNT_OVERVIEW_TAB_KEY_TO_TRACE_NAME_MAP[tabName],
        });
      }
    },
    [activeTabKey, setActiveTabKey, dispatch, selectedChainIds],
  );

  const onClickAsset = useCallback(
    (chainId: string, asset: string) =>
      transitionForward(() =>
        navigate(`${ASSET_ROUTE}/${chainId}/${encodeURIComponent(asset)}`),
      ),
    [navigate],
  );
  const { safeChains } = useSafeChains();

  return (
    <Tabs<AccountOverviewTab>
      animated
      activeTab={activeTabKey}
      onTabClick={handleTabClick}
      tabListProps={{
        className: 'account-overview__tabs-list px-4',
      }}
    >
      {showTokens && (
        <Tab
          name={t('tokens')}
          tabKey={AccountOverviewTabKey.Tokens}
          data-testid="account-overview__asset-tab"
        >
          <ErrorBoundary key="tokens">
            <AssetList onClickAsset={onClickAsset} safeChains={safeChains} />
          </ErrorBoundary>
        </Tab>
      )}

      {showNfts && (
        <Tab
          name={t('nfts')}
          tabKey={AccountOverviewTabKey.Nfts}
          data-testid="account-overview__nfts-tab"
        >
          <ErrorBoundary key="nfts">
            <NftsTab />
          </ErrorBoundary>
        </Tab>
      )}

      {showActivity && (
        <Tab
          name={t('activity')}
          tabKey={AccountOverviewTabKey.Activity}
          data-testid="account-overview__activity-tab"
          onMouseEnter={prefetchTransactions}
        >
          <ErrorBoundary key="activity">
            <ActivityList />
          </ErrorBoundary>
        </Tab>
      )}

      {showRuntime && (
        <Tab
          name={t('runtime')}
          tabKey={AccountOverviewTabKey.Runtime}
          data-testid="account-overview__runtime-tab"
        >
          <RuntimeTab />
        </Tab>
      )}
    </Tabs>
  );
};
