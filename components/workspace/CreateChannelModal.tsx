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

// Synthesize a beautiful double-note UI chime sound on success
function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Note 1: clean sine wave chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.1); // G5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Note 2: harmonic harmony note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6
    gain2.gain.setValueAtTime(0.09, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.32);
  } catch (err) {
    console.warn("Failed to play success sound", err);
  }
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
  
  // Local state for type and privacy selection to handle custom button styling
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text')
  const [isPrivate, setIsPrivate] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    
    // Explicitly set type and privacy from state to ensure consistency
    formData.set('type', channelType)
    formData.set('is_private', isPrivate ? 'true' : 'false')

    // Extract selected category if not category creation
    const selectedCategoryId = formData.get('categoryId') as string || categoryId || null
    
    startTransition(async () => {
      const res = isCategory 
        ? await createCategory(workspaceId, formData)
        : await createChannel(workspaceId, selectedCategoryId === 'none' ? null : selectedCategoryId, formData)
        
      if (res?.error) {
        setError(res.error)
      } else {
        // Successful creation: Play success chime!
        playSuccessSound()
        setIsOpen(false)
        // Reset local form states
        setChannelType('text')
        setIsPrivate(false)
      }
    })
  }

  // Render different triggers based on triggerType
  let triggerButton;
  if (triggerType === 'icon') {
    triggerButton = (
      <button 
        onClick={() => setIsOpen(true)} 
        className="text-white/45 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10 cursor-pointer"
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
        className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center ml-auto cursor-pointer"
        title="Tạo kênh mới"
      >
        <Plus size={18} />
      </button>
    )
  } else if (triggerType === 'button') {
    triggerButton = (
      <button 
        onClick={() => setIsOpen(true)} 
        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold flex items-center gap-2 cursor-pointer"
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
          ? "text-xs font-semibold text-cyan-400 hover:text-cyan-300 px-2.5 py-1 flex items-center gap-1 hover:bg-white/5 rounded transition-all cursor-pointer" 
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
          <div className="bg-[#1e1b4b]/95 border border-white/10 backdrop-blur-2xl rounded-2xl w-[350px] overflow-hidden shadow-2xl animate-scale-in text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {isCategory ? (
                  <FolderPlus className="text-cyan-400" size={18} />
                ) : (
                  <Plus className="text-cyan-400" size={18} />
                )}
                {isCategory ? 'Tạo Danh mục mới' : 'Tạo Kênh hội thoại'}
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Form */}
            <form action={handleSubmit} className="p-5 flex flex-col gap-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2.5 rounded-xl font-semibold leading-normal">
                  {error}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Tên {isCategory ? 'danh mục' : 'kênh'}
                </label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder={isCategory ? "Ví dụ: Thông báo, Giải trí" : "ví-dụ-general"} 
                  required 
                  className="bg-black/40 border border-white/10 text-white rounded-xl px-3.5 py-2 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-transparent transition-all text-xs"
                />
              </div>

              {!isCategory && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      Loại kênh
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setChannelType('text')}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                          channelType === 'text'
                            ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300'
                            : 'border-white/5 bg-black/30 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                      >
                        <Hash size={16} className={channelType === 'text' ? 'text-indigo-400' : 'text-zinc-400'} />
                        <div className="text-left leading-tight">
                          <p className="text-xs font-bold">Văn bản</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">Chat & gửi file</p>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setChannelType('voice')}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                          channelType === 'voice'
                            ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300'
                            : 'border-white/5 bg-black/30 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                      >
                        <Volume2 size={16} className={channelType === 'voice' ? 'text-indigo-400' : 'text-zinc-400'} />
                        <div className="text-left leading-tight">
                          <p className="text-xs font-bold">Thoại (Voice)</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">Nói chuyện, call</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Category Selection Dropdown */}
                  {categories && categories.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                        Danh mục
                      </label>
                      <select 
                        name="categoryId" 
                        defaultValue={categoryId || 'none'}
                        className="bg-black/40 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-xs cursor-pointer appearance-none"
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

                  {/* Custom Toggle Switch for Private Channels */}
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                      isPrivate
                        ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300'
                        : 'border-white/5 bg-black/30 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Lock size={15} className={isPrivate ? 'text-indigo-400' : 'text-zinc-400'} />
                      <div className="text-left leading-tight">
                        <p className="text-xs font-bold">Kênh riêng tư</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Chỉ thành viên được mời</p>
                      </div>
                    </div>
                    {/* Visual toggle switch */}
                    <div className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${isPrivate ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2.5 mt-1.5 border-t border-white/10 pt-3.5">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-white/70 hover:text-white hover:bg-white/5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
