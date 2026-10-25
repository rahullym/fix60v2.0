/// <reference types="node" />
import { existsSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

const ANDROID_PACKAGE = 'com.fixsixty.app';
const IOS_BUNDLE_ID = 'com.fixsixty.app';
const androidServicesFile = './google-services.json';
const iosServicesFile = './GoogleService-Info.plist';

/** Firebase native plugins are added only when the config files are present (dev/mock builds skip them). */
const hasFirebase = existsSync(androidServicesFile) || existsSync(iosServicesFile);

const config: ExpoConfig = {
  name: 'Fix60',
  slug: 'fix60',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'fix60',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: IOS_BUNDLE_ID,
    googleServicesFile: existsSync(iosServicesFile) ? iosServicesFile : undefined,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Fix60 uses your location to find service providers near you.',
      NSCameraUsageDescription: 'Fix60 uses the camera to photograph verification documents.',
      NSPhotoLibraryUsageDescription: 'Fix60 lets you choose documents and photos from your library.',
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    googleServicesFile: existsSync(androidServicesFile) ? androidServicesFile : undefined,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#FFFFFF', image: './assets/images/splash-icon.png', imageWidth: 220 }],
    'expo-secure-store',
    'expo-localization',
    ['expo-font', { fonts: ['./assets/fonts/PlusJakartaSans-Regular.ttf', './assets/fonts/PlusJakartaSans-Medium.ttf', './assets/fonts/PlusJakartaSans-SemiBold.ttf', './assets/fonts/PlusJakartaSans-Bold.ttf', './assets/fonts/PlusJakartaSans-ExtraBold.ttf'] }],
    ['expo-location', { locationWhenInUsePermission: 'Fix60 uses your location to find service providers near you.' }],
    ['expo-image-picker', { photosPermission: 'Fix60 lets you choose documents and photos from your library.', cameraPermission: 'Fix60 uses the camera to photograph verification documents.' }],
    '@react-native-community/datetimepicker',
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
    ...(hasFirebase ? ['@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-firebase/messaging'] : []),
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
