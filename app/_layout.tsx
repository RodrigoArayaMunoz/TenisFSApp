import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register-result" />
        <Stack.Screen name="admin-key" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
