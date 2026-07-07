import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'reunitd_biometric_enabled';

/** Check if the device has biometrics enrolled (Face ID / Touch ID / Fingerprint) */
export async function isBiometricAvailable() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** Get the human-readable name of the available biometric type */
export async function getBiometricLabel() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  return 'Biometrics';
}

/** Check if the user has enabled biometric lock in settings */
export async function isBiometricEnabled() {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === 'true';
}

/** Save biometric preference */
export async function setBiometricEnabled(enabled) {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Prompt the user to authenticate with biometrics.
 * Returns true if authenticated, false if cancelled or failed.
 */
export async function authenticateWithBiometrics(reason = 'Authenticate to open reunItD') {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // allow PIN fallback
  });
  return result.success;
}
