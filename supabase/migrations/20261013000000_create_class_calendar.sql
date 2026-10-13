create table if not exists public.class_calendar_items (
  id uuid primary key default gen_random_uuid(),
  class_name text not null check (class_name in ('9A', '9B', '9C', '10A', '10B', '10C')),
  item_type text not null check (item_type in ('lesson', 'event')),
  title text not null check (length(trim(title)) between 1 and 120),
  subject text,
  notes text,
  lesson_plan text,
  event_date date,
  weekday smallint,
  start_time time,
  end_time time,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint class_calendar_item_schedule check (
    (item_type = 'lesson' and event_date is null and weekday is not null and weekday between 0 and 6)
    or (item_type = 'event' and event_date is not null and weekday is null)
  ),
  constraint class_calendar_item_times check (
    start_time is null or end_time is null or end_time > start_time
  )
);

create index if not exists class_calendar_items_class_date_idx
  on public.class_calendar_items (class_name, event_date);
create index if not exists class_calendar_items_class_weekday_idx
  on public.class_calendar_items (class_name, weekday);

create or replace function public.teacherdesk_can_access_class(target_class text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_profiles profile
    where profile.user_id = auth.uid()
      and profile.class_name = target_class
  );
$$;

revoke all on function public.teacherdesk_can_access_class(text) from public;
grant execute on function public.teacherdesk_can_access_class(text) to authenticated;

alter table public.class_calendar_items enable row level security;
grant select, insert, delete on public.class_calendar_items to authenticated;

create policy "Teachers can view their class calendar"
  on public.class_calendar_items for select to authenticated
  using (
    lower((auth.jwt() ->> 'email')) = 'kawathankarshardul@gmail.com'
    or public.teacherdesk_can_access_class(class_name)
  );

create policy "Teachers can add items to their class calendar"
  on public.class_calendar_items for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      lower((auth.jwt() ->> 'email')) = 'kawathankarshardul@gmail.com'
      or public.teacherdesk_can_access_class(class_name)
    )
  );

create policy "Teachers can delete their class calendar items"
  on public.class_calendar_items for delete to authenticated
  using (
    lower((auth.jwt() ->> 'email')) = 'kawathankarshardul@gmail.com'
    or public.teacherdesk_can_access_class(class_name)
  );
