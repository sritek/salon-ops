/**
 * i18n TypeScript Types
 * Provides type safety and autocomplete for translation keys
 */

import en from '../../messages/en.json';

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
