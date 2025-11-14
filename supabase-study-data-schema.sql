-- Study Data Schema for Study Buddy / Adaptive Teaching System
-- ===========================================================
-- You can run this file manually in Supabase, as you mentioned.

-- Users' study sessions (per subject/topic, time-bounded)
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject text,
  topic text,
  difficulty_level text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_blocks int,
  completed_blocks int,
  accuracy numeric,
  time_spent_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-topic progress/mastery
create table if not exists study_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject text,
  topic text,
  difficulty_level text,
  mastery_level text, -- e.g. 'novice', 'developing', 'proficient', 'mastery'
  last_score numeric,
  attempts int default 0,
  correct_attempts int default 0,
  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Granular event log (questions, answers, correctness, etc.)
create table if not exists study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid references study_sessions(id) on delete set null,
  subject text,
  topic text,
  event_type text, -- e.g. 'question_answered', 'hint_requested', 'checkpoint_reached'
  payload jsonb,
  is_correct boolean,
  created_at timestamptz not null default now()
);

-- Optional: indexes for quick lookup
create index if not exists idx_study_sessions_user_id on study_sessions(user_id);
create index if not exists idx_study_topic_progress_user_subject_topic on study_topic_progress(user_id, subject, topic);
create index if not exists idx_study_events_user_id on study_events(user_id);
