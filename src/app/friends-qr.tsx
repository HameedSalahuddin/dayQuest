import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { toQR } from 'toqr';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../theme/tokens';
import PixelAvatar, { isAvatarId } from '../components/ui/PixelAvatar';
import { useAuth } from '../features/auth/AuthProvider';
import { createInvitation, revokeInvitation } from '../features/social/repository';

export default function FriendsQrScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const [token, setToken] = useState('');
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { const invite = await createInvitation(); setToken(invite.token); setExpiry(invite.expires_at); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create your invitation.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void createInvitation().then(invite => { if (active) { setToken(invite.token); setExpiry(invite.expires_at); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not create your invitation.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);
  if (!user) return <Redirect href="/onboarding" />;
  const payload = token ? `dayquest://friends-scan?token=${token}` : '';
  const matrix = payload ? toQR(payload) : null;
  const side = matrix ? Math.sqrt(matrix.length) : 0;
  const path = matrix ? matrix.reduce((d, bit, i) => bit ? `${d}M${i % side},${Math.floor(i / side)}h1v1h-1z` : d, '') : '';
  const name = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Hero';
  const avatar = isAvatarId(user?.user_metadata?.avatar_id) ? user.user_metadata.avatar_id : 'sprout';
  const disable = async () => {
    setLoading(true); setError(''); setNotice('');
    try { await revokeInvitation(); setToken(''); setExpiry(''); setNotice('Invitation disabled. Old QR copies will no longer work.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not disable the invitation.'); }
    finally { setLoading(false); }
  };
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/friends' as never);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={goBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable><Text style={styles.title}>Your friend QR</Text><View style={{ width: 24 }} /></View>
    <View style={styles.body}>
      <View style={styles.identity}><PixelAvatar avatarId={avatar} size={42} /><View><Text style={styles.name}>{name}</Text><Text style={styles.subtitle}>Scan to send a friend request</Text></View></View>
      <View style={styles.qrFrame}>{loading ? <ActivityIndicator size="large" color={colors.accentPrimary} /> : path ? <Svg width="100%" height="100%" viewBox={`-4 -4 ${side + 8} ${side + 8}`}><Path d={path} fill="#12121e" /></Svg> : null}</View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.note}>{expiry ? `Invitation expires ${new Date(expiry).toLocaleDateString()}.` : 'Invitation tokens are private and can be replaced at any time.'}</Text>
      <View style={styles.actions}><Pressable disabled={!payload || loading} onPress={() => void Share.share({ message: payload })} style={styles.button}><Ionicons name="share-outline" size={18} color={colors.textPrimary} /><Text style={styles.buttonText}>Share invite</Text></Pressable><Pressable disabled={loading} onPress={() => void load()} style={styles.button}><Ionicons name="refresh" size={18} color={colors.textPrimary} /><Text style={styles.buttonText}>Replace QR</Text></Pressable></View>
      <Pressable disabled={!payload || loading} onPress={() => void disable()}><Text style={[styles.notice, !payload && styles.disabled]}>Disable this invitation</Text></Pressable>
      <Text style={styles.security}>This QR contains a revocable invitation token only. Your email, account ID, and location are never included.</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bgPrimary }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md }, title: { color: colors.textPrimary, fontWeight: '700', fontSize: typography.size.lg }, body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }, identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' }, name: { color: colors.textPrimary, fontWeight: '700', fontSize: typography.size.lg }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: 2 }, qrFrame: { width: 280, height: 280, maxWidth: '100%', backgroundColor: '#f8fafc', borderRadius: radii.md, borderWidth: borders.medium, borderColor: colors.accentPrimary, padding: spacing.md, alignItems: 'center', justifyContent: 'center' }, note: { color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center' }, actions: { flexDirection: 'row', gap: spacing.sm }, button: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bgCard, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, buttonText: { color: colors.textPrimary, fontWeight: '600' }, error: { color: colors.dangerLight, textAlign: 'center' }, notice: { color: colors.accentSecondary, textAlign: 'center', fontSize: typography.size.xs, fontWeight: '600' }, disabled: { color: colors.textDisabled }, security: { color: colors.textDisabled, textAlign: 'center', fontSize: typography.size.xs, lineHeight: 18 } });
