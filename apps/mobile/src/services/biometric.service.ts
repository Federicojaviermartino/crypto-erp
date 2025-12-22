import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Biometric Authentication Service
 *
 * Supports:
 * - Face ID (iOS)
 * - Touch ID (iOS)
 * - Fingerprint (Android)
 * - Iris scan (Android)
 */

class BiometricService {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true, // Allow PIN/Pattern fallback
    });
  }

  /**
   * Check if biometric hardware is available
   */
  async isBiometricAvailable(): Promise<{
    available: boolean;
    biometryType: BiometryTypes | undefined;
  }> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return { available, biometryType };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { available: false, biometryType: undefined };
    }
  }

  /**
   * Get biometric type name for UI
   */
  getBiometricTypeName(biometryType: BiometryTypes | undefined): string {
    switch (biometryType) {
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.Biometrics:
        return 'Biometrics';
      default:
        return 'Biometric Authentication';
    }
  }

  /**
   * Prompt biometric authentication
   */
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { available } = await this.isBiometricAvailable();

      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: promptMessage || 'Authenticate to access Crypto ERP',
        cancelButtonText: 'Cancel',
      });

      return { success };
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }

  /**
   * Check if biometric is enabled for the app
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      const { available } = await this.isBiometricAvailable();

      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      // Test biometric authentication first
      const authResult = await this.authenticate('Enable biometric authentication');

      if (!authResult.success) {
        return authResult;
      }

      // Save enabled status
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to enable biometric authentication',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }

  /**
   * Create biometric keys (for signature-based auth)
   */
  async createKeys(): Promise<{ success: boolean; publicKey?: string }> {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      return { success: true, publicKey };
    } catch (error) {
      console.error('Error creating biometric keys:', error);
      return { success: false };
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteKeys(): Promise<{ success: boolean }> {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      return { success: keysDeleted };
    } catch (error) {
      console.error('Error deleting biometric keys:', error);
      return { success: false };
    }
  }

  /**
   * Create signature with biometric authentication
   */
  async createSignature(payload: string): Promise<{ success: boolean; signature?: string }> {
    try {
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Authenticate to sign',
        payload,
      });

      return { success, signature };
    } catch (error) {
      console.error('Error creating signature:', error);
      return { success: false };
    }
  }
}

export default new BiometricService();
