-- Seed data for dev testing

-- Lưu ý: Bạn cần có auth users tương ứng hoặc có thể tạo dummy data. 
-- Đoạn này chỉ là template cho dev environment.

-- Ví dụ insert profile (nếu auth user id đã biết hoặc dùng fake id, cần trigger auth.users):
-- INSERT INTO public.profiles (id, username, display_name) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin User')
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO public.workspaces (id, name, slug, owner_id) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'Dev Workspace', 'dev-workspace', '00000000-0000-0000-0000-000000000001')
-- ON CONFLICT (id) DO NOTHING;
