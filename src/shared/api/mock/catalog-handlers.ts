import type { Category, UserRole } from '../types';
import { db } from './db';
import { mockError, route } from './router';
import { BRANDING, SETTINGS } from './seed-cms';
import { serviceSummary } from './views';

function audienceOf(query: Record<string, string>): UserRole {
  return query.audience === 'provider' ? 'provider' : 'customer';
}

/** Public branding, CMS, location and catalog routes. */
export function registerCatalogRoutes(): void {
  const isPublic = true;
  route('GET', '/branding', () => BRANDING, { isPublic });
  route('GET', '/settings/public', () => SETTINGS, { isPublic });

  route('GET', '/cms/banners', ({ query }) => ({
    items: db.banners.filter((entry) => entry.audience === audienceOf(query)).map((entry) => entry.banner),
  }), { isPublic });

  route('GET', '/cms/pages/:slug', ({ params }) => {
    const page = db.pages.get(params.slug ?? '');
    if (!page) {
      throw mockError(404, 'NOT_FOUND', 'Page not found');
    }
    return page;
  }, { isPublic });

  route('GET', '/cms/faqs', ({ query }) => ({
    items: db.faqs.filter((entry) => entry.audience === audienceOf(query)).map((entry) => entry.faq),
  }), { isPublic });

  route('GET', '/locations/districts', () => ({ items: db.districts }), { isPublic });

  route('GET', '/locations/localities', ({ query }) => {
    const q = query.q?.trim().toLowerCase() ?? '';
    const items = db.localities.filter((locality) => {
      if (query.districtId && locality.districtId !== query.districtId) return false;
      if (!q) return true;
      return (
        locality.name.en.toLowerCase().includes(q) ||
        (locality.name.ml ?? '').includes(q) ||
        (locality.postalCode ?? '').startsWith(q)
      );
    });
    return { items };
  }, { isPublic });

  route('GET', '/categories', () => {
    const items: Category[] = [...db.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...category }) => ({
        ...category,
        services: [...db.services.values()].filter((service) => service.categoryId === category.id).map((service) => serviceSummary(service.id)),
      }));
    return { items };
  }, { isPublic });

  route('GET', '/services/:slug', ({ params }) => {
    const service = [...db.services.values()].find((candidate) => candidate.slug === params.slug || candidate.id === params.slug);
    if (!service) {
      throw mockError(404, 'NOT_FOUND', 'Service not found');
    }
    return service;
  }, { isPublic });
}
