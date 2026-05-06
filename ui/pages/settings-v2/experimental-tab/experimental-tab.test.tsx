import React from 'react';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { LegacyMetaMetricsProvider } from '../../../contexts/metametrics';
import ExperimentalTab from './experimental-tab';

const render = (overrideMetaMaskState = {}) => {
  const store = configureStore({
    metamask: {
      ...mockState.metamask,
      ...overrideMetaMaskState,
    },
  });
  return renderWithProvider(
    <LegacyMetaMetricsProvider>
      <ExperimentalTab />
    </LegacyMetaMetricsProvider>,
    store,
  );
};

describe('ExperimentalTab', () => {
  it('renders ExperimentalTab component without error', () => {
    expect(() => {
      render();
    }).not.toThrow();
  });

  it('renders no experimental toggles in this build', () => {
    const { queryAllByRole } = render();
    const toggles = queryAllByRole('checkbox');

    expect(toggles).toHaveLength(0);
  });
});
