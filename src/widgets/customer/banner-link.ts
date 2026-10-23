import type { Href } from 'expo-router';

/**
 * Maps a CMS banner `linkPath` to a customer route.
 * CMS may use short paths (`/service/<slug>`, `/category/<slug>`); full app paths pass through.
 */
export function bannerHref(linkPath: string): Href | null {
  const service = /^\/services?\/([\w-]+)$/.exec(linkPath);
  if (service) return { pathname: '/customer/services/[slug]', params: { slug: service[1]! } };
  const category = /^\/categor(?:y|ies)\/([\w-]+)$/.exec(linkPath);
  if (category) return { pathname: '/customer/categories/[slug]', params: { slug: category[1]! } };
  return linkPath.startsWith('/') ? (linkPath as Href) : null;
}
