'use client'

import { useState } from 'react'
import { createChannel, createCategory } from '@/app/actions/channel'

export function CreateChannelModal({ workspaceId, categoryId, isCategory = false }: { workspaceId: string, categoryId?: string, isCategory?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    const res = isCategory 
      ? await createCategory(workspaceId, formData)
      : await createChannel(workspaceId, categoryId || null, formData)
      
    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={isCategory ? "text-xs font-semibold text-blue-400 hover:text-blue-300 px-2 py-1" : "text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity font-bold"}
      >
        + {isCategory ? 'TẠO DANH MỤC' : ''}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 text-gray-900">
            <h3 className="font-bold text-lg mb-4">
              {isCategory ? 'Tạo Danh mục' : 'Tạo Kênh mới'}
            </h3>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <form action={handleSubmit} className="flex flex-col gap-4">
              <input 
                type="text" 
                name="name" 
                placeholder="Tên" 
                required 
                className="border p-2 rounded"
              />
              {!isCategory && (
                <>
                  <select name="type" className="border p-2 rounded bg-white">
                    <option value="text">Kênh Text</option>
                    <option value="voice">Kênh Voice</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" name="is_private" value="true" />
                    Kênh riêng tư
                  </label>
                </>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium">Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
