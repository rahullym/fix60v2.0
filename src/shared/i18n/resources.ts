import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enCustomer from './locales/en/customer.json';
import enErrors from './locales/en/errors.json';
import enProvider from './locales/en/provider.json';
import mlAuth from './locales/ml/auth.json';
import mlCommon from './locales/ml/common.json';
import mlCustomer from './locales/ml/customer.json';
import mlErrors from './locales/ml/errors.json';
import mlProvider from './locales/ml/provider.json';

/** One JSON file per namespace per locale. Feature teams own their namespace files. */
export const resources = {
  en: { common: enCommon, errors: enErrors, auth: enAuth, customer: enCustomer, provider: enProvider },
  ml: { common: mlCommon, errors: mlErrors, auth: mlAuth, customer: mlCustomer, provider: mlProvider },
} as const;
