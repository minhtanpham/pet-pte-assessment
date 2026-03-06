# Assessment — Real-time Chat App

A real-time chat application built with [Expo](https://expo.dev) (expo-router), **WebRTC** video calling, and **Supabase** as the backend. Uses a Development Build — Expo Go is not supported because WebRTC requires native code.

## Tech stack

| Layer              | Library                                          |
| ------------------ | ------------------------------------------------ |
| Framework          | Expo 54 / React Native 0.81.5                    |
| Navigation         | expo-router 6 (file-based)                       |
| Backend            | Supabase (Auth, PostgreSQL, Realtime)            |
| State              | Redux Toolkit + Redux Persist                    |
| Local storage      | react-native-mmkv                                |
| Session            | expo-secure-store                                |
| Video calls        | react-native-webrtc                              |
| Encryption         | TweetNaCl (`box` — asymmetric E2E) + Web Crypto API (`crypto.getRandomValues`) |
| Push notifications | expo-notifications (Expo Push Service)           |
| Safe area          | react-native-safe-area-context                   |

---

## Features

- **Email/password auth** with persistent session via SecureStore
- **One-on-one chat** with real-time messages, timestamps, and sent/seen indicators
- **Group chat** — create rooms with multiple participants
- **End-to-end encryption** — messages encrypted with NaCl `box` (asymmetric); each user's keypair stored in MMKV, public key published to Supabase
- **Video calls** — WebRTC peer-to-peer with Supabase Realtime signaling; mute, camera toggle, end call
- **Push notifications** — new messages trigger Expo push notifications via the Expo Push Service
- **Offline support** — messages queued when offline (Redux Persist) and flushed on reconnect
- **Safe area** — all screens respect device notch/home indicator via `react-native-safe-area-context`
- **Loading states** — `ActivityIndicator` shown on every screen during initial data fetch

---

## Environment setup

### Required versions

| Tool      | Version used      | Notes                   |
| --------- | ----------------- | ----------------------- |
| Node.js   | 22.22.0           | LTS recommended         |
| npm       | bundled with Node | —                       |
| Ruby      | 3.3.5             | Required by CocoaPods   |
| CocoaPods | 1.16.2            | `gem install cocoapods` |
| Xcode     | 26.3              | macOS Tahoe             |
| Swift     | 6.2.4             | bundled with Xcode      |
| Python    | 3.14.3            | for build scripts       |

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
create policy "Participants can read conversations" on public.conversations for select using (participants @> array[auth.uid()]);
create policy "Participants can insert conversations" on public.conversations for insert with check (participants @> array[auth.uid()]);
create policy "Participants can update conversations" on public.conversations for update using (participants @> array[auth.uid()]);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  text text not null,
  nonce text,
  sender_public_key text,
  recipient_public_key text,
  encrypted boolean default false,
  status text default 'sent',
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Participants can read messages" on public.messages for select using (
  exists (
    select 1 from public.conversations
    where id = conversation_id and participants @> array[auth.uid()]
  )
);
create policy "Sender can insert messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Participants can update message status" on public.messages for update using (
  exists (
    select 1 from public.conversations
    where id = conversation_id and participants @> array[auth.uid()]
  )
);

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
create policy "Participants can read groups" on public.groups for select using (participants @> array[auth.uid()]);
create policy "Authenticated can create groups" on public.groups for insert with check (auth.role() = 'authenticated');
create policy "Participants can update groups" on public.groups for update using (participants @> array[auth.uid()]);

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
  exists (
    select 1 from public.groups
    where id = group_id and participants @> array[auth.uid()]
  )
);
create policy "Participants can insert group messages" on public.group_messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.groups
    where id = group_id and participants @> array[auth.uid()]
  )
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
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_messages;

-- Required for filtered UPDATE/DELETE realtime events (e.g. seen status)
alter table public.messages replica identity full;
alter table public.group_messages replica identity full;
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

| Change                                        | pod install | rebuild |
| --------------------------------------------- | ----------- | ------- |
| Editing JS/TS code                            | No          | No      |
| Changing app name, icon, splash               | No          | No      |
| Adding/removing a native package              | Yes         | Yes     |
| Changing permissions or plugins in `app.json` | Yes         | Yes     |

---

## Project structure

