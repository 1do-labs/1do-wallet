import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import mockState from '../../../../test/data/mock-state.json';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import type { MetaMaskReduxState } from '../../../store/store';
import { createToggleItem, ToggleItemConfig } from './create-toggle-item';

const mockAction = jest.fn((value: boolean) => ({
  type: 'MOCK_TOGGLE_ACTION',
  payload: value,
}));

const createMockStore = (overrides = {}) =>
  configureMockStore([thunk])({
    ...mockState,
    metamask: {
      ...mockState.metamask,
      testToggleValue: false,
      isDisabled: false,
      ...overrides,
    },
  });

const testConfig: ToggleItemConfig = {
  name: 'TestToggleItem',
  titleKey: 'showExtensionInFullSizeView',
  descriptionKey: 'showExtensionInFullSizeViewDescription',
  selector: (state: MetaMaskReduxState) =>
    (state.metamask as Record<string, unknown>).testToggleValue as boolean,
  action: mockAction,
  dataTestId: 'test-toggle',
};

const TestToggleItem = createToggleItem(testConfig);

describe('createToggleItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title from translation key', () => {
    const mockStore = createMockStore();
    renderWithProvider(<TestToggleItem />, mockStore);

    expect(
      screen.getByText(messages.showExtensionInFullSizeView.message),
    ).toBeInTheDocument();
  });

  it('renders description from translation key', () => {
    const mockStore = createMockStore();
    renderWithProvider(<TestToggleItem />, mockStore);

    expect(
      screen.getByText(messages.showExtensionInFullSizeViewDescription.message),
    ).toBeInTheDocument();
  });

  it('renders toggle with value from selector', () => {
    const mockStore = createMockStore({ testToggleValue: true });
    renderWithProvider(<TestToggleItem />, mockStore);

    expect(screen.getByTestId('test-toggle')).toHaveAttribute('value', 'true');
  });

  it('dispatches action with inverted value when toggled', () => {
    const mockStore = createMockStore({ testToggleValue: false });
    renderWithProvider(<TestToggleItem />, mockStore);

    fireEvent.click(screen.getByTestId('test-toggle'));

    expect(mockAction).toHaveBeenCalledWith(true);
  });

  it('dispatches action with false when toggling off', () => {
    const mockStore = createMockStore({ testToggleValue: true });
    renderWithProvider(<TestToggleItem />, mockStore);

    fireEvent.click(screen.getByTestId('test-toggle'));

    expect(mockAction).toHaveBeenCalledWith(false);
  });

  describe('with disabledSelector', () => {
    const configWithDisabled: ToggleItemConfig = {
      ...testConfig,
      dataTestId: 'test-toggle-with-disabled',
      disabledSelector: (state: MetaMaskReduxState) =>
        (state.metamask as Record<string, unknown>).isDisabled as boolean,
    };

    const TestToggleWithDisabled = createToggleItem(configWithDisabled);

    it('is enabled when disabledSelector returns false', () => {
      const mockStore = createMockStore({ isDisabled: false });
      renderWithProvider(<TestToggleWithDisabled />, mockStore);

      const toggle = screen.getByTestId('test-toggle-with-disabled');
      expect(
        toggle.closest('.toggle-button--disabled'),
      ).not.toBeInTheDocument();
    });

    it('is disabled when disabledSelector returns true', () => {
      const mockStore = createMockStore({ isDisabled: true });
      renderWithProvider(<TestToggleWithDisabled />, mockStore);

      const toggle = screen.getByTestId('test-toggle-with-disabled');
      expect(toggle.closest('.toggle-button--disabled')).toBeInTheDocument();
    });
  });

  it('sets displayName from config name', () => {
    expect(TestToggleItem.displayName).toBe('TestToggleItem');
  });

  it('renders without description when descriptionKey is not provided', () => {
    const configWithoutDescription: ToggleItemConfig = {
      ...testConfig,
      descriptionKey: undefined,
      dataTestId: 'test-toggle-no-description',
    };

    const TestToggleWithoutDescription = createToggleItem(
      configWithoutDescription,
    );
    const mockStore = createMockStore();

    renderWithProvider(<TestToggleWithoutDescription />, mockStore);

    expect(
      screen.getByText(messages.showExtensionInFullSizeView.message),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        messages.showExtensionInFullSizeViewDescription.message,
      ),
    ).not.toBeInTheDocument();
  });
});
