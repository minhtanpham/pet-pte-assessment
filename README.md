# Assessment — Expo App with WebRTC

This is an [Expo](https://expo.dev) project using [expo-router](https://docs.expo.dev/router/introduction) with **WebRTC support** via `react-native-webrtc`.

> **Note:** This project uses a **Development Build** instead of Expo Go. Expo Go does not support WebRTC because it requires native code not included in its pre-built binary.

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install WebRTC and dev client (if not already in package.json)

```bash
npx expo install react-native-webrtc expo-dev-client
```

### 3. Generate native folders (one-time)

```bash
npx expo prebuild
```

This creates the `android/` and `ios/` directories from your `app.json` config. You only need to re-run this when:
- Adding or removing a native package
- Changing native config in `app.json` (permissions, plugins, `infoPlist`, etc.)

### 4. Build and install the dev client on your device/simulator

```bash
# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android
```

This builds the native app and installs it. You only need to re-run this after `prebuild`.

## Daily development

Once the dev client is installed, just start Metro:

```bash
npx expo start
```

Open the installed dev client app on your device/simulator and scan the QR code. It supports hot reload just like Expo Go.

## When to re-run prebuild + build

| Change | Requires prebuild? | Requires rebuild? |
|---|---|---|
| Editing JS/TS code | No | No |
| Changing app name, icon, splash | No | No |
| Adding/removing a native package | Yes | Yes |
| Changing permissions or plugins in `app.json` | Yes | Yes |

## Firebase setup

Before running the app you **must** replace the placeholder Firebase config files:

1. Create a Firebase project at console.firebase.google.com
2. Enable **Email/Password** authentication
3. Create a **Firestore** database (start in test mode)
4. Enable **Cloud Messaging** (for push notifications)
5. Download `google-services.json` (Android) → replace `./google-services.json`
6. Download `GoogleService-Info.plist` (iOS) → replace `./GoogleService-Info.plist`

### Required Firestore indexes

```
conversations: participants (array-contains) + updatedAt (desc)
messages/{id}/messages: createdAt (desc)
groups: participants (array-contains) + updatedAt (desc)
users: displayName (asc)
calls: (no composite index needed)
```

## Project structure

```
app/
  (auth)/         login + register screens
  (tabs)/         chats list + groups list + explore
  chat/[id].tsx   one-on-one chat
  call/[id].tsx   WebRTC video call
  group/[id].tsx  group chat
store/
  slices/         auth, chat, network Redux slices
lib/
  auth.ts         Firebase Auth helpers + SecureStore session
  firestore.ts    Firestore CRUD + real-time listeners
  webrtc.ts       RTCPeerConnection helpers
  signaling.ts    Firestore-based WebRTC signaling
  encryption.ts   TweetNaCl E2E encryption
  notifications.ts FCM + expo-notifications
  storage.ts      MMKV typed helpers
hooks/
  use-auth.ts
  use-network.ts
  use-webrtc.ts
  use-messages.ts
components/
  chat/           MessageBubble, ChatInput, ChatList, GroupHeader
  call/           CallControls
```

## Native config

- **iOS bundle ID:** `com.tanpham.assessment`
- **Android package:** `com.tanpham.assessment`
- **Permissions:** Camera, Microphone, Internet, Notifications

## Learn more

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Router](https://docs.expo.dev/router/introduction)
