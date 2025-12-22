/**
 * App Constants
 */

// API Configuration
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://crypto-erp-api.onrender.com/api/v1';

// AsyncStorage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@crypto_erp:access_token',
  REFRESH_TOKEN: '@crypto_erp:refresh_token',
  USER: '@crypto_erp:user',
  COMPANY_ID: '@crypto_erp:company_id',
  BIOMETRIC_ENABLED: '@crypto_erp:biometric_enabled',
  THEME: '@crypto_erp:theme',
  LANGUAGE: '@crypto_erp:language',
  OFFLINE_DATA: '@crypto_erp:offline_data',
};

// Navigation Routes
export const ROUTES = {
  // Auth Stack
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  TWO_FACTOR: 'TwoFactor',

  // Main Stack
  DASHBOARD: 'Dashboard',
  INVOICES: 'Invoices',
  INVOICE_DETAIL: 'InvoiceDetail',
  CREATE_INVOICE: 'CreateInvoice',
  PORTFOLIO: 'Portfolio',
  CRYPTO_DETAIL: 'CryptoDetail',
  TRANSACTIONS: 'Transactions',
  CONTACTS: 'Contacts',
  CONTACT_DETAIL: 'ContactDetail',
  SETTINGS: 'Settings',
  PROFILE: 'Profile',

  // Tab Navigator
  HOME_TAB: 'HomeTab',
  INVOICES_TAB: 'InvoicesTab',
  PORTFOLIO_TAB: 'PortfolioTab',
  SETTINGS_TAB: 'SettingsTab',
};

// Theme Colors
export const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  background: '#ffffff',
  backgroundDark: '#1f2937',
  surface: '#f9fafb',
  surfaceDark: '#374151',

  text: '#111827',
  textSecondary: '#6b7280',
  textDark: '#f9fafb',
  textSecondaryDark: '#9ca3af',

  border: '#e5e7eb',
  borderDark: '#4b5563',

  disabled: '#d1d5db',
};

// Chart Colors
export const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
];

// App Settings
export const APP_CONFIG = {
  name: 'Crypto ERP',
  version: '1.0.0',
  supportEmail: 'support@crypto-erp.com',
  termsUrl: 'https://crypto-erp.com/terms',
  privacyUrl: 'https://crypto-erp.com/privacy',
};

// Invoice Status
export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  SENT: 'SENT',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
};

// Crypto Transaction Types
export const CRYPTO_TX_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  SWAP: 'SWAP',
  MINING: 'MINING',
  STAKING: 'STAKING',
  AIRDROP: 'AIRDROP',
};
