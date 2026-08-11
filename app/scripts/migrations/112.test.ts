import { migrate, version } from './112';

describe('migration #112', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('updates the version metadata', async () => {
    const oldStorage = {
      meta: { version: 111 },
      data: {},
    };

    const newStorage = await migrate(oldStorage);

    expect(newStorage.meta).toStrictEqual({ version });
  });

  it('does nothing if SelectedNetworkController is not present', async () => {
    const oldState = {
      OtherController: {},
    };

    const transformedState = await migrate({
      meta: { version: 111 },
      data: oldState,
    });

    expect(transformedState.data).toEqual(oldState);
  });

  it('deletes the perDomainNetwork property', async () => {
    const oldState = {
      SelectedNetworkController: {
        perDomainNetwork: true,
        domains: {},
      },
    };

    const expectedState = {
      SelectedNetworkController: {
        domains: {},
      },
    };

    const transformedState = await migrate({
      meta: { version: 111 },
      data: oldState,
    });

    expect(transformedState.data).toEqual(expectedState);
  });
});
