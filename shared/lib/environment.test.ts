import { ENVIRONMENT } from '../../development/build/constants';
import {
  getIsAssetsUnifiedStateIncludedInBuild,
  getIsNewHardwareWalletOnboardingEnabled,
  isProduction,
} from './environment';

describe('isProduction', () => {
  let originalMetaMaskEnvironment: string | undefined;

  beforeAll(() => {
    originalMetaMaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  });

  afterAll(() => {
    process.env.METAMASK_ENVIRONMENT = originalMetaMaskEnvironment;
  });

  it('should return true when ENVIRONMENT is "production"', () => {
    process.env.METAMASK_ENVIRONMENT = ENVIRONMENT.PRODUCTION;
    expect(isProduction()).toBe(true);
  });

  it('should return false when ENVIRONMENT is "development"', () => {
    process.env.METAMASK_ENVIRONMENT = ENVIRONMENT.DEVELOPMENT;
    expect(isProduction()).toBe(false);
  });

  it('should return false when ENVIRONMENT is "testing"', () => {
    process.env.METAMASK_ENVIRONMENT = ENVIRONMENT.TESTING;
    expect(isProduction()).toBe(false);
  });
});

describe('getIsAssetsUnifiedStateIncludedInBuild', () => {
  let originalValue: string | undefined;

  beforeAll(() => {
    originalValue = process.env.ASSETS_UNIFIED_STATE_ENABLED;
  });

  afterAll(() => {
    process.env.ASSETS_UNIFIED_STATE_ENABLED = originalValue;
  });

  it('returns true when ASSETS_UNIFIED_STATE_ENABLED is "true"', () => {
    process.env.ASSETS_UNIFIED_STATE_ENABLED = 'true';
    expect(getIsAssetsUnifiedStateIncludedInBuild()).toBe(true);
  });

  it('returns false when ASSETS_UNIFIED_STATE_ENABLED is "false"', () => {
    process.env.ASSETS_UNIFIED_STATE_ENABLED = 'false';
    expect(getIsAssetsUnifiedStateIncludedInBuild()).toBe(false);
  });

  it('returns false when ASSETS_UNIFIED_STATE_ENABLED is undefined', () => {
    delete process.env.ASSETS_UNIFIED_STATE_ENABLED;
    expect(getIsAssetsUnifiedStateIncludedInBuild()).toBe(false);
  });
});

describe('getIsNewHardwareWalletOnboardingEnabled', () => {
  let originalValue: string | undefined;

  beforeAll(() => {
    originalValue = process.env.NEW_HARDWARE_WALLET_ONBOARDING;
  });

  afterAll(() => {
    process.env.NEW_HARDWARE_WALLET_ONBOARDING = originalValue;
  });

  it('returns true when NEW_HARDWARE_WALLET_ONBOARDING is "true"', () => {
    process.env.NEW_HARDWARE_WALLET_ONBOARDING = 'true';
    expect(getIsNewHardwareWalletOnboardingEnabled()).toBe(true);
  });

  it('returns false when NEW_HARDWARE_WALLET_ONBOARDING is "false"', () => {
    process.env.NEW_HARDWARE_WALLET_ONBOARDING = 'false';
    expect(getIsNewHardwareWalletOnboardingEnabled()).toBe(false);
  });

  it('returns false when NEW_HARDWARE_WALLET_ONBOARDING is undefined', () => {
    delete process.env.NEW_HARDWARE_WALLET_ONBOARDING;
    expect(getIsNewHardwareWalletOnboardingEnabled()).toBe(false);
  });
});
