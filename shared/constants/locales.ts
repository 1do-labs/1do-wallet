import { FALLBACK_LOCALE } from '../lib/i18n';

/**
 * Normalizes the locale code to use hyphens ('-') instead of underscores ('_').
 *
 * @param locale - A locale code such as `'zh_CN'`.
 * @returns The normalized locale in BCP 47 format.
 */
export const getNormalizedLocale = (locale: string | undefined): string =>
  Intl.getCanonicalLocales(
    locale ? locale.replace(/_/gu, '-') : FALLBACK_LOCALE,
  )[0];
