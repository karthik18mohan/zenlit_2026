import { supabase, supabaseReady } from '../lib/supabase';
import { logger } from '../utils/logger';

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'impersonation'
  | 'threats'
  | 'other';

export type ContentType = 'profile' | 'post' | 'message';

export async function reportContent(params: {
  reportedUserId: string;
  contentType: ContentType;
  contentId?: string;
  reason: ReportReason;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabaseReady) return { success: false, error: 'Not connected' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (user.id === params.reportedUserId) {
    return { success: false, error: 'Cannot report yourself' };
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_user_id: params.reportedUserId,
    content_type: params.contentType,
    content_id: params.contentId || null,
    reason: params.reason,
    description: params.description || null,
  });

  if (error) {
    logger.error('Moderation', 'Failed to submit report', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function blockUser(
  blockedId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseReady) return { success: false, error: 'Not connected' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (user.id === blockedId) {
    return { success: false, error: 'Cannot block yourself' };
  }

  const { error } = await supabase.from('blocked_users').upsert(
    { blocker_id: user.id, blocked_id: blockedId },
    { onConflict: 'blocker_id,blocked_id' },
  );

  if (error) {
    logger.error('Moderation', 'Failed to block user', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function unblockUser(
  blockedId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseReady) return { success: false, error: 'Not connected' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) {
    logger.error('Moderation', 'Failed to unblock user', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getBlockedUserIds(): Promise<string[]> {
  if (!supabaseReady) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  if (error) {
    logger.error('Moderation', 'Failed to get blocked users', error);
    return [];
  }

  return (data || []).map((row: any) => row.blocked_id);
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  if (!supabaseReady) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', userId)
    .maybeSingle();

  return !!data;
}
