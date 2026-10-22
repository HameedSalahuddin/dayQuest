import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { setOnlineState } from './repository';

/** Reports only foreground app presence; never location or background activity. */
export default function OnlinePresenceBridge() {
  const { session } = useAuth();
  useEffect(() => {
    if (!session) return;
    let active = true;
    const report = (online: boolean) => { if (active) void setOnlineState(online).catch(() => {}); };
    report(Platform.OS === 'web' ? true : AppState.currentState === 'active');
    const subscription = Platform.OS === 'web' ? null : AppState.addEventListener('change', state => report(state === 'active'));
    const heartbeat = setInterval(() => {
      if (Platform.OS === 'web' || AppState.currentState === 'active') report(true);
    }, 60_000);
    return () => { active = false; subscription?.remove(); clearInterval(heartbeat); void setOnlineState(false).catch(() => {}); };
  }, [session]);
  return null;
}
