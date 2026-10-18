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
        <Stack.Screen name="admin-home" />
        <Stack.Screen name="create-fixture" />
        <Stack.Screen name="fixture-matches" />
        <Stack.Screen name="manage-players" />
        <Stack.Screen name="manage-orders" />
        <Stack.Screen name="sales-panel" />
        <Stack.Screen name="product-detail" />
        <Stack.Screen name="admin-dashboard" />
        <Stack.Screen name="league-standings" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
