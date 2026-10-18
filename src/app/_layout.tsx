import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDatabase } from '../database/migrations';

/**
 * Root layout — wraps the entire app in safe area context and
 * configures the status bar for the dark pixel-art theme.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="dayquest.db" onInit={migrateDatabase}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