```
app/
  _layout.tsx           root layout — SafeAreaProvider, Redux Provider, auth gate
  modal.tsx             generic modal screen
  (auth)/
    _layout.tsx         headerless stack for unauthenticated screens
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx         bottom tab navigator (Chats, Groups)
    index.tsx           conversations list
    groups.tsx          groups list
    explore.tsx         placeholder / explore tab
  chat/[id].tsx         one-on-one chat screen
  call/[id].tsx         WebRTC video call screen
  group/[id].tsx        group chat screen

store/
  index.ts              Redux store + Redux Persist (MMKV adapter)
  slices/
    index.ts
    auth-slice.ts
    chat-slice.ts       messages, conversations, pending queue — memoized selectors
    network-slice.ts

lib/
  index.ts              barrel re-exports
  supabase.ts           Supabase client (reads EXPO_PUBLIC_* env vars)
  auth.ts               login, register, logout, restoreSession helpers
  database.ts           Supabase queries + Realtime subscriptions (messages, conversations, groups)
  signaling.ts          Supabase Realtime WebRTC signaling (offer/answer/ICE)
  encryption.ts         NaCl box asymmetric E2E — keypair stored in MMKV, public key in Supabase
  notifications.ts      Expo Push Token registration + sendPushNotification helper
  storage.ts            MMKV instance, Redux Persist storage adapter, typed get/set helpers
  network.ts            NetInfo → Redux isConnected
  webrtc.ts             RTCPeerConnection lifecycle helpers

hooks/
  index.ts
  useAuth.ts
  useColorScheme.ts
  useColorScheme.web.ts
  useMessages.ts
  useNetwork.ts
  useThemeColor.ts
  useWebRTC.ts

components/
  index.ts
  ExternalLink.tsx
  HapticTab.tsx
  HelloWave.tsx
  ParallaxScrollView.tsx
  ThemedText.tsx
  ThemedView.tsx
  chat/
    index.ts
    ChatView.tsx        shared chat UI (FlatList + ChatInput) used by both chat and group screens
    ChatInput.tsx       text input + send button
    ChatList.tsx        conversations FlatList with memoized items and batch user-name fetch
    MessageBubble.tsx   message row with sent/seen indicator (React.memo + areEqual)
    GroupHeader.tsx
  call/
    index.ts
    CallControls.tsx    mute / camera toggle / end call buttons
  modals/
    index.ts
    SheetModal.tsx          bottom-sheet style modal base
    SearchDisplayNameModal.tsx  user search by display name (for starting new chats)
    CreateNewGroupModal.tsx     group creation form — name input + participant search
  ui/
    index.ts
    ScreenContainer.tsx SafeAreaView wrapper — configurable edges, default background
    LoadingOverlay.tsx  centred ActivityIndicator (flex: 1) for initial load states
    IconSymbol.tsx      SF Symbols wrapper (cross-platform)
    icon-symbol.ios.tsx iOS-native SF Symbols implementation
    Collapsible.tsx

constants/
  index.ts              single source of truth — Palette, Colors, FontSize, Fonts, Spacing,
                        BorderRadius, Layout, Chat (FlatList perf), Query limits
```

---

## Architecture notes

### Safe area
All screens are wrapped in `ScreenContainer` (a thin `SafeAreaView` wrapper) with configurable `edges`. Chat screens delegate the bottom edge to a `SafeAreaView` that wraps `ChatInput` inside `ChatView`, so the input bar always clears the home indicator.

### Loading states
Every data-fetching screen starts with `isLoading = true`. The subscribe helpers in `lib/database.ts` accept an optional `onReady` callback that fires once the initial Supabase fetch resolves, flipping `isLoading` to `false`. `LoadingOverlay` (centred `ActivityIndicator`) is rendered in place of content until then.

### Encryption

End-to-end encryption uses NaCl `box` (X25519 Diffie-Hellman key exchange + XSalsa20-Poly1305).

**PRNG fix:** React Native's Hermes engine (New Architecture) exposes the Web Crypto API globally. `nacl.setPRNG()` is called once at module load to route all of NaCl's internal random-byte generation through `crypto.getRandomValues()`, eliminating the "no PRNG" error without any extra native package.

**Keypair lifecycle:**
1. On first launch `nacl.box.keyPair()` generates a keypair; it is persisted to MMKV and reused on every subsequent launch.
2. After every login `publishPublicKey(uid)` writes the public key to `users.public_key` in Supabase.

**Send path:** `sendMessage()` fetches the conversation participants, retrieves the recipient's public key from Supabase, then calls `nacl.box(plaintext, nonce, recipientPublicKey, senderSecretKey)`. The database row stores `{ text: ciphertext, nonce, sender_public_key, recipient_public_key, encrypted: true }`. Supabase never sees the plaintext.

**Receive path:** `toMessage()` (called for both the initial fetch and every Realtime INSERT) checks `row.encrypted`. If the current user is the **recipient**, it decrypts with `nacl.box.open(ciphertext, nonce, senderPublicKey, ownSecretKey)`. If the current user is the **sender** (detected by comparing `sender_public_key` with the local keypair), it decrypts with `nacl.box.open(ciphertext, nonce, recipientPublicKey, ownSecretKey)` — both sides derive the same shared secret. A failed decrypt returns `'[encrypted]'` instead of crashing.

**Note on `tweetnacl-util` naming:** `decodeUTF8(string) → Uint8Array` (string to bytes, used before encrypting) and `encodeUTF8(Uint8Array) → string` (bytes to string, used after decrypting). The names are the inverse of what you might expect.

### Offline queue
Messages sent while `network.isConnected` is `false` are stored in `pendingMessages[]` inside the Redux slice (persisted to MMKV). A `useEffect` watching `isConnected` flushes the queue when connectivity is restored.

### FlatList performance
- `getItemLayout` with fixed heights from `Chat` constants eliminates layout recalculation
- `React.memo` + custom `areEqual` on `MessageBubble` and `ConversationItem`
- `maxToRenderPerBatch`, `windowSize`, `initialNumToRender` tuned via `Chat` constants
- `removeClippedSubviews` enabled
- Memoized Redux selectors via `createSelector` (RTK)
- `ChatList` only re-fetches display names when participant UIDs change (not on every `lastMessage` update)

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
- [TweetNaCl](https://tweetnacl.js.org)
