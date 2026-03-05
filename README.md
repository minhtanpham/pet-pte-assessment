# Assessment — Real-time Chat App

A real-time chat application built with [Expo](https://expo.dev) (expo-router), **WebRTC** video calling, and **Supabase** as the backend. Uses a Development Build — Expo Go is not supported because WebRTC requires native code.

## Tech stack

| Layer | Library |
|-------|---------|
| Framework | Expo 54 / React Native 0.81.5 |
| Navigation | expo-router 6 (file-based) |
| Backend | Supabase (Auth, PostgreSQL, Realtime) |
| State | Redux Toolkit + Redux Persist |
| Local storage | react-native-mmkv |
| Session | expo-secure-store |
| Video calls | react-native-webrtc |
| Encryption | TweetNaCl (secretbox) |
| Push notifications | expo-notifications (Expo Push Service) |

---

## Environment setup

### Required versions

| Tool | Version used | Notes |
|------|-------------|-------|
| Node.js | 22.22.0 | LTS recommended |
| npm | bundled with Node | — |
| Ruby | 3.3.5 | Required by CocoaPods |
| CocoaPods | 1.16.2 | `gem install cocoapods` |
| Xcode | 26.3 | macOS Tahoe |
| Swift | 6.2.4 | bundled with Xcode |
| Python | 3.14.3 | for build scripts |

> **Xcode note:** Firebase's native SDK (`@react-native-firebase`) is **not used** in this project. We migrated to the pure-JS Supabase SDK specifically to avoid gRPC / Swift 6 build incompatibilities introduced in Xcode 26.

---

## Supabase setup

### 1. Create a project

Go to [supabase.com](https://supabase.com), create a new project, and note your **Project URL** and **Anon key** (Settings → API).

### 2. Run the database schema

Open the **SQL Editor** in your Supabase dashboard and run:

```sql
-- Users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  push_token text,
  public_key text,
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "Users can read all profiles" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Conversations
create table public.conversations (
  id text primary key,
  participants uuid[] not null,
  last_message text default '',
  updated_at timestamptz default now()
);
alter table public.conversations enable row level security;
create policy "Participants can read conversations" on public.conversations for select using (auth.uid() = any(participants));
create policy "Participants can insert conversations" on public.conversations for insert with check (auth.uid() = any(participants));
create policy "Participants can update conversations" on public.conversations for update using (auth.uid() = any(participants));

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  text text not null,
  nonce text,
  sender_public_key text,
  encrypted boolean default false,
  status text default 'sent',
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Participants can read messages" on public.messages for select using (
  auth.uid() = any((select participants from public.conversations where id = conversation_id))
);
create policy "Sender can insert messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Sender can update message status" on public.messages for update using (true);

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  participants uuid[] not null,
  created_by uuid not null references public.users(id),
  last_message text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.groups enable row level security;
create policy "Participants can read groups" on public.groups for select using (auth.uid() = any(participants));
create policy "Authenticated can create groups" on public.groups for insert with check (auth.uid() = created_by);
create policy "Participants can update groups" on public.groups for update using (auth.uid() = any(participants));

-- Group messages
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  text text not null,
  status text default 'sent',
  created_at timestamptz default now()
);
alter table public.group_messages enable row level security;
create policy "Participants can read group messages" on public.group_messages for select using (
  auth.uid() = any((select participants from public.groups where id = group_id))
);
create policy "Participants can insert group messages" on public.group_messages for insert with check (
  auth.uid() = sender_id and
  auth.uid() = any((select participants from public.groups where id = group_id))
);

-- Calls (WebRTC signaling)
create table public.calls (
  id text primary key,
  caller_id uuid not null references public.users(id),
  callee_id uuid not null references public.users(id),
  offer jsonb,
  answer jsonb,
  status text default 'ringing',
  created_at timestamptz default now()
);
alter table public.calls enable row level security;
create policy "Participants can access calls" on public.calls for all using (
  auth.uid() = caller_id or auth.uid() = callee_id
);

-- Enable realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.group_messages;
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> `.env` is gitignored — credentials are never committed.

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install iOS pods

```bash
cd ios && pod install && cd ..
```

### 3. Build and run

```bash
# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android
```

---

## Daily development

Once the dev client is installed, start Metro only:

```bash
npx expo start
```

Open the installed dev client on your simulator and connect via QR code or press `i` / `a`.

---

## When to re-run pod install + rebuild

| Change | pod install | rebuild |
|--------|-------------|---------|
| Editing JS/TS code | No | No |
| Changing app name, icon, splash | No | No |
| Adding/removing a native package | Yes | Yes |
| Changing permissions or plugins in `app.json` | Yes | Yes |

---

## Project structure

```
app/
  (auth)/           login + register screens
  (tabs)/           chats list + groups list
  chat/[id].tsx     one-on-one chat
  call/[id].tsx     WebRTC video call
  group/[id].tsx    group chat
store/
  slices/           auth, chat, network Redux slices
lib/
  supabase.ts       Supabase client (reads from .env)
  auth.ts           Supabase Auth helpers + SecureStore session
  database.ts       Supabase DB queries + Realtime subscriptions
  signaling.ts      Supabase Realtime WebRTC signaling
  encryption.ts     TweetNaCl E2E encryption (keypair in MMKV)
  notifications.ts  Expo Push Token registration
  storage.ts        MMKV instance + Redux Persist adapter + typed helpers
  network.ts        NetInfo listener → Redux isConnected
  webrtc.ts         RTCPeerConnection helpers
hooks/
  use-auth.ts
  use-network.ts
  use-webrtc.ts
  use-messages.ts
components/
  chat/             MessageBubble, ChatInput, ChatList, GroupHeader
  call/             CallControls
patches/
  expo-modules-core+3.0.29.patch   Swift 6 fix for expo-notifications
```

---

## Native config

- **iOS bundle ID:** `com.tanpham.assessment`
- **Android package:** `com.tanpham.assessment`
- **Permissions:** Camera, Microphone, Internet, Notifications
- **iOS deployment target:** 15.1

---

## Learn more

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Supabase Docs](https://supabase.com/docs)
- [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc)
- [Expo Router](https://docs.expo.dev/router/introduction)
