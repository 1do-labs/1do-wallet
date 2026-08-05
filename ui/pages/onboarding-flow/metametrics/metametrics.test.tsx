import React from 'react';
import { waitFor } from '@testing-library/react';
import type { Dispatch, Store } from 'redux';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import {
  ONBOARDING_COMPLETION_ROUTE,
  ONBOARDING_REVIEW_SRP_ROUTE,
} from '../../../helpers/constants/routes';
import {
  setDataCollectionForMarketing,
  setParticipateInMetaMetrics,
} from '../../../store/actions';
import configureStore from '../../../store/store';
import { FirstTimeFlowType } from '../../../../shared/constants/onboarding';
import OnboardingMetametrics from './metametrics';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('../../../store/actions.ts', () => {
  const actionConstants = jest.requireActual('../../../store/actionConstants');
  return {
    setParticipateInMetaMetrics: jest.fn((value) => (dispatch: Dispatch) => {
      dispatch({ type: actionConstants.SET_PARTICIPATE_IN_METAMETRICS, value });
      return Promise.resolve([value]);
    }),
    setDataCollectionForMarketing: jest.fn((value) => (dispatch: Dispatch) => {
      dispatch({
        type: actionConstants.SET_DATA_COLLECTION_FOR_MARKETING,
        value,
      });
      return Promise.resolve([value]);
    }),
  };
});

describe('OnboardingMetametrics', () => {
  let store: Store;

  beforeEach(() => {
    store = configureStore({
      metamask: {
        firstTimeFlowType: FirstTimeFlowType.create,
        participateInMetaMetrics: null,
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opts out of analytics and marketing data collection', async () => {
    const { container } = renderWithProvider(<OnboardingMetametrics />, store);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => {
      expect(setParticipateInMetaMetrics).toHaveBeenCalledWith(false);
      expect(setDataCollectionForMarketing).toHaveBeenCalledWith(false);
    });
  });

  it('continues created wallets to the completion page', async () => {
    renderWithProvider(<OnboardingMetametrics />, store);

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith(
        ONBOARDING_COMPLETION_ROUTE,
        { replace: true },
      );
    });
  });

  it('continues restored wallets to recovery phrase review', async () => {
    store = configureStore({
      metamask: {
        firstTimeFlowType: FirstTimeFlowType.restore,
        participateInMetaMetrics: null,
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    });

    renderWithProvider(<OnboardingMetametrics />, store);

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith(
        ONBOARDING_REVIEW_SRP_ROUTE,
        { replace: true },
      );
    });
  });
});
