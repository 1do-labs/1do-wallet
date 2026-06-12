// Unicode confusables is not typed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { confusables } from 'unicode-confusables';

import { getTokenStandardAndDetailsByChain } from '../../../store/actions';

import { RecipientValidationResult } from '../types/send';
import { LOWER_CASED_BURN_ADDRESSES } from '../constants/token';

export const findConfusablesInRecipient = (
  address: string,
): RecipientValidationResult => {
  const confusableCollection = confusables(address) as {
    point: string;
    similarTo: string;
  }[];

  // First filter out duplicate points, then filter by similarTo
  const uniquePoints = new Set<string>();
  const confusableCharacters = confusableCollection
    .filter(({ point }) => {
      if (uniquePoints.has(point)) {
        return false;
      }
      uniquePoints.add(point);
      return true;
    })
    .filter(({ similarTo }) => similarTo !== undefined);

  if (confusableCharacters.length) {
    const hasZeroWidthCharacters = confusableCharacters.some(
      ({ similarTo }) => similarTo === '',
    );

    if (hasZeroWidthCharacters) {
      return {
        error: 'invalidAddress',
        warning: 'confusableZeroWidthUnicode',
      };
    }

    return {
      confusableCharacters,
    };
  }
  return {};
};

export const validateEvmHexAddress = async (
  address: string,
  chainId?: string,
  assetAddress?: string,
) => {
  if (LOWER_CASED_BURN_ADDRESSES.includes(address.toLowerCase())) {
    return {
      error: 'invalidAddress',
    };
  }

  if (address?.toLowerCase() === assetAddress?.toLowerCase()) {
    return {
      error: 'contractAddressError',
    };
  }

  if (chainId) {
    const tokenDetails = await getTokenStandardAndDetailsByChain(
      address,
      undefined,
      undefined,
      chainId,
    );
    if (tokenDetails?.standard) {
      return {
        error: 'tokenContractError',
        allowAcknowledge: true,
      };
    }
  }

  return {};
};
