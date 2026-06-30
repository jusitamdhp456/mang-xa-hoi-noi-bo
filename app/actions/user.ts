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

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: 'Lỗi cập nhật hồ sơ cá nhân' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
