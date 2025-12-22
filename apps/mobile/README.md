# Crypto ERP Mobile App

React Native mobile application for Crypto ERP platform.

## Features

### Phase 4D Implementation

- ✅ **Authentication**
  - Email/Password login
  - 2FA support
  - Biometric authentication (Face ID, Touch ID, Fingerprint)
  - Secure token storage

- ✅ **State Management**
  - Redux Toolkit
  - Redux Persist (offline support)
  - AsyncStorage integration

- ✅ **Navigation**
  - React Navigation
  - Stack navigation (Auth/Main)
  - Bottom tab navigation

- ✅ **Dashboard**
  - Real-time charts (Line, Bar, Pie)
  - Revenue analytics
  - Quick stats cards
  - Pull to refresh

- ✅ **API Integration**
  - Axios HTTP client
  - Automatic token refresh
  - Request/response interceptors
  - Error handling

- ✅ **Security**
  - Biometric authentication
  - Encrypted token storage
  - Automatic logout on token expiry

- 🚧 **Coming Soon**
  - Invoice management
  - Crypto portfolio tracking
  - Push notifications (Firebase)
  - QR code scanner
  - Offline mode
  - Dark mode

## Tech Stack

- **Framework**: React Native 0.73
- **Language**: TypeScript
- **State Management**: Redux Toolkit + Redux Persist
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Charts**: React Native Chart Kit
- **Biometrics**: React Native Biometrics
- **Storage**: AsyncStorage
- **Icons**: React Native Vector Icons

## Project Structure

```
apps/mobile/
├── src/
│   ├── api/              # API client and endpoints
│   │   └── client.ts     # Axios client with interceptors
│   ├── navigation/       # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── screens/          # App screens
│   │   ├── Auth/
│   │   │   └── LoginScreen.tsx
│   │   └── Dashboard/
│   │       └── DashboardScreen.tsx
│   ├── store/            # Redux store
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       └── invoicesSlice.ts
│   ├── services/         # Business logic services
│   │   └── biometric.service.ts
│   ├── components/       # Reusable components
│   ├── utils/            # Utilities and constants
│   │   └── constants.ts
│   ├── assets/           # Images, fonts, etc.
│   └── App.tsx           # Main app component
├── android/              # Android native code
├── ios/                  # iOS native code
├── package.json
└── tsconfig.json
```

## Setup

### Prerequisites

- Node.js >= 18
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

```bash
# Install dependencies
cd apps/mobile
npm install

# iOS only - Install CocoaPods
cd ios
pod install
cd ..
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Configuration

### API Endpoint

Update `API_BASE_URL` in `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'  // Development
  : 'https://crypto-erp-api.onrender.com/api/v1';  // Production
```

### Environment Variables

For production builds, create `.env`:

```bash
API_BASE_URL=https://crypto-erp-api.onrender.com/api/v1
```

## Build for Production

### iOS

```bash
# Clean build
cd ios
xcodebuild clean
cd ..

# Build release
npm run ios --configuration=Release

# Or use Xcode:
# - Open ios/CryptoERP.xcworkspace
# - Select "Generic iOS Device" or your device
# - Product > Archive
```

### Android

```bash
# Generate APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk

# Generate AAB (for Play Store)
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Features Implementation Status

| Feature | Status | Priority |
|---------|--------|----------|
| Authentication (Login/Register) | ✅ Complete | P0 |
| Biometric Authentication | ✅ Complete | P1 |
| Dashboard with Charts | ✅ Complete | P0 |
| Invoice List | 🚧 In Progress | P0 |
| Invoice Creation | 🚧 In Progress | P1 |
| Crypto Portfolio View | ⏳ Planned | P1 |
| Transaction History | ⏳ Planned | P1 |
| Push Notifications | ⏳ Planned | P2 |
| QR Code Scanner | ⏳ Planned | P2 |
| Offline Mode | ⏳ Planned | P2 |
| Dark Mode | ⏳ Planned | P3 |

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## App Store Deployment

### Apple App Store

1. Register Apple Developer Account ($99/year)
2. Create App ID in App Store Connect
3. Configure app metadata and screenshots
4. Archive and upload via Xcode
5. Submit for review

### Google Play Store

1. Register Google Play Developer Account ($25 one-time)
2. Create app listing in Play Console
3. Upload AAB file
4. Fill in store listing details
5. Submit for review

## Security Best Practices

- ✅ Tokens stored in secure AsyncStorage
- ✅ Automatic token refresh
- ✅ Biometric authentication support
- ✅ HTTPS only for API calls
- ✅ Input validation
- 🚧 Certificate pinning (planned)
- 🚧 Code obfuscation (planned)

## Performance Optimization

- Redux Persist for offline caching
- Image lazy loading
- List virtualization with FlatList
- Memoization with React.memo
- Debounced search inputs

## Troubleshooting

### iOS Build Issues

```bash
# Clean build folder
cd ios
rm -rf build
xcodebuild clean

# Reinstall pods
pod deintegrate
pod install
```

### Android Build Issues

```bash
# Clean gradle
cd android
./gradlew clean

# Clear gradle cache
rm -rf ~/.gradle/caches/
```

### Metro Bundler Issues

```bash
# Clear Metro cache
npm start -- --reset-cache
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

## License

Proprietary - Crypto ERP

## Support

For issues or questions, contact: support@crypto-erp.com

---

**Last Updated**: 2025-12-22
**Phase**: 4D - Mobile App (React Native)
**Status**: Core features implemented, ready for testing
