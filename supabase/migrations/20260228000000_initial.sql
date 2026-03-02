-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- user_profiles: extends Supabase auth.users
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  company_name text not null default '',
  user_role text not null default '',
  value_proposition text not null default '',
  industry text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- accounts: one per target company the user researches
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  company_name text not null,
  contact_name text not null default '',
  contact_role text not null default '',
  industry text not null default '',
  created_at timestamptz not null default now()
);

-- account_sections: the 8 AI-generated sections per account
create table public.account_sections (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references public.accounts on delete cascade not null,
  section_type text not null,
  content text not null default '',
  generated_at timestamptz not null default now(),
  unique(account_id, section_type)
);

-- Indexes
create index accounts_user_id_idx on public.accounts(user_id);
create index account_sections_account_id_idx on public.account_sections(account_id);

-- RLS: enable row level security on all tables
alter table public.user_profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_sections enable row level security;

-- RLS policies: user_profiles
create policy "Users can view own profile"
  on public.user_profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = id);

-- RLS policies: accounts
create policy "Users can view own accounts"
  on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can delete own accounts"
  on public.accounts for delete using (auth.uid() = user_id);

-- RLS policies: account_sections (access via accounts join)
create policy "Users can view own account sections"
  on public.account_sections for select using (
    exists (
      select 1 from public.accounts
      where accounts.id = account_sections.account_id
        and accounts.user_id = auth.uid()
    )
  );
create policy "Users can insert own account sections"
  on public.account_sections for insert with check (
    exists (
      select 1 from public.accounts
      where accounts.id = account_sections.account_id
        and accounts.user_id = auth.uid()
    )
  );
create policy "Users can delete own account sections"
  on public.account_sections for delete using (
    exists (
      select 1 from public.accounts
      where accounts.id = account_sections.account_id
        and accounts.user_id = auth.uid()
    )
  );

-- Trigger: auto-update updated_at on user_profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

-- Trigger: auto-create a user_profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
