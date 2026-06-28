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
