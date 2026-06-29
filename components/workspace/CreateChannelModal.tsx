'use client'

import { useState, useTransition } from 'react'
import { createChannel, createCategory } from '@/app/actions/channel'
import { Plus, X, Hash, Volume2, Lock, FolderPlus } from 'lucide-react'

interface CategoryItem {
  id: string
  name: string
}

interface CreateChannelModalProps {
  workspaceId: string
  categoryId?: string
  isCategory?: boolean
  categories?: CategoryItem[]
  triggerType?: 'icon' | 'header' | 'button' | 'card' | 'text-link'
}

export function CreateChannelModal({ 
  workspaceId, 
  categoryId, 
  isCategory = false, 
  categories = [], 
  triggerType 
}: CreateChannelModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError('')
    
    // Extract selected category if not category creation
    const selectedCategoryId = formData.get('categoryId') as string || categoryId || null
    
    startTransition(async () => {
      const res = isCategory 
        ? await createCategory(workspaceId, formData)
        : await createChannel(workspaceId, selectedCategoryId === 'none' ? null : selectedCategoryId, formData)
        
      if (res?.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
      }
    })
  }

  // Render different triggers based on triggerType
  let triggerButton;
  if (triggerType === 'icon') {
    triggerButton = (
      <button 
        onClick={() => setIsOpen(true)} 
        className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
        title="Tạo kênh mới"
      >
        <Plus size={14} />
      </button>
    )
  } else if (triggerType === 'header') {
    triggerButton = (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }} 
        className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center ml-auto"
        title="Tạo kênh mới"
      >
        <Plus size={18} />
      </button>
    )
  } else if (triggerType === 'button') {
    triggerButton = (
      <button 
        onClick={() => setIsOpen(true)} 
        className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold flex items-center gap-2 cursor-pointer"
      >
        <Plus size={16} />
        Tạo Kênh Hội Thoại
      </button>
    )
  } else if (triggerType === 'card') {
    triggerButton = (
      <button 
        onClick={() => setIsOpen(true)} 
        className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl cursor-pointer transition-all duration-200 text-center group h-full w-full"
      >
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform duration-200 flex items-center justify-center mb-3">
          <Plus size={24} />
        </div>
        <h4 className="text-white font-bold text-sm mb-1">Tạo Kênh Hội Thoại</h4>
        <p className="text-xs text-white/50">Tạo kênh chat text hoặc voice mới để trò chuyện</p>
      </button>
    )
  } else if (triggerType === 'text-link') {
    triggerButton = (
      <button
        onClick={() => setIsOpen(true)}
        className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline text-sm cursor-pointer"
      >
        Tạo một kênh mới
      </button>
    )
  } else {
    // Default fallback
    triggerButton = (
      <button 
        onClick={() => setIsOpen(true)} 
        className={isCategory 
          ? "text-xs font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 flex items-center gap-1 hover:bg-white/5 rounded transition-all cursor-pointer" 
          : "text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10 cursor-pointer"
        }
      >
        {isCategory ? (
          <>
            <FolderPlus size={12} />
            DANH MỤC
          </>
        ) : (
          <Plus size={14} />
        )}
      </button>
    )
  }

  return (
    <>
      {triggerButton}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1b4b]/95 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {isCategory ? (
                  <FolderPlus className="text-cyan-400" size={20} />
                ) : (
                  <Plus className="text-cyan-400" size={20} />
                )}
                {isCategory ? 'Tạo Danh mục mới' : 'Tạo Kênh hội thoại'}
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form */}
            <form action={handleSubmit} className="p-6 flex flex-col gap-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg font-medium">
                  {error}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">
                  Tên {isCategory ? 'danh mục' : 'kênh'}
                </label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder={isCategory ? "Ví dụ: Thông báo, Giải trí" : "ví-dụ-general"} 
                  required 
                  className="bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all text-sm"
                />
              </div>

              {!isCategory && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider">
                      Loại kênh
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 cursor-pointer transition-all has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-500/10">
                        <div className="flex items-center gap-3">
                          <Hash size={18} className="text-zinc-400" />
                          <div className="text-left">
                            <p className="text-sm font-semibold">Văn bản</p>
                            <p className="text-[10px] text-white/40">Chat, gửi file</p>
                          </div>
                        </div>
                        <input type="radio" name="type" value="text" defaultChecked className="accent-indigo-500" />
                      </label>
                      
                      <label className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 cursor-pointer transition-all has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-500/10">
                        <div className="flex items-center gap-3">
                          <Volume2 size={18} className="text-zinc-400" />
                          <div className="text-left">
                            <p className="text-sm font-semibold">Thoại (Voice)</p>
                            <p className="text-[10px] text-white/40">Nói chuyện, call</p>
                          </div>
                        </div>
                        <input type="radio" name="type" value="voice" className="accent-indigo-500" />
                      </label>
                    </div>
                  </div>

                  {/* Category Selection Dropdown */}
                  {categories && categories.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Danh mục
                      </label>
                      <select 
                        name="categoryId" 
                        defaultValue={categoryId || 'none'}
                        className="bg-black/35 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm cursor-pointer"
                      >
                        <option value="none" className="bg-[#1e1b4b] text-white">--- Không thuộc danh mục nào ---</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-[#1e1b4b] text-white">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/20">
                    <div className="flex items-center gap-3">
                      <Lock size={18} className="text-zinc-400" />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Kênh riêng tư</p>
                        <p className="text-[10px] text-white/40">Chỉ thành viên được cấp quyền mới vào được</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      name="is_private" 
                      value="true" 
                      className="w-4 h-4 rounded accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-2 border-t border-white/10 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  disabled={isPending}
                  className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Đang tạo...' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
