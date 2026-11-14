-- ==============================================================================
-- Schema SQL الشامل لمنصة مستر عمرو السيد في الكيمياء على Supabase
-- يشمل جميع الجداول والأعمدة المطلوبة للطلاب، الكورسات، الملفات، الامتحانات،
-- التصريحات، محفظة الأكواد، طلبات الدفع، الإشعارات الصوتية، وسجلات الحل
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
  age integer,
  role text default 'student',
  subscription_type text default 'course',
  subscriptionType text default 'course',
  wallet_balance numeric default 0,
  walletBalance numeric default 0,
  enrolled_lecture_ids jsonb default '[]'::jsonb,
  last_login_at text,
  is_online boolean default false,
  isOnline boolean default false,
  registered_at text,
  registeredAt text,
  created_at timestamp with time zone default now()
);

alter table public.profiles
  add column if not exists password text,
  add column if not exists parent_phone text,
  add column if not exists student_code text,
  add column if not exists governorate text,
  add column if not exists age integer,
  add column if not exists subscription_type text,
  add column if not exists enrolled_lecture_ids jsonb default '[]'::jsonb,
  add column if not exists last_login_at text;

alter table public.profiles disable row level security;

-- 2. جدول الكورسات والمحاضرات والفيديوهات (courses)
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
  provider text default 'youtube',
  external_id text,
  original_url text,
  cover_image_url text,
  instructions text,
  schedule_text text,
  lessons jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

alter table public.courses
  add column if not exists lessons jsonb default '[]'::jsonb,
  add column if not exists cover_image_url text,
  add column if not exists instructions text,
  add column if not exists schedule_text text,
  add column if not exists provider text,
  add column if not exists external_id text,
  add column if not exists original_url text;

alter table public.courses disable row level security;

-- 3. جدول الملفات والمذكرات والشيتات (documents)
create table if not exists public.documents (
  id text primary key,
  title text not null,
  category text,
  lesson_title text,
  course_id text,
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
  allow_download boolean default true,
  provider text default 'drive',
  external_id text,
  original_url text,
  created_at timestamp with time zone default now()
);

alter table public.documents
  add column if not exists category text,
  add column if not exists lesson_title text,
  add column if not exists course_id text,
  add column if not exists allow_download boolean default true,
  add column if not exists provider text,
  add column if not exists external_id text,
  add column if not exists original_url text;

alter table public.documents disable row level security;

-- 4. جدول الواجبات والامتحانات والأسئلة (assignments)
create table if not exists public.assignments (
  id text primary key,
  title text not null,
  grade text default 'sec3',
  type text default 'homework',
  kind text default 'homework',
  lesson_title text,
  description text,
  deadline text,
  duration_minutes integer default 45,
  time_limit_minutes integer default 45,
  total_marks integer default 60,
  questions jsonb default '[]'::jsonb,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamp with time zone default now()
);

alter table public.assignments
  add column if not exists description text,
  add column if not exists lesson_title text,
  add column if not exists time_limit_minutes integer,
  add column if not exists total_marks integer,
  add column if not exists kind text;

alter table public.assignments disable row level security;

-- 5. جدول طلبات الدفع وإيصالات التحويل (payment_requests)
create table if not exists public.payment_requests (
  id text primary key,
  user_id text,
  student_name text,
  student_phone text,
  lecture_id text,
  lecture_title text,
  amount numeric default 0,
  payment_method_name text,
  receipt_url text,
  status text default 'pending_review',
  submitted_at text,
  activation_deadline text,
  reviewed_at text,
  notes text,
  created_at timestamp with time zone default now()
);

alter table public.payment_requests
  add column if not exists student_name text,
  add column if not exists student_phone text,
  add column if not exists lecture_id text,
  add column if not exists lecture_title text,
  add column if not exists payment_method_name text,
  add column if not exists submitted_at text,
  add column if not exists activation_deadline text,
  add column if not exists reviewed_at text,
  add column if not exists notes text;

alter table public.payment_requests disable row level security;

-- 6. جدول الإشعارات والرسائل الصوتية للطلاب (broadcast_notifications)
create table if not exists public.broadcast_notifications (
  id text primary key,
  title text not null,
  message text default '',
  sender_name text,
  sender_role text default 'admin',
  target_grade text default 'all',
  priority text default 'normal',
  audio_url text,
  audio_duration_seconds integer,
  created_at timestamp with time zone default now()
);

alter table public.broadcast_notifications disable row level security;

-- 7. جدول نتائج وتقييمات الطلاب (exam_submissions)
create table if not exists public.exam_submissions (
  id text primary key,
  exam_id text,
  exam_title text,
  assessment_type text default 'exam',
  lesson_title text,
  student_id text,
  student_name text,
  student_phone text,
  student_code text,
  grade text default 'sec3',
  governorate text,
  score numeric default 0,
  max_score numeric default 1,
  percentage numeric default 0,
  time_spent_minutes integer default 1,
  attempt_number integer default 1,
  total_questions integer,
  solved_questions_count integer,
  correct_questions_count integer,
  started_at text,
  submitted_at text,
  selected_answers jsonb,
  essay_answers jsonb,
  essay_scores jsonb,
  questions_snapshot jsonb,
  blank_count integer,
  status text default 'fully_graded',
  created_at timestamp with time zone default now()
);

alter table public.exam_submissions disable row level security;

-- 8. جدول بنك الأسئلة (question_bank)
create table if not exists public.question_bank (
  id text primary key,
  grade text default 'sec3',
  chapter_title text,
  lesson_title text,
  difficulty text default 'medium',
  type text default 'mcq',
  points numeric default 1,
  text text,
  options jsonb default '[]'::jsonb,
  correct_answer_index integer default 0,
  explanation text,
  model_answer text,
  created_at timestamp with time zone default now()
);

alter table public.question_bank disable row level security;

-- 9. جدول الطلاب المصرح لهم بدخول الكورسات (authorized_students)
create table if not exists public.authorized_students (
  id text primary key,
  student_name text,
  phone text,
  student_code text,
  lecture_id text default 'all',
  date_added text,
  created_at timestamp with time zone default now()
);

alter table public.authorized_students disable row level security;

-- 10. جدول تتبع صلاحيات وإنجاز كل طالب (student_access)
create table if not exists public.student_access (
  id text primary key,
  student_id text,
  lectures jsonb default '{}'::jsonb,
  exams jsonb default '{}'::jsonb,
  homeworks jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

alter table public.student_access disable row level security;

-- 11. جدول أكواد الشحن والتفعيل (recharge_codes)
create table if not exists public.recharge_codes (
  id text primary key,
  code text unique,
  value numeric default 0,
  is_used boolean default false,
  used_by text,
  max_uses integer default 1,
  used_count integer default 0,
  course_id text,
  course_title text,
  date_created text,
  created_at timestamp with time zone default now()
);

alter table public.recharge_codes disable row level security;

-- 12. تفعيل Realtime على جميع الجداول بأمان
do $$
declare
  tbl text;
  tables text[] := array[
    'profiles',
    'courses',
    'documents',
    'assignments',
    'payment_requests',
    'broadcast_notifications',
    'exam_submissions',
    'question_bank',
    'authorized_students',
    'student_access',
    'recharge_codes'
  ];
begin
  foreach tbl in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

