import { supabase } from '../auth/supabase';

export type FriendStatus = 'free' | 'in_class' | 'studying' | 'hanging_out' | 'busy';
export type SocialSettings = { status: FriendStatus; status_updated_at: string | null; share_status: boolean; invisible_mode: boolean };
export type Friend = { friend_id: string; display_name: string; avatar_id: string; status: FriendStatus | null; status_updated_at: string | null; is_online: boolean; last_seen_at: string | null };
export type FriendRequest = { request_id: string; requester_id: string; addressee_id: string; status: string; created_at: string; display_name: string; avatar_id: string };
export type InvitePreview = { display_name: string; avatar_id: string; relationship: 'friends' | 'request_pending' | 'available' };

function client() {
  if (!supabase) throw new Error('Sign in to use Friends.');
  return supabase;
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(name as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

export const createInvitation = () => rpc<{ token: string; expires_at: string }>('create_my_friend_invitation');
export const revokeInvitation = () => rpc<void>('revoke_my_friend_invitation');
export const previewInvitation = (token: string) => rpc<InvitePreview>('preview_friend_invitation', { p_token: token });
export const sendFriendRequest = (token: string) => rpc<string>('send_friend_request_with_invitation', { p_token: token });
export const respondToRequest = (id: string, accept: boolean) => rpc<void>('respond_to_friend_request', { p_request_id: id, p_accept: accept });
export const removeFriend = (id: string) => rpc<void>('remove_friend', { p_friend_id: id });
export const getSocialSettings = () => rpc<SocialSettings>('get_my_social_settings');
export const updateSocialSettings = (settings: Pick<SocialSettings, 'status' | 'share_status' | 'invisible_mode'>) =>
  rpc<SocialSettings>('update_my_social_settings', { p_status: settings.status, p_share_status: settings.share_status, p_invisible_mode: settings.invisible_mode });
export const setOnlineState = (online: boolean) => rpc<void>('set_my_online_state', { p_is_online: online });
export const listFriends = () => rpc<Friend[]>('list_my_friends');
export const listFriendRequests = () => rpc<FriendRequest[]>('list_my_friend_requests');

