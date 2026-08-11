import { hasProperty, isObject } from '@metamask/utils';
import type { Migrate } from './types';

export const version = 207;

const SUPPORTED_LOCALES = new Set(['en', 'zh_CN']);

/**
 * Resets locales that are no longer bundled to English.
 *
 * @param versionedData - The versioned data object to migrate.
 * @param changedControllers - A set used to record controllers that were modified.
 */
export const migrate = (async (versionedData, changedControllers) => {
  versionedData.meta.version = version;

  if (
    !hasProperty(versionedData.data, 'PreferencesController') ||
    !isObject(versionedData.data.PreferencesController)
  ) {
    return;
  }

  const { PreferencesController } = versionedData.data;
  if (
    !hasProperty(PreferencesController, 'currentLocale') ||
    typeof PreferencesController.currentLocale !== 'string' ||
    SUPPORTED_LOCALES.has(PreferencesController.currentLocale)
  ) {
    return;
  }

  PreferencesController.currentLocale = 'en';
  changedControllers.add('PreferencesController');
}) satisfies Migrate;
