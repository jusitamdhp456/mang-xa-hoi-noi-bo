'use client'

import { useState, useRef, useEffect } from 'react'
import { sendMessage } from '@/app/actions/message'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Send, Smile, File as FileIcon, Mic, Trash2, BarChart3, Plus, X } from 'lucide-react'
import { POLL_PREFIX } from './PollCard'
import { getCustomEmojis } from '@/app/actions/emoji'

type MemberHint = { id: string; name: string; avatar: string | null }

const SLASH_COMMANDS: { cmd: string; desc: string; transform: (arg: string) => string }[] = [
  { cmd: 'shrug', desc: 'Nhún vai ¯\\_(ツ)_/¯', transform: (a) => (a ? a + ' ' : '') + '¯\\_(ツ)_/¯' },
  { cmd: 'tableflip', desc: 'Lật bàn (╯°□°)╯︵ ┻━┻', transform: () => '(╯°□°)╯︵ ┻━┻' },
  { cmd: 'unflip', desc: 'Dựng bàn ┬─┬ノ( º _ ºノ)', transform: () => '┬─┬ノ( º _ ºノ)' },
  { cmd: 'me', desc: 'Hành động (in nghiêng)', transform: (a) => (a ? `*${a}*` : '') },
  { cmd: 'spoiler', desc: 'Ẩn nội dung (spoiler)', transform: (a) => (a ? `||${a}||` : '') },
]

function applySlashCommand(text: string): string {
  const m = text.match(/^\/(\w+)(?:\s+([\s\S]*))?$/)
  if (!m) return text
  const c = SLASH_COMMANDS.find((s) => s.cmd === m[1].toLowerCase())
  if (!c) return text
  return c.transform((m[2] || '').trim())
}

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: 'Mặt cười', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👻','👽'] },
  { name: 'Cử chỉ', emojis: ['👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪','🙏','🤝','👏','🙌','👐','🤲','🤦','🤷','💅','👀','👁️','🧠','❤️‍🔥'] },
  { name: 'Trái tim', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️'] },
  { name: 'Biểu tượng', emojis: ['🔥','⭐','🌟','✨','⚡','💥','💫','💯','✅','❌','❓','❗','💢','💦','💨','🎉','🎊','🎁','🎈','🏆','🥇','🚀','☕','🍺','🍻','🥂','🍕','🍔','🌹','🎵','🎮','💡','💰','📌','🔔','👑'] },
]

