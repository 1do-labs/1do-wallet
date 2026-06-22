const { readFileSync } = require('node:fs');
const assert = require('node:assert');
const { ENVIRONMENT } = require('./constants');

/**
 * Sets environment variables to inject in the current build.
 *
 * @param {object} options - Build options.
 * @param {boolean} options.isDevBuild - Whether the build is a development build.
 * @param {boolean} options.isTestBuild - Whether the build is a test build.
 * @param {string} options.buildType - The current build type (e.g. "main",
 * "flask", etc.).
 * @param {string} options.version - The current version of the extension.
 * @param {import('../lib/variables').Variables} options.variables
 * @param {ENVIRONMENT[keyof ENVIRONMENT]} options.environment - The build environment.
 */
function setEnvironmentVariables({
  isDevBuild,
  isTestBuild,
  buildType,
  environment,
  variables,
  version,
}) {
  variables.set({
    DEBUG: isDevBuild || isTestBuild ? variables.getMaybe('DEBUG') : undefined,
    EIP_4337_ENTRYPOINT: isTestBuild
      ? '0x18b06605539dc02ecD3f7AB314e38eB7c1dA5c9b'
      : variables.getMaybe('EIP_4337_ENTRYPOINT'),
    IN_TEST: isTestBuild,
    ALCHEMY_API_KEY: getAlchemyApiKey({
      buildType,
      variables,
      environment,
      testing: isTestBuild,
    }),
    METAMASK_DEBUG: isDevBuild || variables.getMaybe('METAMASK_DEBUG') === true,
    METAMASK_BUILD_NAME: '1Do',
    METAMASK_BUILD_APP_ID: getBuildAppId({
      buildType,
    }),
    METAMASK_BUILD_ICON: getBuildIcon({
      buildType,
    }),
    METAMASK_ENVIRONMENT: environment,
    METAMASK_VERSION: version,
    METAMASK_BUILD_TYPE: buildType,
    NODE_ENV: isDevBuild ? ENVIRONMENT.DEVELOPMENT : ENVIRONMENT.PRODUCTION,
    PHISHING_WARNING_PAGE_URL: getPhishingWarningPageUrl({
      variables,
      testing: isTestBuild,
    }),
    SEGMENT_WRITE_KEY: getSegmentWriteKey({
      variables,
      environment,
    }),
    TEST_GAS_FEE_FLOWS:
      isDevBuild && variables.getMaybe('TEST_GAS_FEE_FLOWS') === true,
    DEEP_LINK_HOST: variables.getMaybe('DEEP_LINK_HOST'),
    DEEP_LINK_PUBLIC_KEY: variables.getMaybe('DEEP_LINK_PUBLIC_KEY'),
    ASSETS_UNIFIED_STATE_ENABLED: variables.getMaybe(
      'ASSETS_UNIFIED_STATE_ENABLED',
    ),
  });
}

const BUILD_TYPES_TO_SVG_LOGO_PATH = {
  main: './app/images/logo/1do-mark.svg',
  beta: './app/images/logo/1do-mark.svg',
  flask: './app/images/logo/1do-mark.svg',
};

/**
 * Get the image data uri for the svg icon for the current build.
 *
 * @param {object} options - The build options.
 * @param {string} options.buildType - The build type of the current build.
 * @returns {string} The image data uri for the icon.
 */
function getBuildIcon({ buildType }) {
  const svgLogoPath =
    BUILD_TYPES_TO_SVG_LOGO_PATH[buildType] ||
    BUILD_TYPES_TO_SVG_LOGO_PATH.main;
  // encode as base64 as its more space-efficient for most SVGs than a data uri
  return `data:image/svg+xml;base64,${readFileSync(svgLogoPath, 'base64')}`;
}

/**
 * Get the app ID for the current build. Should be valid reverse FQDN.
 *
 * @param {object} options - The build options.
 * @param {string} options.buildType - The build type of the current build.
 * @returns {string} The build app ID.
 */
function getBuildAppId({ buildType }) {
  // EIP-6963 provider discovery validates rdns as an FQDN, so purely numeric
  // labels like `1do` are rejected and the wallet won't appear as a connector.
  const baseDomain = 'io.onedo.wallet';
  return buildType === 'main' ? baseDomain : `${baseDomain}.${buildType}`;
}

/**
 * Get the appropriate Alchemy API key.
 *
 * @param {object} options - The Alchemy API key options.
 * @param {string} options.buildType - The current build type.
 * @param {ENVIRONMENT[keyof ENVIRONMENT]} options.environment - The build environment.
 * @param {boolean} options.testing - Whether this is a test build or not.
 * @param options.variables
 * @returns {string} The Alchemy API key.
 */
