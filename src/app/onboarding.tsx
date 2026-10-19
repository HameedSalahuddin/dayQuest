import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PixelCard from '../components/ui/PixelCard';
import PixelAvatar, { AVATAR_OPTIONS, type AvatarId } from '../components/ui/PixelAvatar';
import { colors, spacing, typography, borders, radii } from '../theme/tokens';
import { isSupabaseConfigured, supabase } from '../features/auth/supabase';
import { useAuth } from '../features/auth/AuthProvider';

export default function OnboardingScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>('sprout');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  if (session) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setError(''); setConfirmation('');
    if (!isSupabaseConfigured || !supabase) { setError('Connect a Supabase project to enable account sign-in. Add its URL and publishable key to your local .env file.'); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Choose a display name for your hero.'); return; }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { display_name: name.trim(), avatar_id: avatar } },
        });
        if (authError) throw authError;
        if (data.session) router.replace('/(tabs)');
        else setConfirmation('Account created. Check your email to confirm it, then sign in here.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
        router.replace('/(tabs)');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not connect to the account service. Try again.');
    } finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}><View style={styles.logo}><Text style={styles.logoText}>DQ</Text></View><Text style={styles.wordmark}>dayQuest</Text></View>
        <Text style={styles.title}>{mode === 'signup' ? 'Start your adventure' : 'Welcome back'}</Text>
        <Text style={styles.subtitle}>{mode === 'signup' ? 'Create your account and meet your pixel hero.' : 'Sign in to continue your quest.'}</Text>

        {mode === 'signup' ? <PixelCard style={styles.avatarCard}>
          <View style={styles.avatarHeading}><View style={styles.avatarPreview}><PixelAvatar avatarId={avatar} size={56} /></View><View style={styles.avatarCopy}><Text style={styles.cardTitle}>Build your hero</Text><Text style={styles.cardSubtitle}>Pick a look to represent you.</Text></View></View>
          <View style={styles.avatarChoices}>{AVATAR_OPTIONS.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected: avatar === option.id }} onPress={() => setAvatar(option.id)} style={[styles.avatarChoice, avatar === option.id && styles.avatarChoiceSelected]}>
            <PixelAvatar avatarId={option.id} size={35} /><Text style={[styles.avatarName, avatar === option.id && styles.avatarNameSelected]}>{option.name}</Text>
          </Pressable>)}</View>
        </PixelCard> : null}

        <PixelCard style={styles.formCard}>
          {mode === 'signup' ? <Field label="DISPLAY NAME" value={name} onChangeText={setName} placeholder="What should we call you?" autoCapitalize="words" /> : null}
          <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {confirmation ? <Text accessibilityRole="text" style={styles.confirmation}>{confirmation}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[styles.submit, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color={colors.bgPrimary} /> : <Text style={styles.submitText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>}
          </Pressable>
          <Pressable style={styles.modeSwitch} onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setConfirmation(''); }}>
            <Text style={styles.modeText}>{mode === 'signup' ? 'Already have an account? ' : 'New to dayQuest? '}<Text style={styles.modeLink}>{mode === 'signup' ? 'Sign in' : 'Create one'}</Text></Text>
          </Pressable>
        </PixelCard>
        <Text style={styles.privacyNote}>Your account profile is stored with Supabase. Quests and schedule data stay on this device for now.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} placeholderTextColor={colors.textDisabled} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, flex: { flex: 1 }, content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }, logo: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: borders.medium, borderColor: colors.borderAccent, backgroundColor: colors.bgHighlight }, logoText: { color: colors.accentPrimary, fontSize: typography.size.sm, fontWeight: '900', fontFamily: 'monospace' }, wordmark: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '800', marginTop: spacing.sm }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: -spacing.sm },
  avatarCard: { gap: spacing.md }, avatarHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, avatarPreview: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgHighlight, borderWidth: borders.thin, borderColor: colors.borderAccent }, avatarCopy: { flex: 1, gap: spacing.xs }, cardTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: typography.size.md }, cardSubtitle: { color: colors.textMuted, fontSize: typography.size.xs }, avatarChoices: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs }, avatarChoice: { flex: 1, minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: borders.thin, borderColor: colors.borderDefault, backgroundColor: colors.bgPrimary, padding: spacing.xs }, avatarChoiceSelected: { borderColor: colors.borderAccent, backgroundColor: colors.bgHighlight }, avatarName: { color: colors.textMuted, fontSize: typography.size.xs }, avatarNameSelected: { color: colors.accentSecondary, fontWeight: '700' },
  formCard: { gap: spacing.md }, field: { gap: spacing.xs }, label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 }, input: { minHeight: 48, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgPrimary, color: colors.textPrimary, paddingHorizontal: spacing.sm, fontSize: typography.size.md }, error: { color: colors.dangerLight, fontSize: typography.size.sm }, confirmation: { color: colors.accentSecondary, fontSize: typography.size.sm }, submit: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary, borderRadius: radii.sm, padding: spacing.md }, disabled: { opacity: 0.65 }, submitText: { color: colors.bgPrimary, fontSize: typography.size.md, fontWeight: '800' }, modeSwitch: { alignItems: 'center', padding: spacing.xs }, modeText: { color: colors.textMuted, fontSize: typography.size.sm }, modeLink: { color: colors.accentPrimary, fontWeight: '700' }, privacyNote: { color: colors.textDisabled, fontSize: typography.size.xs, textAlign: 'center', lineHeight: typography.size.xs * 1.6, paddingHorizontal: spacing.md },
});
