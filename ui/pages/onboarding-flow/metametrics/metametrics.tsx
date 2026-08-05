import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import log from 'loglevel';
import {
  setDataCollectionForMarketing,
  setParticipateInMetaMetrics,
} from '../../../store/actions';
import {
  getCurrentKeyring,
  getFirstTimeFlowType,
  getFirstTimeFlowTypeRouteAfterMetaMetricsOptIn,
} from '../../../selectors';
import { PLATFORM_FIREFOX } from '../../../../shared/constants/app';
import { FirstTimeFlowType } from '../../../../shared/constants/onboarding';
import { getBrowserName } from '../../../../shared/lib/browser-runtime.utils';
import {
  ONBOARDING_COMPLETION_ROUTE,
  ONBOARDING_WELCOME_ROUTE,
} from '../../../helpers/constants/routes';

const isFirefox = getBrowserName() === PLATFORM_FIREFOX;

/**
 * Keeps the historical MetaMetrics route compatible while making 1Do
 * onboarding privacy-first. New users are opted out and immediately continue
 * to the next onboarding step without seeing a consent screen.
 */
export default function OnboardingMetametrics() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentKeyring = useSelector(getCurrentKeyring);
  const firstTimeFlowType = useSelector(getFirstTimeFlowType);
  let nextRoute = useSelector(getFirstTimeFlowTypeRouteAfterMetaMetricsOptIn);

  if (isFirefox && firstTimeFlowType !== FirstTimeFlowType.restore) {
    nextRoute = currentKeyring
      ? ONBOARDING_COMPLETION_ROUTE
      : ONBOARDING_WELCOME_ROUTE;
  }

  useEffect(() => {
    const optOutAndContinue = async () => {
      try {
        await dispatch(setParticipateInMetaMetrics(false));
        await dispatch(setDataCollectionForMarketing(false));
      } catch (error) {
        log.error('Unable to save onboarding analytics opt-out:', error);
      } finally {
        navigate(nextRoute, { replace: true });
      }
    };

    optOutAndContinue();
  }, [dispatch, navigate, nextRoute]);

  return null;
}
