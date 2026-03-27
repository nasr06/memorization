# Project Setup Guide

## Prerequisites

```bash
node >= 20
npm >= 10
expo-cli (via npx)
eas-cli: npm install -g eas-cli
```

## 1. Create the Expo app

```bash
npx create-expo-app memorization --template tabs
cd memorization
```

## 2. Install dependencies

```bash
# Styling
npx expo install nativewind tailwindcss
npx expo install react-native-reanimated react-native-gesture-handler

# Router (already in template, but ensure latest)
npx expo install expo-router

# Local DB
npx expo install expo-sqlite
npm install drizzle-orm drizzle-kit
npm install @drizzle-team/expo-sqlite-utils

# State
npm install zustand @tanstack/react-query

# Forms
npm install react-hook-form zod @hookform/resolvers

# Backend
npm install @supabase/supabase-js

# File handling
npx expo install expo-file-system expo-document-picker expo-sharing

# .apkg parsing
npm install jszip sql.js

# Notifications
npx expo install expo-notifications

# Storage
npx expo install expo-secure-store

# UI
npm install lucide-react-native @gorhom/bottom-sheet

# Haptics
npx expo install expo-haptics

# Camera (for QR friend codes)
npx expo install expo-camera expo-barcode-scanner

# Audio
npx expo install expo-av

# Lottie (animations)
npx expo install lottie-react-native
```

## 3. Configure NativeWind

```bash
# tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
};

# babel.config.js — add to plugins:
["nativewind/babel"]
```

## 4. Configure Drizzle

```bash
# drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
```

## 5. Supabase setup

1. Create project at supabase.com
2. Copy URL + anon key to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
3. Run migrations from `supabase/migrations/` in Supabase SQL editor
4. Enable Auth providers: Email, Google, Apple

## 6. EAS Setup

```bash
eas login
eas build:configure
# creates eas.json
```

## 7. Run

```bash
npx expo start          # opens dev menu
npx expo start --web    # web only
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
```

## Environment Variables

Create `.env` at project root:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

These are embedded at build time. Never put secrets here — Supabase anon key is safe (it's public).

## Key Config Files

```
app.json              ← Expo config (name, bundle ID, permissions)
eas.json              ← EAS build profiles
tailwind.config.js    ← NativeWind/Tailwind config
drizzle.config.ts     ← Drizzle ORM config
tsconfig.json         ← TypeScript config
babel.config.js       ← Babel (NativeWind plugin)
```

## app.json important fields

```json
{
  "expo": {
    "name": "Recall",
    "slug": "recall",
    "scheme": "recall",
    "ios": {
      "bundleIdentifier": "com.yourname.recall",
      "infoPlist": {
        "NSCameraUsageDescription": "For scanning friend QR codes"
      }
    },
    "android": {
      "package": "com.yourname.recall",
      "permissions": ["CAMERA", "VIBRATE", "RECEIVE_BOOT_COMPLETED"]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      ["expo-camera", { "cameraPermission": "Allow $(PRODUCT_NAME) to use your camera" }]
    ]
  }
}
```
