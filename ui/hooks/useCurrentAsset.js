import { useSelector } from 'react-redux';
import { useMatch } from 'react-router-dom';
import { getTokens } from '../ducks/metamask/metamask';
import { getCurrentChainId } from '../../shared/lib/selectors/networks';
import { ASSET_ROUTE } from '../helpers/constants/routes';
import {
  CHAIN_ID_DEFAULT_NATIVE_TOKEN_MAP,
  ETH_NATIVE_TOKEN_OBJECT,
} from '../../shared/constants/native-assets';
import { isEqualCaseInsensitive } from '../../shared/lib/string-utils';

/**
 * Returns a token object for the asset that is currently being viewed.
 * Will return the default token object for the current chain when the
 * user is viewing either the primary, unfiltered, activity list or the
 * default token asset page.
 *
 * @returns {import('./useTokenDisplayValue').Token}
 */
export function useCurrentAsset() {
  const match = useMatch({
    path: `${ASSET_ROUTE}/:asset`,
    end: true,
  });
  const tokenAddress = match?.params?.asset;
  const knownTokens = useSelector(getTokens);
  const token =
    tokenAddress &&
    knownTokens.find(({ address }) =>
      isEqualCaseInsensitive(address, tokenAddress),
    );
  const chainId = useSelector(getCurrentChainId);

  return (
    token ??
    (CHAIN_ID_DEFAULT_NATIVE_TOKEN_MAP[chainId] || ETH_NATIVE_TOKEN_OBJECT)
  );
}
