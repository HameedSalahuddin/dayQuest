import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PixelAvatar, { isAvatarId } from '../components/ui/PixelAvatar';
import PixelCard from '../components/ui/PixelCard';
import { colors, spacing, typography, borders, radii } from '../theme/tokens';
import { previewInvitation, sendFriendRequest, type InvitePreview } from '../features/social/repository';
import { useAuth } from '../features/auth/AuthProvider';

function readToken(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'dayquest:' || url.hostname !== 'friends-scan') return null;
    const token = url.searchParams.get('token');
    return token && /^[0-9a-f]{64}$/.test(token) ? token : null;
  } catch { return null; }
}

export default function FriendsScanScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ token?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [token, setToken] = useState(typeof params.token === 'string' && /^[0-9a-f]{64}$/.test(params.token) ? params.token : '');
  const [scanned, setScanned] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(Boolean(params.token));
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void previewInvitation(token).then(result => { if (active) setPreview(result); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'This invitation is not available.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const onBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const parsed = readToken(data);
    if (!parsed) { setError('That QR is not a dayQuest friend invitation.'); return; }
    setError(''); setPreview(null); setLoading(true); setToken(parsed);
  };
  const request = async () => {
    if (!token || !preview || preview.relationship !== 'available') return;
    setLoading(true); setError('');
    try { await sendFriendRequest(token); setSent(true); setPreview({ ...preview, relationship: 'request_pending' }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not send the request.'); }
    finally { setLoading(false); }
  };
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/friends' as never);

  if (!user) return <Redirect href="/onboarding" />;
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={goBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable><Text style={styles.title}>Scan a friend</Text><View style={{ width: 24 }} /></View>
    {!token ? <View style={styles.cameraWrap}>
      {!permission ? <ActivityIndicator color={colors.accentPrimary} /> : permission.granted ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : onBarcode} /> : <PixelCard style={styles.permission}><Ionicons name="camera-outline" size={38} color={colors.accentPrimary} /><Text style={styles.cardTitle}>Camera access needed</Text><Text style={styles.copy}>Allow camera access to scan a dayQuest invitation QR. The camera is used only while this screen is open.</Text><Pressable style={styles.primary} onPress={() => permission.canAskAgain ? void requestPermission() : void Linking.openSettings()}><Text style={styles.primaryText}>{permission.canAskAgain ? 'Allow camera' : 'Open device settings'}</Text></Pressable></PixelCard>}
      {permission?.granted ? <View pointerEvents="none" style={styles.overlay}><View style={styles.scanFrame} /><Text style={styles.scanHint}>Place the QR inside the frame</Text></View> : null}
      {error ? <View style={styles.scanError}><Text style={styles.error}>{error}</Text><Pressable onPress={() => { setError(''); setScanned(false); }}><Text style={styles.link}>Scan again</Text></Pressable></View> : null}
    </View> : <View style={styles.previewWrap}>
      {loading && !preview ? <ActivityIndicator size="large" color={colors.accentPrimary} /> : preview ? <PixelCard style={styles.previewCard}>
        <View style={styles.person}><PixelAvatar avatarId={isAvatarId(preview.avatar_id) ? preview.avatar_id : 'sprout'} size={56} /><View><Text style={styles.cardTitle}>{preview.display_name}</Text><Text style={styles.copy}>dayQuest student</Text></View></View>
        <Text style={styles.copy}>{preview.relationship === 'friends' ? 'You are already friends.' : preview.relationship === 'request_pending' ? 'A friend request is already pending.' : 'Send a request to connect on dayQuest.'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {sent ? <Text style={styles.success}>Friend request sent.</Text> : preview.relationship === 'available' ? <Pressable disabled={loading} style={styles.primary} onPress={() => void request()}>{loading ? <ActivityIndicator color={colors.bgPrimary} /> : <Text style={styles.primaryText}>Send friend request</Text>}</Pressable> : null}
        <Pressable style={styles.secondary} onPress={() => { setToken(''); setPreview(null); setScanned(false); setError(''); setSent(false); }}><Text style={styles.secondaryText}>Scan another QR</Text></Pressable>
      </PixelCard> : <PixelCard style={styles.previewCard}><Text style={styles.error}>{error || 'Invitation unavailable.'}</Text><Pressable onPress={() => { setToken(''); setScanned(false); setError(''); }}><Text style={styles.link}>Scan another QR</Text></Pressable></PixelCard>}
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bgPrimary }, header: { height: 60, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.textPrimary, fontWeight: '700', fontSize: typography.size.lg }, cameraWrap: { flex: 1, margin: spacing.md, overflow: 'hidden', borderRadius: radii.md, backgroundColor: '#080b12', alignItems: 'center', justifyContent: 'center' }, overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: 'rgba(0,0,0,0.18)' }, scanFrame: { width: 245, height: 245, borderWidth: 3, borderColor: colors.accentPrimary, borderRadius: radii.md, backgroundColor: 'transparent' }, scanHint: { color: colors.textPrimary, fontWeight: '700', backgroundColor: 'rgba(18,18,30,0.86)', padding: spacing.sm, borderRadius: radii.xs }, scanError: { position: 'absolute', bottom: spacing.lg, alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bgPrimary, padding: spacing.sm, borderRadius: radii.sm }, permission: { margin: spacing.md, alignItems: 'center', gap: spacing.md }, cardTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: typography.size.lg }, copy: { color: colors.textMuted, fontSize: typography.size.sm, lineHeight: 21 }, primary: { alignSelf: 'stretch', alignItems: 'center', padding: spacing.md, borderRadius: radii.sm, backgroundColor: colors.accentPrimary }, primaryText: { color: colors.bgPrimary, fontWeight: '800' }, previewWrap: { flex: 1, justifyContent: 'center', padding: spacing.md }, previewCard: { gap: spacing.md }, person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, secondary: { alignItems: 'center', padding: spacing.sm, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm }, secondaryText: { color: colors.textMuted, fontWeight: '600' }, error: { color: colors.dangerLight, textAlign: 'center' }, success: { color: colors.accentSecondary, fontWeight: '700', textAlign: 'center' }, link: { color: colors.accentPrimary, fontWeight: '700' } });
