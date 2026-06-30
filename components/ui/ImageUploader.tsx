'use client';

import React, { useState, useRef } from 'react';
import { ImagePlus } from 'lucide-react';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  folder?: 'avatars' | 'workspaces' | 'messages';
  className?: string;
  defaultImage?: string;
}

export function ImageUploader({ onUploadSuccess, folder = 'messages', className = '', defaultImage }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(defaultImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh tối đa là 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Chỉ hỗ trợ định dạng hình ảnh');
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Upload server-side via /api/upload (no R2 CORS needed, with Supabase
      // Storage fallback). Returns the object key used by /api/media.
      const objectKey: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append('file', file);
        form.append('folder', folder);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.objectKey) resolve(data.objectKey);
              else reject(new Error(data.error || 'Upload thất bại'));
            } catch {
              reject(new Error('Phản hồi upload không hợp lệ'));
            }
          } else {
            let msg = 'Upload thất bại với status: ' + xhr.status;
            try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* ignore */ }
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => reject(new Error('Lỗi mạng khi upload'));

        xhr.open('POST', '/api/upload', true);
        xhr.send(form);
      });

      onUploadSuccess(objectKey);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi upload ảnh');
      setPreview(defaultImage || null);
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={`relative group cursor-pointer ${className}`} onClick={() => !isUploading && fileInputRef.current?.click()}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg, image/png, image/webp, image/gif"
        className="hidden"
        disabled={isUploading}
      />
      
      <div className="w-full h-full min-h-[100px] border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all overflow-hidden relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-zinc-400 flex flex-col items-center">
            <ImagePlus size={28} className="mb-2" />
            <span className="text-sm font-medium">Bấm để tải ảnh lên</span>
          </div>
        )}

        {/* Lớp phủ khi hover hoặc đang upload */}
        {(isUploading || !preview) && (
          <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity ${isUploading ? 'opacity-100' : ''}`}>
             {isUploading ? (
               <div className="w-3/4 max-w-[200px]">
                 <div className="text-sm font-bold text-center mb-2">{progress}%</div>
                 <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                     style={{ width: `${progress}%` }}
                   />
                 </div>
               </div>
             ) : (
               <div className="font-medium">Thay đổi ảnh</div>
             )}
          </div>
        )}
      </div>

      {error && <div className="text-red-500 text-xs mt-2 font-medium text-center">{error}</div>}
    </div>
  );
}
