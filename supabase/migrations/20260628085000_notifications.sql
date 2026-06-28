drop table if exists public.notifications cascade;

create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    actor_id uuid references public.profiles(id) on delete cascade not null,
    type text not null check (type in ('mention', 'system')),
    content text not null,
    link text,
    is_read boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can read own notifications."
    on public.notifications for select
    using ( auth.uid() = user_id );

create policy "System can insert notifications."
    on public.notifications for insert
    with check ( true );

create policy "Users can update own notifications."
    on public.notifications for update
    using ( auth.uid() = user_id );
