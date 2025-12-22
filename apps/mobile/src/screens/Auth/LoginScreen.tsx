import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import { COLORS } from '../../utils/constants';
import biometricService from '../../services/biometric.service';

/**
 * Login Screen
 *
 * Features:
 * - Email/password login
 * - 2FA support
 * - Biometric authentication option
 * - Error handling
 * - Loading states
 */

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, requires2FA } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    checkBiometric();

    return () => {
      dispatch(clearError());
    };
  }, []);

  useEffect(() => {
    if (requires2FA) {
      navigation.navigate('TwoFactor');
    }
  }, [requires2FA]);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
    }
  }, [error]);

  const checkBiometric = async () => {
    const { available, biometryType } = await biometricService.isBiometricAvailable();
    const isEnabled = await biometricService.isBiometricEnabled();

    if (available && isEnabled) {
      setBiometricAvailable(true);
      setBiometricType(biometricService.getBiometricTypeName(biometryType));
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    dispatch(login({ email, password }));
  };

  const handleBiometricLogin = async () => {
    const { success, error: bioError } = await biometricService.authenticate(
      'Login to Crypto ERP',
    );

    if (success) {
      // In a real app, you would retrieve stored credentials securely
      // For now, just show a message
      Alert.alert(
        'Biometric Success',
        'In production, this would log you in with stored credentials',
      );
    } else {
      Alert.alert('Biometric Failed', bioError || 'Authentication failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Crypto ERP</Text>
          <Text style={styles.subtitle}>Mobile</Text>
        </View>

        {/* Input Fields */}
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Biometric Login */}
          {biometricAvailable && !isLoading && (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
              <Text style={styles.biometricButtonText}>Login with {biometricType}</Text>
            </TouchableOpacity>
          )}

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotButtonText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 24,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  biometricButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotButtonText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
