'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAvatar(avatarUrl: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_key: avatarUrl })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating avatar:', error);
    return { error: 'Lỗi cập nhật ảnh đại diện' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateProfile(data: {
  display_name?: string;
  status_text?: string;
  about_me?: string;
  banner_color?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { error: 'Unauthorized' };
  }

  // Only send provided fields.
  const payload: Record<string, unknown> = {};
  if (data.display_name !== undefined) payload.display_name = data.display_name;
  if (data.status_text !== undefined) payload.status_text = data.status_text;
  if (data.about_me !== undefined) payload.about_me = data.about_me;
  if (data.banner_color !== undefined) payload.banner_color = data.banner_color;

  let { error } = await supabase.from('profiles').update(payload).eq('id', user.id);

  // If an extended column (about_me/banner_color) doesn't exist in the DB yet,
  // retry with just the core columns so name/status still save.
  if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message))) {
    const core: Record<string, unknown> = {};
    if (data.display_name !== undefined) core.display_name = data.display_name;
    if (data.status_text !== undefined) core.status_text = data.status_text;
    ({ error } = await supabase.from('profiles').update(core).eq('id', user.id));
  }

  if (error) {
    console.error('Error updating profile:', error);
    return { error: `Lỗi cập nhật hồ sơ: ${error.message}` };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
