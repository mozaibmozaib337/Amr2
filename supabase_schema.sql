-- ==============================================================================
-- Schema SQL لمنصة مستر عمرو السيد في الكيمياء على Supabase
-- يدعم الجداول المطلوبة: profiles, courses, documents, assignments
-- مع فتح سياسات RLS بالكامل (Select, Insert, Update, Delete) لضمان العمل المباشر بدون قيود
-- ==============================================================================

-- 1. جدول الطلاب وحسابات المستخدمين (profiles)
create table if not exists public.profiles (
  id text primary key,
  name text,
  full_name text,
  phone text,
  parent_phone text,
  parentPhone text,
  student_code text,
  studentCode text,
  email text,
  password text,
  grade text default 'sec3',
  governorate text,
  role text default 'student',
  subscription_type text default 'course',
  subscriptionType text default 'course',
  wallet_balance numeric default 0,
  walletBalance numeric default 0,
  is_online boolean default false,
  isOnline boolean default false,
  registered_at text,
  registeredAt text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Enable all for profiles" on public.profiles;
create policy "Enable all for profiles" on public.profiles for all using (true) with check (true);

-- 2. جدول المحاضرات والفيديوهات (courses)
create table if not exists public.courses (
  id text primary key,
  title text not null,
  chapter_title text,
  chapterTitle text,
  description text,
  grade text default 'sec3',
  video_url text,
  videoUrl text,
  video_file_name text,
  videoFileName text,
  video_file_size text,
  videoFileSize text,
  duration_minutes integer default 60,
  durationMinutes integer default 60,
  price numeric default 0,
  is_free boolean default false,
  isFree boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.courses enable row level security;
drop policy if exists "Enable all for courses" on public.courses;
create policy "Enable all for courses" on public.courses for all using (true) with check (true);

-- 3. جدول الملفات والمذكرات والشيتات (documents)
create table if not exists public.documents (
  id text primary key,
  title text not null,
  category text,
  grade text default 'sec3',
  file_url text,
  fileUrl text,
  file_name text,
  fileName text,
  file_type text default 'pdf',
  fileType text default 'pdf',
  size_mb numeric default 5,
  sizeMb numeric default 5,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.documents enable row level security;
drop policy if exists "Enable all for documents" on public.documents;
create policy "Enable all for documents" on public.documents for all using (true) with check (true);

-- 4. جدول الواجبات والامتحانات والأسئلة (assignments)
create table if not exists public.assignments (
  id text primary key,
  title text not null,
  grade text default 'sec3',
  type text default 'homework', -- 'homework' or 'exam'
  description text,
  deadline text,
  duration_minutes integer default 45,
  durationMinutes integer default 45,
  total_marks integer default 60,
  totalMarks integer default 60,
  questions jsonb default '[]'::jsonb,
  file_url text,
  fileUrl text,
  file_name text,
  fileName text,
  file_type text,
  fileType text,
  created_at timestamp with time zone default now()
);

alter table public.assignments enable row level security;
drop policy if exists "Enable all for assignments" on public.assignments;
create policy "Enable all for assignments" on public.assignments for all using (true) with check (true);

-- 5. تفعيل Realtime على جميع الجداول الأربعة
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.courses;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.assignments;
