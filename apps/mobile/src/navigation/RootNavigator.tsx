import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

/**
 * Root Navigator
 *
 * Switches between:
 * - Auth Stack (Login, Register, etc.) - when not authenticated
 * - Main Stack (Dashboard, Invoices, etc.) - when authenticated
 */

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
