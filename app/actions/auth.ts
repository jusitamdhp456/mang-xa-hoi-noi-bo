'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?error=${encodeURIComponent('Lỗi đăng nhập. Vui lòng kiểm tra lại.')}`)
  }

  return redirect('/onboarding')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string

  const supabase = await createSupabaseServerClient()

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return redirect(`/register?error=${encodeURIComponent('Không thể tạo tài khoản.')}`)
  }

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName,
      username: email.split('@')[0] + Math.floor(Math.random() * 1000),
    })
    if (profileError) {
      console.error('Lỗi tạo profile:', profileError)
    }
  }

  return redirect('/onboarding')
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return redirect('/login')
}
