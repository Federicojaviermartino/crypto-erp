import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import { COLORS } from '../utils/constants';

/**
 * Auth Navigator
 *
 * Stack navigator for authentication flows:
 * - Login
 * - Register
 * - Forgot Password
 * - 2FA Verification
 */

const Stack = createStackNavigator();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      {/* Add other auth screens here */}
    </Stack.Navigator>
  );
};

export default AuthNavigator;
