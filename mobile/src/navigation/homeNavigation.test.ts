import { navigateHomeDetailsToMatchesTab } from './homeNavigation';

describe('navigateHomeDetailsToMatchesTab', () => {
  it('navigates to Matches tab via parent navigator', () => {
    const parentNavigate = jest.fn();
    const navigation = {
      getParent: () => ({ navigate: parentNavigate }),
    };

    navigateHomeDetailsToMatchesTab(navigation as never);

    expect(parentNavigate).toHaveBeenCalledWith('MatchesTab', { screen: 'Matches' });
  });

  it('no-ops when parent navigator is missing', () => {
    const navigation = { getParent: () => undefined };

    expect(() => navigateHomeDetailsToMatchesTab(navigation as never)).not.toThrow();
  });
});
