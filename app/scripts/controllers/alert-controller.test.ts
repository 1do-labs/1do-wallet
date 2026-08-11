/**
 * @jest-environment node
 */
import { deriveStateFromMetadata } from '@metamask/base-controller';
import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import {
  AlertController,
  AlertControllerMessenger,
  AlertControllerOptions,
  getDefaultAlertControllerState,
} from './alert-controller';

const EMPTY_ACCOUNT = {
  id: '',
  address: '',
  options: {},
  methods: [],
  type: EthAccountType.Eoa,
  metadata: {
    name: '',
    keyring: {
      type: '',
    },
    importTime: 0,
  },
};

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AlertControllerMessenger>,
  MessengerEvents<AlertControllerMessenger>
>;

type WithControllerOptions = Partial<AlertControllerOptions>;

type WithControllerCallback<ReturnValue> = ({
  controller,
}: {
  controller: AlertController;
  messenger: RootMessenger;
}) => ReturnValue;

type WithControllerArgs<ReturnValue> =
  | [WithControllerCallback<ReturnValue>]
  | [WithControllerOptions, WithControllerCallback<ReturnValue>];

async function withController<ReturnValue>(
  ...args: WithControllerArgs<ReturnValue>
): Promise<ReturnValue> {
  const [{ ...rest }, fn] = args.length === 2 ? args : [{}, args[0]];
  const { ...alertControllerOptions } = rest;

  const messenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const alertControllerMessenger: AlertControllerMessenger = new Messenger({
    namespace: 'AlertController',
    parent: messenger,
  });
  messenger.delegate({
    messenger: alertControllerMessenger,
    actions: ['AccountsController:getSelectedAccount'],
    events: ['AccountsController:selectedAccountChange'],
  });

  messenger.registerActionHandler(
    'AccountsController:getSelectedAccount',
    jest.fn().mockReturnValue(EMPTY_ACCOUNT),
  );

  const controller = new AlertController({
    messenger: alertControllerMessenger,
    ...alertControllerOptions,
  });

  return await fn({
    controller,
    messenger,
  });
}

describe('AlertController', () => {
  describe('default state', () => {
    it('should be same as AlertControllerState initialized', async () => {
      await withController(({ controller }) => {
        expect(controller.state).toStrictEqual(
          getDefaultAlertControllerState(),
        );
      });
    });
  });

  describe('alertEnabledness', () => {
    it('should default unconnectedAccount of alertEnabledness to true', async () => {
      await withController(({ controller }) => {
        expect(
          controller.state.alertEnabledness.unconnectedAccount,
        ).toStrictEqual(true);
      });
    });

    it('should set unconnectedAccount of alertEnabledness to false', async () => {
      await withController(({ controller }) => {
        controller.setAlertEnabledness('unconnectedAccount', false);
        expect(
          controller.state.alertEnabledness.unconnectedAccount,
        ).toStrictEqual(false);
      });
    });
  });

  describe('unconnectedAccountAlertShownOrigins', () => {
    it('should default unconnectedAccountAlertShownOrigins', async () => {
      await withController(({ controller }) => {
        expect(
          controller.state.unconnectedAccountAlertShownOrigins,
        ).toStrictEqual({});
      });
    });

    it('should set unconnectedAccountAlertShownOrigins', async () => {
      await withController(({ controller }) => {
        controller.setUnconnectedAccountAlertShown('testUnconnectedOrigin');
        expect(
          controller.state.unconnectedAccountAlertShownOrigins,
        ).toStrictEqual({
          testUnconnectedOrigin: true,
        });
      });
    });
  });

  describe('selectedAccount change', () => {
    it('should set unconnectedAccountAlertShownOrigins to {}', async () => {
      await withController(({ controller, messenger }) => {
        messenger.publish('AccountsController:selectedAccountChange', {
          id: '',
          address: '0x1234567',
          options: {},
          methods: [],
          scopes: [EthScope.Eoa],
          type: EthAccountType.Eoa,
          metadata: {
            name: '',
            keyring: {
              type: '',
            },
            importTime: 0,
          },
        });
        expect(
          controller.state.unconnectedAccountAlertShownOrigins,
        ).toStrictEqual({});
      });
    });
  });

  describe('metadata', () => {
    it('includes expected state in debug snapshots', async () => {
      await withController(({ controller }) => {
        expect(
          deriveStateFromMetadata(
            controller.state,
            controller.metadata,
            'includeInDebugSnapshot',
          ),
        ).toMatchInlineSnapshot(`
          {
            "alertEnabledness": {
              "unconnectedAccount": true,
            },
          }
        `);
      });
    });

    it('includes expected state in state logs', async () => {
      await withController(({ controller }) => {
        expect(
          deriveStateFromMetadata(
            controller.state,
            controller.metadata,
            'includeInStateLogs',
          ),
        ).toMatchInlineSnapshot(`
          {
            "alertEnabledness": {
              "unconnectedAccount": true,
            },
            "unconnectedAccountAlertShownOrigins": {},
          }
        `);
      });
    });

    it('persists expected state', async () => {
      await withController(({ controller }) => {
        expect(
          deriveStateFromMetadata(
            controller.state,
            controller.metadata,
            'persist',
          ),
        ).toMatchInlineSnapshot(`
          {
            "alertEnabledness": {
              "unconnectedAccount": true,
            },
            "unconnectedAccountAlertShownOrigins": {},
          }
        `);
      });
    });

    it('exposes expected state to UI', async () => {
      await withController(({ controller }) => {
        expect(
          deriveStateFromMetadata(
            controller.state,
            controller.metadata,
            'usedInUi',
          ),
        ).toMatchInlineSnapshot(`
          {
            "alertEnabledness": {
              "unconnectedAccount": true,
            },
            "unconnectedAccountAlertShownOrigins": {},
          }
        `);
      });
    });
  });
});
