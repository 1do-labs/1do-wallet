import { fireEvent } from '@testing-library/react';
import React from 'react';
import { renderWithProvider } from '../../../test/lib/render-helpers-navigate';
import { useI18nContext } from '../../hooks/useI18nContext';
import { reloadExtensionFromUi } from '../../helpers/utils/reload-extension-from-ui';
import ErrorPage from './error-page.component';

jest.mock('../../hooks/useI18nContext', () => ({
  useI18nContext: jest.fn(() => (key: string) => key),
}));
jest.mock('../../helpers/utils/reload-extension-from-ui', () => ({
  reloadExtensionFromUi: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../helpers/utils/window', () => ({ openWindow: jest.fn() }));

describe('ErrorPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders provided error details', () => {
    const { getByTestId } = renderWithProvider(
      <ErrorPage error={{ message: 'Failure', code: '500', name: 'Error' }} />,
    );

    expect(getByTestId('error-page-error-message')).toBeInTheDocument();
    expect(getByTestId('error-page-error-code')).toBeInTheDocument();
    expect(getByTestId('error-page-error-name')).toBeInTheDocument();
  });

  it('reloads the extension from the try again action', () => {
    const { getByTestId } = renderWithProvider(<ErrorPage error={{}} />);

    fireEvent.click(getByTestId('error-page-try-again-button'));

    expect(reloadExtensionFromUi).toHaveBeenCalledTimes(1);
  });
});
