import { connect } from 'react-redux';
import { compose } from 'redux';
import withRouterHooks from '../../../helpers/higher-order-components/with-router-hooks/with-router-hooks';
import {
  setIpfsGateway,
  setIsIpfsGatewayEnabled,
  setUseCurrencyRateCheck,
  setUseMultiAccountBalanceChecker,
  setUsePhishDetect,
  setUseTokenDetection,
  toggleExternalServices,
  setUseAddressBarEnsResolution,
  setOpenSeaEnabled,
  setUseNftDetection,
  setUse4ByteResolution,
  setUseSafeChainsListValidation,
  setUseTransactionSimulations,
  setSkipDeepLinkInterstitial,
} from '../../../store/actions';
import { getPreferences } from '../../../selectors';
import { getNetworkConfigurationsByChainId } from '../../../../shared/lib/selectors/networks';
import { openBasicFunctionalityModal } from '../../../ducks/app/app';
import { getIsPrimarySeedPhraseBackedUp } from '../../../ducks/metamask/metamask';
import SecurityTab from './security-tab.component';

const mapStateToProps = (state) => {
  const { metamask } = state;

  const {
    usePhishDetect,
    useTokenDetection,
    ipfsGateway,
    useMultiAccountBalanceChecker,
    useSafeChainsListValidation,
    useCurrencyRateCheck,
    useAddressBarEnsResolution,
    openSeaEnabled,
    useNftDetection,
    use4ByteResolution,
    useExternalServices,
  } = metamask;

  const { skipDeepLinkInterstitial } = getPreferences(state);

  const networkConfigurations = getNetworkConfigurationsByChainId(state);

  return {
    networkConfigurations,
    usePhishDetect,
    useTokenDetection,
    ipfsGateway,
    useMultiAccountBalanceChecker,
    useSafeChainsListValidation,
    useCurrencyRateCheck,
    useAddressBarEnsResolution,
    openSeaEnabled,
    useNftDetection,
    use4ByteResolution,
    useExternalServices,
    useTransactionSimulations: metamask.useTransactionSimulations,
    skipDeepLinkInterstitial: Boolean(skipDeepLinkInterstitial),
    isSeedPhraseBackedUp: getIsPrimarySeedPhraseBackedUp(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setUsePhishDetect: (val) => dispatch(setUsePhishDetect(val)),
    setUseCurrencyRateCheck: (val) => dispatch(setUseCurrencyRateCheck(val)),
    setUseTokenDetection: (val) => dispatch(setUseTokenDetection(val)),
    setIpfsGateway: (val) => dispatch(setIpfsGateway(val)),
    setIsIpfsGatewayEnabled: (val) => dispatch(setIsIpfsGatewayEnabled(val)),
    setUseMultiAccountBalanceChecker: (val) =>
      dispatch(setUseMultiAccountBalanceChecker(val)),
    setUseAddressBarEnsResolution: (val) =>
      dispatch(setUseAddressBarEnsResolution(val)),
    setUseSafeChainsListValidation: (val) =>
      dispatch(setUseSafeChainsListValidation(val)),
    setBasicFunctionalityModalOpen: () =>
      dispatch(openBasicFunctionalityModal()),
    setSkipDeepLinkInterstitial: (val) =>
      dispatch(setSkipDeepLinkInterstitial(val)),
    setOpenSeaEnabled: (val) => dispatch(setOpenSeaEnabled(val)),
    setUseNftDetection: (val) => dispatch(setUseNftDetection(val)),
    setUse4ByteResolution: (value) => {
      return dispatch(setUse4ByteResolution(value));
    },
    toggleExternalServices: (value) => {
      return dispatch(toggleExternalServices(value));
    },
    setUseTransactionSimulations: (value) => {
      return dispatch(setUseTransactionSimulations(value));
    },
  };
};

export default compose(
  withRouterHooks,
  connect(mapStateToProps, mapDispatchToProps),
)(SecurityTab);
