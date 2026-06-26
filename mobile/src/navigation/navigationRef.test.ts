const mockIsReady = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({ isReady: mockIsReady, navigate: mockNavigate }),
}));

function loadModule() {
  let mod: typeof import('./navigationRef');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs a fresh require to reset module-level state
    mod = require('./navigationRef');
  });
  return mod!;
}

describe('navigationRef', () => {
  beforeEach(() => {
    mockIsReady.mockReset();
    mockNavigate.mockReset();
  });

  it('navigates to About immediately when the container is ready', () => {
    mockIsReady.mockReturnValue(true);
    const { openAbout } = loadModule();

    openAbout();

    expect(mockNavigate).toHaveBeenCalledWith('About');
  });

  it('queues a cold-start tap and replays it once the container is ready', () => {
    mockIsReady.mockReturnValue(false);
    const { openAbout, flushPendingNavigation } = loadModule();

    openAbout();
    expect(mockNavigate).not.toHaveBeenCalled();

    mockIsReady.mockReturnValue(true);
    flushPendingNavigation();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('About');

    // Replaying again must not re-trigger navigation.
    flushPendingNavigation();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('does nothing on ready when no tap is pending', () => {
    mockIsReady.mockReturnValue(true);
    const { flushPendingNavigation } = loadModule();

    flushPendingNavigation();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
