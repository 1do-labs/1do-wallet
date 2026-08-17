import { NftDetectionControllerMessenger } from '@metamask/assets-controllers';
import { PreferencesController } from '@metamask/preferences-controller';
import { buildControllerInitRequestMock } from '../test/utils';
import { MessengerClientInitRequest } from '../types';
import { getNftDetectionControllerMessenger } from '../messengers/assets';
import { getRootMessenger } from '../../lib/messenger';
import { AlchemyNftDetectionController } from '../../controllers/alchemy-nft-detection-controller';
import { NftDetectionControllerInit } from './nft-detection-controller-init';

/**
 * Build a mock PreferencesController.
 *
 * @param partialMock - A partial mock object for the PreferencesController, merged
 * with the default mock.
 * @returns A mock PreferencesController.
 */
function buildControllerMock(
  partialMock?: Partial<PreferencesController>,
): PreferencesController {
  const defaultPreferencesControllerMock = {
    state: { useNftDetection: true },
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  return {
    ...defaultPreferencesControllerMock,
    ...partialMock,
  };
}

function buildInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<NftDetectionControllerMessenger>
> {
  const baseControllerMessenger = getRootMessenger();

  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getNftDetectionControllerMessenger(
      baseControllerMessenger,
    ),
    initMessenger: undefined,
  };
  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  requestMock.getMessengerClient.mockReturnValue(buildControllerMock());

  return requestMock;
}

describe('NftDetectionControllerInit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(
      NftDetectionControllerInit(requestMock).messengerClient,
    ).toBeInstanceOf(AlchemyNftDetectionController);
  });

  it('gets the NFT detection preference', () => {
    const requestMock = buildInitRequestMock();
    NftDetectionControllerInit(requestMock);

    expect(requestMock.getMessengerClient).toHaveBeenCalledWith(
      'PreferencesController',
    );
  });
});
