-- Extend profiles table to include about_me and banner_color
alter table public.profiles add column if not exists about_me text;
alter table public.profiles add column if not exists banner_color text default '#5865f2';
