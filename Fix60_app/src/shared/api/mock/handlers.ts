import { registerAccountRoutes } from './account-handlers';
import { registerCatalogRoutes } from './catalog-handlers';
import { registerCustomerRoutes } from './customer-handlers';
import { registerProviderRoutes } from './provider-handlers';
import { seedDatabase } from './seed';

/** Seeds the in-memory database and registers every non-auth mock route. */
export function registerFeatureRoutes(): void {
  seedDatabase();
  registerCatalogRoutes();
  registerCustomerRoutes();
  registerProviderRoutes();
  registerAccountRoutes();
}
