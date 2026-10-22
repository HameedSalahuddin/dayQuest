import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../features/auth/supabase';
import PixelAvatar, { isAvatarId } from '../../components/ui/PixelAvatar';
import PixelCard from '../../components/ui/PixelCard';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import { useAuth } from '../../features/auth/AuthProvider';
import { listFriends, listFriendRequests, getSocialSettings, updateSocialSettings, respondToRequest, removeFriend, type Friend, type FriendRequest, type FriendStatus, type SocialSettings } from '../../features/social/repository';

const statuses: { id: FriendStatus; label: string }[] = [
  { id: 'free', label: 'Free' }, { id: 'in_class', label: 'In class' }, { id: 'studying', label: 'Studying' },
  { id: 'hanging_out', label: 'Hanging out' }, { id: 'busy', label: 'Busy' },
];

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [nextFriends, nextRequests, nextSettings] = await Promise.all([listFriends(), listFriendRequests(), getSocialSettings()]);
      setFriends(nextFriends ?? []); setRequests(nextRequests ?? []); setSettings(nextSettings); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load Friends.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void refresh().finally(() => { if (!active) return; });
    const client = supabase;
    if (!client) return () => { active = false; };
    const channel = client.channel(`friend-presence-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_status' }, () => { if (active) void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_online_presence' }, () => { if (active) void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => { if (active) void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => { if (active) void refresh(); })
      .subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, [refresh]));

  const saveSettings = async (patch: Partial<SocialSettings>) => {
    if (!settings || saving) return;
    setSaving(true);
    try { setSettings(await updateSocialSettings({ status: patch.status ?? settings.status, share_status: patch.share_status ?? settings.share_status, invisible_mode: patch.invisible_mode ?? settings.invisible_mode })); await refresh(); }
    catch (e) { Alert.alert('Could not update privacy', e instanceof Error ? e.message : 'Try again.'); }
    finally { setSaving(false); }
  };
  const remove = (friend: Friend) => Alert.alert('Remove friend?', `Remove ${friend.display_name} from your friends?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void removeFriend(friend.friend_id).then(refresh).catch(e => Alert.alert('Could not remove friend', e.message)) },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><Text style={styles.title}>Friends</Text><Text style={styles.subtitle}>Study together, at your pace.</Text></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.actions}>
        <ActionButton icon="qr-code-outline" title="My QR" onPress={() => router.push('/friends-qr' as never)} />
        <ActionButton icon="scan-outline" title="Scan QR" onPress={() => router.push('/friends-scan' as never)} />
      </View>
      {settings ? <PixelCard style={styles.panel}>
        <Text style={styles.sectionTitle}>YOUR STATUS</Text>
        <View style={styles.statuses}>{statuses.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: settings.status === item.id }} disabled={saving} onPress={() => void saveSettings({ status: item.id })} style={[styles.statusChip, settings.status === item.id && styles.statusActive]}><Text style={[styles.statusText, settings.status === item.id && styles.statusTextActive]}>{item.label}</Text></Pressable>)}</View>
        <ToggleRow title="Share my status" detail="Friends can see your status and online indicator." value={settings.share_status} disabled={saving} onPress={() => void saveSettings({ share_status: !settings.share_status })} />
        <ToggleRow title="Invisible mode" detail="Hide your online indicator from friends." value={settings.invisible_mode} disabled={saving} onPress={() => void saveSettings({ invisible_mode: !settings.invisible_mode })} />
      </PixelCard> : null}
      {loading ? <ActivityIndicator color={colors.accentPrimary} /> : error ? <PixelCard><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => { setLoading(true); void refresh(); }}><Text style={styles.link}>Try again</Text></Pressable></PixelCard> : <>
        <Text style={styles.sectionTitle}>FRIEND REQUESTS · {requests.filter(r => r.status === 'pending' && r.addressee_id === user?.id).length}</Text>
        {requests.length === 0 ? <PixelCard><Text style={styles.muted}>No requests right now. Invite a friend with your QR code.</Text></PixelCard> : requests.map(item => <RequestRow key={item.request_id} request={item} currentUserId={user?.id ?? ''} onRespond={async accept => { try { await respondToRequest(item.request_id, accept); await refresh(); } catch (e) { Alert.alert('Request failed', e instanceof Error ? e.message : 'Try again.'); } }} />)}
        <Text style={styles.sectionTitle}>YOUR FRIENDS · {friends.length}</Text>
        {friends.length === 0 ? <PixelCard><Text style={styles.muted}>Your friends will appear here when they accept your request.</Text></PixelCard> : friends.map(friend => <FriendRow key={friend.friend_id} friend={friend} onRemove={() => remove(friend)} />)}
      </>}
      <Text style={styles.footnote}>Presence shows app activity only. dayQuest never shares location.</Text>
    </ScrollView>
  </SafeAreaView>;
}

