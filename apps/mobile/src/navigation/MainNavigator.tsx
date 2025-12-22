import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import { COLORS, ROUTES } from '../utils/constants';

/**
 * Main Navigator
 *
 * Bottom tab navigator for main app screens:
 * - Dashboard
 * - Invoices
 * - Portfolio
 * - Settings
 */

const Tab = createBottomTabNavigator();

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          switch (route.name) {
            case ROUTES.HOME_TAB:
              iconName = focused ? 'home' : 'home-outline';
              break;
            case ROUTES.INVOICES_TAB:
              iconName = focused ? 'file-document' : 'file-document-outline';
              break;
            case ROUTES.PORTFOLIO_TAB:
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
            case ROUTES.SETTINGS_TAB:
              iconName = focused ? 'cog' : 'cog-outline';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.HOME_TAB}
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'Crypto ERP',
        }}
      />

      {/* Placeholder screens - will be implemented in full version */}
      <Tab.Screen
        name={ROUTES.INVOICES_TAB}
        component={DashboardScreen}
        options={{
          title: 'Invoices',
        }}
      />

      <Tab.Screen
        name={ROUTES.PORTFOLIO_TAB}
        component={DashboardScreen}
        options={{
          title: 'Portfolio',
        }}
      />

      <Tab.Screen
        name={ROUTES.SETTINGS_TAB}
        component={DashboardScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
