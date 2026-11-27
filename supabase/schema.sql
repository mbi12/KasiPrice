-- Nicole Beauty Parlour — Supabase PostgreSQL + Realtime Schema
create table if not exists public.nbp_styles (
  id text primary key,
  name text not null,
  category text not null default 'Knotless',
  image text not null,
  pricing_mode text not null default 'matrix',
  flat_price integer default 250,
  default_size text default 'medium',
  default_length text default 'midback',
  duration text default '4 - 5 hrs',
  packs text default '5-6 packs',
  badge text default 'New Drop',
  description text,
  featured boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.nbp_promotions (
  id text primary key,
  title text not null,
  subtitle text,
  discount_percent integer not null default 15,
  code text not null,
  style_id text,
  image text,
  price_highlight text,
  valid_until date,
  theme text default 'royal-sky',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.nbp_bookings (
  id text primary key,
  client_name text not null,
  client_phone text not null,
  style_id text not null,
  style_name text not null,
  style_image text,
  size text not null,
  size_label text,
  length text not null,
  length_label text,
  stylist_name text default 'Nicole',
  appointment_date date not null,
  appointment_time text not null,
  add_ons jsonb default '[]'::jsonb,
  promo_code text,
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  deposit integer not null,
  payment_method text,
  notes text,
  status text not null default 'Confirmed',
  created_at timestamptz not null default now()
);

create table if not exists public.nbp_messages (
  id text primary key,
  thread_id text not null default 'thread-nicole',
  sender text not null check (sender in ('client', 'salon')),
  sender_name text not null,
  text text,
  image text,
  badge text,
  created_at timestamptz not null default now()
);

create table if not exists public.nbp_admins (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  owner_name text not null default 'Nicole • Parlour Owner',
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.nbp_admins enable row level security;
alter table public.nbp_styles enable row level security;
alter table public.nbp_promotions enable row level security;
alter table public.nbp_bookings enable row level security;
alter table public.nbp_messages enable row level security;