function ActionButton({ icon, title, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}><Ionicons name={icon} size={22} color={colors.accentPrimary} /><Text style={styles.actionText}>{title}</Text></Pressable>;
}
function ToggleRow({ title, detail, value, disabled, onPress }: { title: string; detail: string; value: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={onPress} disabled={disabled} style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.toggleTitle}>{title}</Text><Text style={styles.muted}>{detail}</Text></View><View style={[styles.switch, value && styles.switchOn]}><View style={[styles.switchDot, value && styles.switchDotOn]} /></View></Pressable>;
}
function RequestRow({ request, currentUserId, onRespond }: { request: FriendRequest; currentUserId: string; onRespond: (accept: boolean) => void }) {
  const incoming = request.addressee_id === currentUserId && request.status === 'pending';
  return <PixelCard style={styles.personRow}><PixelAvatar avatarId={isAvatarId(request.avatar_id) ? request.avatar_id : 'sprout'} size={35} /><View style={styles.personCopy}><Text style={styles.personName}>{request.display_name}</Text><Text style={styles.muted}>{incoming ? 'Wants to be your friend' : request.status === 'accepted' ? 'Friends' : 'Request sent'}</Text></View>{incoming ? <View style={styles.requestActions}><Pressable accessibilityLabel="Accept request" onPress={() => onRespond(true)} style={styles.accept}><Ionicons name="checkmark" size={18} color={colors.bgPrimary} /></Pressable><Pressable accessibilityLabel="Decline request" onPress={() => onRespond(false)} style={styles.decline}><Ionicons name="close" size={18} color={colors.dangerLight} /></Pressable></View> : null}</PixelCard>;
}
function FriendRow({ friend, onRemove }: { friend: Friend; onRemove: () => void }) {
  const label = !friend.status ? 'Status hidden' : friend.is_online ? 'Online now' : friend.last_seen_at ? `Last seen ${new Date(friend.last_seen_at).toLocaleString()}` : 'Offline';
  return <PixelCard style={styles.personRow}><PixelAvatar avatarId={isAvatarId(friend.avatar_id) ? friend.avatar_id : 'sprout'} size={35} /><View style={styles.personCopy}><Text style={styles.personName}>{friend.display_name}</Text><Text style={styles.muted}>{friend.status ? `${statuses.find(s => s.id === friend.status)?.label ?? 'Available'} · ` : ''}{label}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${friend.display_name}`} onPress={onRemove} hitSlop={12}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} /></Pressable></PixelCard>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, header: { padding: spacing.md, paddingBottom: spacing.sm }, title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '700' }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs },
  content: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.md }, actions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bgCard, borderWidth: borders.thin, borderColor: colors.borderDefault, borderBottomWidth: 3, borderRadius: radii.md }, actionText: { color: colors.textPrimary, fontWeight: '700' },
  panel: { gap: spacing.md }, sectionTitle: { color: colors.warning, fontSize: typography.size.xs, letterSpacing: 1.2, fontWeight: '800', marginTop: spacing.xs }, statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, statusChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderColor: colors.borderDefault, borderWidth: borders.thin, borderRadius: radii.sm }, statusActive: { borderColor: colors.accentPrimary, backgroundColor: colors.accentFaint }, statusText: { color: colors.textMuted, fontSize: typography.size.xs }, statusTextActive: { color: colors.accentPrimary, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, toggleCopy: { flex: 1, gap: spacing.xxs }, toggleTitle: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: '600' }, switch: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.bgHighlight, padding: 3, justifyContent: 'center' }, switchOn: { backgroundColor: colors.success }, switchDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted }, switchDotOn: { alignSelf: 'flex-end', backgroundColor: colors.textPrimary },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, personCopy: { flex: 1, gap: 2 }, personName: { color: colors.textPrimary, fontWeight: '700' }, muted: { color: colors.textMuted, fontSize: typography.size.xs, lineHeight: 18 }, requestActions: { flexDirection: 'row', gap: spacing.xs }, accept: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }, decline: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgHighlight, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.dangerLight, marginBottom: spacing.xs }, link: { color: colors.accentPrimary, fontWeight: '700' }, footnote: { color: colors.textDisabled, textAlign: 'center', fontSize: typography.size.xs, marginTop: spacing.sm },
});
