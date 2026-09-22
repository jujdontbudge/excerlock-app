import * as queryString from 'query-string';

describe('expo-router query string codec', () => {
  it('decodes deep-link query parameters through the patched decoder', () => {
    expect(queryString.parse('code=abc%20def&state=%E2%9C%93')).toEqual({
      code: 'abc def',
      state: '✓',
    });
  });

  it('keeps malformed percent-encoding intact instead of throwing', () => {
    expect(queryString.parse('token=%E0%A4%A')).toEqual({ token: '%E0%A4%A' });
  });

  it('encodes route params for getPathFromState', () => {
    expect(queryString.stringify({ vendor: 'strava', scope: 'a b' }, { sort: false })).toBe(
      'vendor=strava&scope=a%20b',
    );
  });
});
