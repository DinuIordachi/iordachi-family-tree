/** Query parameter that carries the page a guest tried to open through the login page. */
export const RETURN_URL_PARAM = 'returnUrl';

/**
 * The in-app path to go back to after logging in, or null when there is none worth returning to.
 *
 * Only plain app paths are accepted ("/tree", "/family-members/3?tab=media"): anything else
 * ("https://…", "//host", "/\\host") could send a freshly logged-in user to another site.
 * The login page itself is never a return target.
 */
export function safeReturnUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return null;
  }

  const path = url.split(/[?#]/)[0];
  if (path === '/' || path === '/login' || path.startsWith('/login/')) {
    return null;
  }

  return url;
}
