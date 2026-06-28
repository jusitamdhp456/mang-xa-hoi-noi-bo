# Mạng Xã Hội Nội Bộ (Clone Discord)

Đây là dự án Mạng xã hội nội bộ dành cho doanh nghiệp / tổ chức với các tính năng giao tiếp thời gian thực, giống với Discord.
Ngôn ngữ sử dụng trong ứng dụng hoàn toàn bằng Tiếng Việt.

## Công nghệ sử dụng
- **Framework**: Next.js 14+ (App Router), React, TypeScript, TailwindCSS
- **Database & Auth & Realtime**: Supabase (PostgreSQL, Row Level Security)
- **Lưu trữ File & Ảnh**: Cloudflare R2 (Tương thích S3, chi phí băng thông thấp)
- **Voice & Video Call**: LiveKit (Mã nguồn mở hỗ trợ WebRTC)

## Hướng dẫn cài đặt tại Local

### 1. Yêu cầu hệ thống
- Node.js >= 18
- Tài khoản Supabase, Cloudflare, LiveKit Cloud (hoặc tự host LiveKit)

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Cấu hình Biến môi trường
Copy file `.env.example` thành `.env.local` và điền các thông số:

#### Supabase
Tạo dự án mới trên Supabase và lấy thông tin tại phần `Project Settings > API`:
- `NEXT_PUBLIC_SUPABASE_URL`: Đường dẫn URL của project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Mã public anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: Khóa bảo mật dành cho quyền Admin (Không bao giờ gửi xuống Client).

*Lưu ý: Mở SQL Editor trong Supabase và chạy các file trong thư mục `supabase/migrations/` để tạo các bảng, RLS Policies.*

#### Cloudflare R2 (Lưu trữ ảnh & file)
Vào Cloudflare Dashboard > R2 > Tạo một Bucket.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: Lấy trong phần quản lý Token của R2.
- `R2_ENDPOINT`: Lấy trong Settings của Bucket.
- `R2_BUCKET_NAME`: Tên bucket bạn vừa tạo.
- `NEXT_PUBLIC_R2_PUBLIC_URL`: (Tùy chọn) Public Custom Domain trỏ tới bucket để tăng tốc độ tải ảnh.

#### LiveKit (Phòng thoại & Gọi video)
Tạo project trên LiveKit Cloud:
- `LIVEKIT_API_KEY`: Mã Key.
- `LIVEKIT_API_SECRET`: Mã Secret bảo mật.
- `NEXT_PUBLIC_LIVEKIT_URL`: URL wss (WebSocket) của LiveKit.

#### Khác
- `NEXT_PUBLIC_APP_URL`: Đặt là `http://localhost:3000` khi chạy ở máy trạm, và điền domain thực tế khi deploy.

### 4. Khởi chạy
```bash
npm run dev
```

## Hướng dẫn Triển khai (Deploy) lên Vercel

1. Push toàn bộ mã nguồn này lên một kho lưu trữ GitHub của bạn.
2. Đăng nhập vào [Vercel](https://vercel.com/) và chọn "Add New Project".
3. Chọn kho lưu trữ GitHub chứa code này.
4. Ở phần **Environment Variables**, hãy sao chép toàn bộ các biến trong file `.env.local` của bạn và dán vào (chú ý điền đúng giá trị của môi trường Production).
5. Sửa `NEXT_PUBLIC_APP_URL` thành domain Production của bạn (ví dụ: `https://mang-xa-hoi-cua-toi.vercel.app`).
6. Nhấn **Deploy** và chờ Vercel build dự án. 
7. Ứng dụng đã sẵn sàng!

## Thiết kế bảo mật
- **Supabase RLS (Row Level Security)**: Người dùng chỉ có thể lấy dữ liệu nếu họ là thành viên (member) của Workspace đó.
- **Server Actions & Presigned URL**: Không bao giờ lộ Secret Key của S3/R2 xuống trình duyệt. Việc tạo mã Upload và Download diễn ra ở phía Server Node.js (Route Handlers).
- **LiveKit Tokens**: Chỉ những ai đã đăng nhập và thuộc đúng kênh mới được Server cấp Token tham gia phòng thoại.
