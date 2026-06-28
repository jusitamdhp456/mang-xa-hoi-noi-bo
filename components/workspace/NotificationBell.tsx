'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_key: string | null;
  } | null;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [show, setShow] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    let isMounted = true;

    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*, profiles(display_name, avatar_key)')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data && isMounted) setNotifications(data)
    }

    fetchNotifs()
    
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifs()
      })
      .subscribe()
      
    return () => { 
      isMounted = false;
      supabase.removeChannel(channel) 
    }
  }, [supabase])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShow(!show)}
        className="p-2 text-gray-500 hover:text-gray-700 relative"
        title="Thông báo"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {show && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden z-50">
          <div className="p-3 border-b bg-gray-50 font-semibold text-sm flex justify-between items-center">
            Thông báo
            {notifications.length > 0 && (
               <button 
                 onClick={async () => {
                    const ids = notifications.map(n => n.id)
                    await supabase.from('notifications').update({ is_read: true }).in('id', ids)
                    setNotifications([])
                 }}
                 className="text-xs text-indigo-600 font-normal hover:underline"
               >
                 Đánh dấu tất cả đã đọc
               </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Bạn chưa có thông báo nào mới.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-3 border-b hover:bg-gray-50 flex flex-col gap-1 transition-colors">
                  <div className="text-sm text-gray-800">
                    <strong className="text-gray-900">{n.profiles?.display_name || 'Hệ thống'}</strong> {n.content}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    {n.link ? (
                      <Link href={n.link} className="text-xs text-indigo-600 hover:underline font-medium" onClick={() => markAsRead(n.id)}>
                        Xem chi tiết
                      </Link>
                    ) : <span />}
                    <button onClick={() => markAsRead(n.id)} className="text-xs text-gray-400 hover:text-gray-600">
                      Đã đọc
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