export function MessageInput({
  channelId,
  channelName,
  channelType,
  workspaceId,
  currentUser = null,
  replyingTo = null,
  onCancelReply,
  onTyping,
  onOptimistic,
  onOptimisticFailed,
  onBroadcastInstantly,
  onSent
}: {
  channelId: string,
  channelName: string,
  channelType: string,
  workspaceId: string,
  currentUser?: { id: string; display_name: string; avatar_key: string | null } | null,
  replyingTo?: { id: string; content: string; profiles?: { display_name: string } } | null,
  onCancelReply?: () => void,
  onTyping?: () => void,
  onOptimistic?: (message: any) => void,
  onOptimisticFailed?: (tempId: string) => void,
  onBroadcastInstantly?: (message: any) => void,
  onSent?: (message: any, tempId?: string) => void
}) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'emoji' | 'gif'>('emoji')
  const [gifQuery, setGifQuery] = useState('')
  const [gifs, setGifs] = useState<{ id: string; url: string; preview: string }[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_KEY

  // Server custom emojis
  const [customEmojis, setCustomEmojis] = useState<{ id: string; name: string; object_key: string }[]>([])
  useEffect(() => {
    if (workspaceId) getCustomEmojis(workspaceId).then(setCustomEmojis)
  }, [workspaceId])
  const insertCustomEmoji = (name: string, objectKey: string) => {
    setEmojiOpen(false)
    setContent((prev) => (prev ? prev + ' ' : '') + `<:${name}:${objectKey}>` + ' ')
    requestAnimationFrame(() => textInputRef.current?.focus())
  }

  // --- Voice message recording ---
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const recChunks = useRef<Blob[]>([])
  const recStream = useRef<MediaStream | null>(null)
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const recCancelled = useRef(false)

  // --- Poll composer ---
  const [pollOpen, setPollOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  const createPoll = async () => {
    const q = pollQuestion.trim()
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (!q || opts.length < 2) { alert('Cần câu hỏi và ít nhất 2 lựa chọn'); return }
    setPollOpen(false)
    setPollQuestion(''); setPollOptions(['', ''])
    setIsSending(true)
    try {
      const content = POLL_PREFIX + JSON.stringify({ question: q, options: opts.slice(0, 10) })
      const res = await sendMessage(channelId, workspaceId, content)
      if (res?.error) throw new Error(res.error)
      if (res?.message) onSent?.(res.message)
    } catch (e) {
      alert((e as Error).message || 'Lỗi tạo bình chọn')
    } finally {
      setIsSending(false)
    }
  }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // --- @mention autocomplete ---
  const [members, setMembers] = useState<MemberHint[]>([])
  const [mentionResults, setMentionResults] = useState<MemberHint[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase
      .from('workspace_members')
      .select('profiles!inner(id, display_name, avatar_key)')
      .eq('workspace_id', workspaceId)
      .then(({ data }) => {
        if (!data) return
        const people = data.map((m: any) => ({ id: m.profiles.id, name: m.profiles.display_name, avatar: m.profiles.avatar_key }))
        setMembers([
          { id: 'everyone', name: 'everyone', avatar: null },
          { id: 'here', name: 'here', avatar: null },
          ...people,
        ])
      })
  }, [workspaceId])

  const detectMention = (value: string, caret: number) => {
    const before = value.slice(0, caret)
    const m = before.match(/@([\p{L}\d_.]*)$/u)
    if (m) {
      const q = m[1].toLowerCase()
      const res = members.filter((mem) => mem.name?.toLowerCase().includes(q)).slice(0, 6)
      setMentionResults(res)
      setMentionOpen(res.length > 0)
    } else {
      setMentionOpen(false)
    }
  }

  const insertMention = (name: string) => {
    const input = textInputRef.current
    const caret = input?.selectionStart ?? content.length
    const before = content.slice(0, caret).replace(/@([\p{L}\d_.]*)$/u, `@${name} `)
    const after = content.slice(caret)
    setContent(before + after)
    setMentionOpen(false)
    requestAnimationFrame(() => {
      input?.focus()
      const pos = before.length
      input?.setSelectionRange(pos, pos)
    })
  }

  // Insert an emoji at the caret position (or append if no selection).
  const searchGifs = async (q: string) => {
    if (!TENOR_KEY) return
    setGifLoading(true)
    try {
      const base = q.trim()
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}`
        : 'https://tenor.googleapis.com/v2/featured?'
      const res = await fetch(`${base}&key=${TENOR_KEY}&limit=21&media_filter=gif,tinygif&client_key=intrasocial`)
      const data = await res.json()
      setGifs((data.results || []).map((r: any) => ({
        id: r.id,
        url: r.media_formats?.gif?.url,
        preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
      })).filter((g: any) => g.url))
    } catch { /* ignore */ } finally {
      setGifLoading(false)
    }
  }

  const insertGif = (url: string) => {
    setEmojiOpen(false)
    setContent((prev) => (prev ? prev + ' ' : '') + url + ' ')
    requestAnimationFrame(() => textInputRef.current?.focus())
  }

  const sendVoice = async (file: File) => {
    setIsSending(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('workspaceId', workspaceId)
      fd.append('channelId', channelId)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error('Tải tin nhắn thoại thất bại')
      const d = await up.json()
      const res = await sendMessage(channelId, workspaceId, '', {
        objectKey: d.objectKey, fileName: d.fileName || 'voice-message.webm', mimeType: d.mimeType || 'audio/webm', sizeBytes: d.sizeBytes || file.size,
      })
      if (res?.error) throw new Error(res.error)
      if (res?.message) onSent?.(res.message)
    } catch (e) {
      alert((e as Error).message || 'Lỗi gửi tin nhắn thoại')
    } finally {
      setIsSending(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recStream.current = stream
      const mr = new MediaRecorder(stream)
      recChunks.current = []
      recCancelled.current = false
      mr.ondataavailable = (e) => { if (e.data.size) recChunks.current.push(e.data) }
      mr.onstop = () => {
        recStream.current?.getTracks().forEach((t) => t.stop())
        if (recTimer.current) clearInterval(recTimer.current)
        if (recCancelled.current) return
        const blob = new Blob(recChunks.current, { type: 'audio/webm' })
        if (blob.size > 0) sendVoice(new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }))
      }
      recRef.current = mr
      mr.start()
      setRecording(true)
      setRecSec(0)
      recTimer.current = setInterval(() => setRecSec((s) => s + 1), 1000)
    } catch {
      alert('Không truy cập được micro. Hãy cho phép quyền micro.')
    }
  }

  const stopRecording = (cancel: boolean) => {
    recCancelled.current = cancel
    recRef.current?.stop()
    setRecording(false)
  }

  const insertEmoji = (emoji: string) => {
    const input = textInputRef.current
    if (!input) {
      setContent((prev) => prev + emoji)
    } else {
      const start = input.selectionStart ?? content.length
      const end = input.selectionEnd ?? content.length
      const next = content.slice(0, start) + emoji + content.slice(end)
      setContent(next)
      // Restore caret right after the inserted emoji.
      requestAnimationFrame(() => {
        input.focus()
        const pos = start + emoji.length
        input.setSelectionRange(pos, pos)
      })
    }
    setEmojiOpen(false)
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1200;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileSelection = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
    } else {
      setSelectedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          handleFileSelection(file)
          break
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !selectedFile) || isSending) return

    setIsSending(true)
    let currentContent = applySlashCommand(content)
    const currentFile = selectedFile

    setContent('')
    setSelectedFile(null)

    // Capture & clear the reply target for this send.
    const replyId = replyingTo?.id
    const replyPreview = replyingTo
      ? { id: replyingTo.id, content: replyingTo.content, profiles: replyingTo.profiles }
      : null
    onCancelReply?.()

    // Intercept music bot commands
    const trimmed = currentContent.trim()
    if (trimmed.toLowerCase().startsWith('/play ') && !currentFile) {
      const query = trimmed.slice(6).trim();
      if (query) {
        // Dispatch event for MusicBotHost to catch
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('play_music_request', { detail: { query, channelId } }));
        }
        
        // Still send a message so everyone sees who requested it
        currentContent = `🎵 Đang yêu cầu Bot phát nhạc: **${query}**...`;
      }
    }

    // Optimistic render for text-only messages so they appear instantly,
    // without waiting for the server round-trip. Reconciled by onSent.
    let tempId: string | undefined
    let messageId: string | undefined
    
    if (!currentFile && currentContent.trim() && currentUser) {
      messageId = crypto.randomUUID()
      tempId = messageId // Use the real UUID as tempId so UI doesn't flicker
      const optimisticMsg = {
        id: tempId,
        content: currentContent.trim(),
        created_at: new Date().toISOString(),
        sender_id: currentUser.id,
        profiles: { display_name: currentUser.display_name, avatar_key: currentUser.avatar_key },
        message_attachments: [],
        message_reactions: [],
        reply_to_id: replyId || null,
        reply_to: replyPreview,
      }
      onOptimistic?.(optimisticMsg)
      // Broadcast to other clients immediately before DB insert for zero-latency feel
      onBroadcastInstantly?.(optimisticMsg)
    }

    try {
      if (currentContent.trim().toLowerCase().startsWith('/play ')) {
        const query = currentContent.trim().substring(6).trim();
        if (query) {
          // Send system message
          await sendMessage(
            channelId, 
            workspaceId, 
            `🎵 Đang yêu cầu Bot phát nhạc: **${query}**...`
          );
          
          // Broadcast bot command via Supabase Realtime
          const supabase = createSupabaseBrowserClient();
          const channel = supabase.channel(`workspace:${workspaceId}:bot-commands`);
          await channel.send({
            type: 'broadcast',
            event: 'play_music',
            payload: { query, channelId, requestedBy: workspaceId }
          });
          
          setIsSending(false);
          return;
        }
      }

      let attachmentData = undefined

      if (currentFile) {
        const formData = new FormData()
        formData.append('file', currentFile)
        formData.append('workspaceId', workspaceId)
        formData.append('channelId', channelId)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadRes.ok) {
          const errData = await uploadRes.json()
          throw new Error(errData.error || 'Upload file thất bại')
        }
        
        const uploadData = await uploadRes.json()
        attachmentData = {
          objectKey: uploadData.objectKey,
          fileName: uploadData.fileName,
          mimeType: uploadData.mimeType,
          sizeBytes: uploadData.sizeBytes
        }
      }
      
      const res = await sendMessage(channelId, workspaceId, currentContent, attachmentData, messageId, replyId)
      if (res?.error) throw new Error(res.error)
      if (res?.message) onSent?.(res.message, tempId)

    } catch (err: unknown) {
      if (tempId) onOptimisticFailed?.(tempId)
      alert((err as Error).message || 'Có lỗi xảy ra khi gửi tin nhắn')
      setContent(currentContent)
      setSelectedFile(currentFile)
    } finally {
      setIsSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      // Keep focus in the composer so the user can keep typing without re-clicking.
      requestAnimationFrame(() => textInputRef.current?.focus())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div 
      className="p-6 bg-transparent shrink-0 relative"
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) {
          handleFileSelection(e.dataTransfer.files[0]);
        }
      }}
    >
      {isDragOver && (
        <div className="absolute inset-x-6 inset-y-2 bg-indigo-950/85 border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center z-50 pointer-events-none animate-fade-in-up">
          <p className="text-xs font-bold text-white">Thả tệp tin hoặc ảnh vào đây</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {content.startsWith('/') && !content.includes(' ') && (() => {
          const results = SLASH_COMMANDS.filter((s) => s.cmd.startsWith(content.slice(1).toLowerCase()))
          if (results.length === 0) return null
          return (
            <div className="bg-[#2b2d31] border border-white/10 rounded-xl shadow-2xl p-1.5 ml-1 animate-fade-in-up">
              {results.map((s) => (
                <button
                  key={s.cmd}
                  type="button"
                  onClick={() => { setContent(`/${s.cmd} `); requestAnimationFrame(() => textInputRef.current?.focus()) }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <span className="text-xs font-extrabold text-cyan-300">/{s.cmd}</span>
                  <span className="text-[11px] text-zinc-400 truncate">{s.desc}</span>
                </button>
              ))}
            </div>
          )
        })()}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2 ml-1 animate-fade-in-up">
            <div className="min-w-0 text-xs">
              <span className="text-indigo-300 font-bold">Đang trả lời {replyingTo.profiles?.display_name || 'tin nhắn'}</span>
              <p className="text-zinc-400 truncate">{replyingTo.content || '(tệp đính kèm)'}</p>
            </div>
            <button type="button" onClick={() => onCancelReply?.()} className="text-zinc-400 hover:text-white shrink-0 cursor-pointer" title="Hủy trả lời">
              ×
            </button>
          </div>
        )}
        {selectedFile && (
          selectedFile.type.startsWith('image/') ? (
            /* Staging Image Preview */
            <div className="relative w-28 h-28 ml-4 rounded-xl border border-white/10 overflow-hidden group shadow-md animate-scale-in flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="w-full h-full object-cover" 
              />
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)} 
                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer shadow-sm text-xs font-bold transition-all border border-white/10"
                title="Hủy ảnh"
              >
                ×
              </button>
            </div>
          ) : (
            /* Staging File Card Preview */
            <div className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-2xl border border-white/5 shadow-md w-max max-w-sm ml-4 animate-scale-in">
              <div className="text-zinc-300"><FileIcon size={20} /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)} 
                className="text-zinc-400 hover:text-white transition-colors text-base font-bold bg-white/5 hover:bg-white/10 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow-sm"
                title="Hủy tệp"
              >
                ×
              </button>
            </div>
          )
        )}

        {isSending && selectedFile && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs px-6 animate-pulse font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Đang tải tệp tin lên kênh...</span>
          </div>
        )}

        <div className="relative">
        {mentionOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1e1f22] border border-white/10 rounded-xl shadow-2xl p-1.5 z-30 animate-scale-in">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-2 py-1 select-none">Thành viên</p>
            <div className="max-h-48 overflow-y-auto">
              {mentionResults.map((mem) => (
                <button
                  key={mem.id}
                  type="button"
                  onClick={() => insertMention(mem.name)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  {mem.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${mem.avatar}`} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{(mem.name || 'U').charAt(0).toUpperCase()}</div>
                  )}
                  <span className="text-xs font-semibold text-zinc-200 truncate">{mem.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="relative bg-[#383a40]/60 border border-white/5 rounded-2xl py-3 px-4 flex items-center shadow-lg focus-within:border-indigo-500 focus-within:bg-[#383a40]/80 transition-all">
           {recording && (
             <div className="absolute inset-0 rounded-2xl bg-[#383a40] flex items-center gap-3 px-4 z-30">
               <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
               <span className="text-xs font-bold text-white">Đang ghi âm… {Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}</span>
               <div className="flex-1" />
               <button type="button" onClick={() => stopRecording(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                 <Trash2 size={14} /> Huỷ
               </button>
               <button type="button" onClick={() => stopRecording(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer">
                 <Send size={14} /> Gửi
               </button>
             </div>
           )}
           <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="text-zinc-400 hover:text-white mr-3 shrink-0 flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-base font-bold animate-pulse-subtle"
             title="Đính kèm tệp tin / hình ảnh"
             disabled={isSending}
           >
             +
           </button>
           <input 
             type="file" 
             className="hidden" 
             ref={fileInputRef}
             onChange={(e) => {
               if (e.target.files?.[0]) handleFileSelection(e.target.files[0])
             }}
           />
           <input
              type="text"
              ref={textInputRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); onTyping?.(); detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length); }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={`Nhắn tin vào ${channelType === 'voice' ? '' : '#'}${channelName}...`}
              className="bg-transparent w-full outline-none text-xs text-white disabled:opacity-50 placeholder:text-zinc-500 font-medium mr-2"
           />
           {/* Emoji picker */}
           <div className="relative shrink-0 mr-1">
             <button
               type="button"
               onClick={() => setEmojiOpen((v) => !v)}
               disabled={isSending}
               className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/5 rounded-lg flex items-center justify-center disabled:opacity-30"
               title="Chèn emoji"
             >
               <Smile size={16} />
             </button>
             {emojiOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                 <div className="absolute z-20 bottom-10 right-0 bg-[#2b2d31] border border-white/10 rounded-2xl shadow-2xl w-80 animate-scale-in overflow-hidden">
                   {/* Tabs */}
                   <div className="flex items-center gap-1 p-1.5 border-b border-white/10">
                     <button type="button" onClick={() => setPickerTab('emoji')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${pickerTab === 'emoji' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}>Emoji</button>
                     <button type="button" onClick={() => { setPickerTab('gif'); if (gifs.length === 0) searchGifs('') }} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${pickerTab === 'gif' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}>GIF</button>
                   </div>

                   {pickerTab === 'emoji' ? (
                     <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                       {customEmojis.length > 0 && (
                         <div className="mb-2">
                           <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-1 mb-1 select-none">Emoji server</p>
                           <div className="grid grid-cols-8 gap-0.5">
                             {customEmojis.map((ce) => (
                               // eslint-disable-next-line @next/next/no-img-element
                               <button key={ce.id} type="button" onClick={() => insertCustomEmoji(ce.name, ce.object_key)} title={`:${ce.name}:`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                                 <img src={`/api/media/${ce.object_key}`} alt={ce.name} className="w-6 h-6 object-contain" />
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                       {EMOJI_CATEGORIES.map((cat) => (
                         <div key={cat.name} className="mb-2">
                           <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-1 mb-1 select-none">{cat.name}</p>
                           <div className="grid grid-cols-8 gap-0.5">
                             {cat.emojis.map((e, idx) => (
                               <button key={`${e}-${idx}`} type="button" onClick={() => insertEmoji(e)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors cursor-pointer">{e}</button>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="p-2">
                       {!TENOR_KEY ? (
                         <p className="text-[11px] text-zinc-400 text-center py-6 px-3 leading-relaxed">Cần khoá Tenor miễn phí để bật GIF.<br />Thêm <code className="text-cyan-300">NEXT_PUBLIC_TENOR_KEY</code> vào biến môi trường.</p>
                       ) : (
                         <>
                           <input
                             value={gifQuery}
                             onChange={(e) => { setGifQuery(e.target.value); searchGifs(e.target.value) }}
                             placeholder="Tìm GIF trên Tenor…"
                             className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 mb-2"
                           />
                           <div className="max-h-56 overflow-y-auto grid grid-cols-3 gap-1 scrollbar-thin scrollbar-thumb-white/10">
                             {gifLoading ? (
                               <p className="col-span-3 text-[11px] text-zinc-500 text-center py-6 animate-pulse">Đang tải…</p>
                             ) : gifs.length === 0 ? (
                               <p className="col-span-3 text-[11px] text-zinc-500 text-center py-6">Không có kết quả</p>
                             ) : (
                               gifs.map((g) => (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img key={g.id} src={g.preview} alt="gif" onClick={() => insertGif(g.url)} className="w-full h-20 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all" />
                               ))
                             )}
                           </div>
                         </>
                       )}
                     </div>
                   )}
                 </div>
               </>
             )}
           </div>
           {/* Poll */}
           <div className="relative shrink-0 mr-1">
             <button
               type="button"
               onClick={() => setPollOpen((v) => !v)}
               disabled={isSending}
               className="text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 p-1 hover:bg-white/5 rounded-lg flex items-center justify-center"
               title="Tạo bình chọn"
             >
               <BarChart3 size={16} />
             </button>
             {pollOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setPollOpen(false)} />
                 <div className="absolute z-20 bottom-10 right-0 w-72 bg-[#2b2d31] border border-white/10 rounded-2xl shadow-2xl p-3 animate-scale-in">
                   <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">Tạo bình chọn</p>
                   <input
                     value={pollQuestion}
                     onChange={(e) => setPollQuestion(e.target.value)}
                     placeholder="Câu hỏi…"
                     className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 mb-2"
                   />
                   <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                     {pollOptions.map((opt, i) => (
                       <div key={i} className="flex items-center gap-1">
                         <input
                           value={opt}
                           onChange={(e) => setPollOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                           placeholder={`Lựa chọn ${i + 1}`}
                           className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                         />
                         {pollOptions.length > 2 && (
                           <button type="button" onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400 cursor-pointer p-1"><X size={13} /></button>
                         )}
                       </div>
                     ))}
                   </div>
                   {pollOptions.length < 10 && (
                     <button type="button" onClick={() => setPollOptions((prev) => [...prev, ''])} className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-indigo-300 hover:text-indigo-200 cursor-pointer">
                       <Plus size={12} /> Thêm lựa chọn
                     </button>
                   )}
                   <button type="button" onClick={createPoll} className="w-full mt-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer">
                     Gửi bình chọn
                   </button>
                 </div>
               </>
             )}
           </div>
           <button
             type="button"
             onClick={startRecording}
             disabled={isSending}
             className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-30 p-1 hover:bg-white/5 rounded-lg flex items-center justify-center mr-1"
             title="Ghi âm tin nhắn thoại"
           >
             <Mic size={16} />
           </button>
           <button
             type="submit"
             disabled={isSending || (!content.trim() && !selectedFile)}
             className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:hover:text-zinc-400 p-1 hover:bg-white/5 rounded-lg flex items-center justify-center"
             title="Gửi tin nhắn"
           >
             <Send size={16} />
           </button>
        </div>
        </div>
      </form>
    </div>
  )
}