function getAlchemyApiKey({ buildType, variables, environment, testing }) {
  const EMPTY_API_KEY = '';
  if (testing) {
    return EMPTY_API_KEY;
  } else if (environment !== ENVIRONMENT.PRODUCTION) {
    // Skip validation because this is unset on PRs from forks.
    // For forks, return empty API key if we don't have one.
    if (
      !variables.isDefined('ALCHEMY_API_KEY') &&
      environment === ENVIRONMENT.PULL_REQUEST
    ) {
      return EMPTY_API_KEY;
    }
    return variables.get('ALCHEMY_API_KEY');
  }
  /** @type {string|undefined} */
  const alchemyKeyReference = variables.get('ALCHEMY_ENV_KEY_REF');
  assert(
    typeof alchemyKeyReference === 'string' && alchemyKeyReference.length > 0,
    `Build type "${buildType}" has improperly set ALCHEMY_ENV_KEY_REF in builds.yml. Current value: "${alchemyKeyReference}"`,
  );
  /** @type {string|undefined} */
  const alchemyApiKey = variables.get(alchemyKeyReference);
  assert(
    typeof alchemyApiKey === 'string' && alchemyApiKey.length > 0,
    `Alchemy API key environmental variable "${alchemyKeyReference}" is set improperly.`,
  );
  return alchemyApiKey;
}

/**
 * Get the appropriate Segment write key.
 *
 * @param {object} options - The Segment write key options.
 * @param {keyof ENVIRONMENT} options.environment - The current build environment.
 * @param {import('../lib/variables').Variables} options.variables - Object containing all variables that modify the build pipeline
 * @returns {string} The Segment write key.
 */
function getSegmentWriteKey({ variables, environment }) {
  if (environment !== ENVIRONMENT.PRODUCTION) {
    // Skip validation because this is unset on PRs from forks, and isn't necessary for development builds.
    return variables.get('SEGMENT_WRITE_KEY');
  }

  const segmentKeyReference = variables.get('SEGMENT_WRITE_KEY_REF');
  if (!segmentKeyReference) {
    return variables.get('SEGMENT_WRITE_KEY');
  }

  if (!variables.isDefined(segmentKeyReference)) {
    return variables.get('SEGMENT_WRITE_KEY');
  }

  const segmentWriteKey = variables.get(segmentKeyReference);
  if (!segmentWriteKey) {
    return variables.get('SEGMENT_WRITE_KEY');
  }
  assert(
    typeof segmentWriteKey === 'string',
    `Segment Write Key environmental variable "${segmentKeyReference}" is set improperly.`,
  );
  return segmentWriteKey;
}

/**
 * Get the URL for the phishing warning page, if it has been set.
 *
 * @param {object} options - The phishing warning page options.
 * @param {boolean} options.testing - Whether this is a test build or not.
 * @param {import('../lib/variables').Variables} options.variables - Object containing all variables that modify the build pipeline
 * @returns {string} The URL for the phishing warning page, or `undefined` if no URL is set.
 */
function getPhishingWarningPageUrl({ variables, testing }) {
  let phishingWarningPageUrl = variables.get('PHISHING_WARNING_PAGE_URL');

  assert(
    phishingWarningPageUrl === null ||
      typeof phishingWarningPageUrl === 'string',
  );
  if (phishingWarningPageUrl === null) {
    phishingWarningPageUrl = testing
      ? 'http://localhost:9999/'
      : `https://metamask.github.io/phishing-warning/v${
          // eslint-disable-next-line n/global-require
          require('@metamask/phishing-warning/package.json').version
        }/`;
  }

  let phishingWarningPageUrlObject;
  try {
    // eslint-disable-next-line no-new
    phishingWarningPageUrlObject = new URL(phishingWarningPageUrl);
  } catch (error) {
    throw new Error(
      `Invalid phishing warning page URL: '${phishingWarningPageUrl}'`,
      error,
    );
  }
  if (phishingWarningPageUrlObject.hash) {
    // The URL fragment must be set dynamically
    throw new Error(
      `URL fragment not allowed in phishing warning page URL: '${phishingWarningPageUrl}'`,
    );
  }

  // return a normalized version of the URL; a `/` will be appended to the end
  // of the domain if it is missing
  return phishingWarningPageUrlObject.toString();
}

module.exports = {
  setEnvironmentVariables,
};
