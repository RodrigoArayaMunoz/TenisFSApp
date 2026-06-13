import '@expo/metro-runtime';
import 'expo/src/Expo.fx';

import { AppRegistry, Platform } from 'react-native';
import { App } from 'expo-router/build/qualified-entry';

let RootComponent = App;

if (process.env.NODE_ENV !== 'production') {
  const { withErrorOverlay } = require('@expo/metro-runtime/error-overlay');
  RootComponent = withErrorOverlay(App);
}

AppRegistry.registerComponent('main', () => RootComponent);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const rootTag = document.getElementById('root');

  if (process.env.NODE_ENV !== 'production' && !rootTag) {
    throw new Error('Required HTML element with id "root" was not found.');
  }

  AppRegistry.runApplication('main', {
    rootTag,
    hydrate: globalThis.__EXPO_ROUTER_HYDRATE__,
  });
}
