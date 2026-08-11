import React from 'react';
import mockState from '../../../../test/data/mock-state.json';
import configureStore from '../../../store/store';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { AccountOverviewTabs } from './account-overview-tabs';

jest.mock('../../../store/actions', () => ({
  setDefaultHomeActiveTabName: jest.fn(),
}));

jest.mock('../../app/assets/asset-list', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: () => null,
}));

jest.mock('../activity-v2/activity-list', () => ({
  ActivityList: () => null,
}));

jest.mock('../activity-v2/hooks', () => ({
  usePrefetchTransactions: () => jest.fn(),
}));

jest.mock('../../app/assets/nfts/nfts-tab', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: () => null,
}));

jest.mock('./runtime-tab', () => ({
  RuntimeTab: () => <div data-testid="runtime-tab-panel" />,
}));

describe('AccountOverviewTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders runtime tab when enabled', () => {
    const store = configureStore({
      metamask: mockState.metamask,
    });

    const { getByTestId } = renderWithProvider(
      <AccountOverviewTabs
        showTokens={true}
        showNfts={false}
        showActivity={true}
        showRuntime={true}
        setBasicFunctionalityModalOpen={jest.fn()}
        onSupportLinkClick={jest.fn()}
      />,
      store,
    );

    expect(getByTestId('account-overview__runtime-tab')).toBeInTheDocument();
  });
});
