import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import RootNavigator from './navigation/RootNavigator';
import { COLORS } from './utils/constants';

/**
 * Crypto ERP Mobile App
 *
 * React Native application for Crypto ERP platform
 *
 * Features:
 * - Multi-platform (iOS & Android)
 * - Redux state management
 * - Persistent storage
 * - Biometric authentication
 * - Push notifications
 * - Offline support
 * - Real-time charts
 */

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app
    console.log('Crypto ERP Mobile App Started');
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
          <RootNavigator />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
};

export default App;
