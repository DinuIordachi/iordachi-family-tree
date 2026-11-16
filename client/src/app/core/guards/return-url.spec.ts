import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps in-app paths with their query and fragment', () => {
    expect(safeReturnUrl('/tree')).toBe('/tree');
    expect(safeReturnUrl('/family-members/3?tab=media#photos')).toBe('/family-members/3?tab=media#photos');
  });

  it('has nothing to return to without a page, at the root or on the login page', () => {
    for (const url of [null, undefined, '', '/', '/login', '/login?returnUrl=%2Ftree', '/login/']) {
      expect(safeReturnUrl(url)).toBeNull();
    }
  });

  it('never leaves the app', () => {
    for (const url of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'tree']) {
      expect(safeReturnUrl(url)).toBeNull();
    }
  });
});
