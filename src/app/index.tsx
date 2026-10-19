import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '../theme/tokens';
import { useAuth } from '../features/auth/AuthProvider';

export default function IndexRoute() {
  const { session, loading } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.accentPrimary} /></View>;
  return <Redirect href={session ? '/(tabs)' : '/onboarding'} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary } });
