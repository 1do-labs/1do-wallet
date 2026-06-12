import React from 'react';
import { screen } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import mockState from '../../../../test/data/mock-state.json';
import { ThemeType } from '../../../../shared/constants/preferences';
import {
  TransactionActivityEmptyState,
  type TransactionActivityEmptyStateProps,
} from './transaction-activity-empty-state';

describe('TransactionActivityEmptyState', () => {
  const middleware = [thunk];

  const renderComponent = (
    props: Partial<TransactionActivityEmptyStateProps> = {},
    stateOverrides: Record<string, unknown> = {},
  ) => {
    const state = {
      ...mockState,
      ...stateOverrides,
      metamask: {
        ...mockState.metamask,
        ...(('metamask' in stateOverrides
          ? stateOverrides.metamask
          : {}) as Record<string, unknown>),
      },
    };

    const store = configureMockStore(middleware)(state);

    return renderWithProvider(
      <TransactionActivityEmptyState {...props} />,
      store,
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByTestId('activity-tab-empty-state')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderComponent();
    expect(
      screen.getByText(messages.activityEmptyDescription.message),
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { getByTestId } = renderComponent({ className: 'custom-class' });
    expect(getByTestId('activity-tab-empty-state')).toHaveClass('custom-class');
  });

  it('renders light theme image by default', () => {
    renderComponent();
    const image = screen.getByAltText('Activity');
    expect(image).toHaveAttribute(
      'src',
      './images/empty-state-activity-light.png',
    );
  });

  it('renders dark theme image when dark theme is selected', () => {
    renderComponent(
      {}, // no prop changes
      {
        metamask: { ...mockState.metamask, theme: ThemeType.dark },
      },
    );
    const image = screen.getByAltText('Activity');
    expect(image).toHaveAttribute(
      'src',
      './images/empty-state-activity-dark.png',
    );
  });
});
