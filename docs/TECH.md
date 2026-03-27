# Tech Stack

## Platform Strategy

**One codebase → Web + iOS + Android**

Framework: **Expo (React Native)** with `expo-router`

- iOS and Android via React Native
- Web via React Native Web (expo handles the bridge)
- Single TypeScript codebase, platform-specific overrides where needed

---

## Frontend

| Concern | Library |
|---|---|
| Framework | Expo SDK 52+ / React Native |
| Router | Expo Router v4 (file-based, works on web too) |
| Styling | NativeWind v4 (Tailwind CSS for RN) |
| Animations | React Native Reanimated 3 + Moti |
| State | Zustand |
| Server state / sync | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React Native |
| Bottom sheets | @gorhom/bottom-sheet |
| Gestures | React Native Gesture Handler |
| Haptics | expo-haptics |

---

## Local Storage (Offline-First)

| Concern | Library |
|---|---|
| Main database | expo-sqlite (SQLite) |
| ORM / query builder | Drizzle ORM (works with expo-sqlite) |
| Fast key-value (settings, streak) | expo-secure-store / MMKV |
| File storage (media, apkg) | expo-file-system |

---

## Backend (Supabase)

Supabase gives us: Postgres, Auth, Storage, Realtime, Edge Functions — all in one.

| Concern | Supabase feature |
|---|---|
| Authentication | Supabase Auth (email, Google, Apple) |
| User profiles, friends | Postgres tables |
| Leaderboards | Postgres views + RLS |
| Deck sharing / community | Postgres + Storage |
| Push notification scheduling | Supabase Edge Functions + cron |
| Media sync | Supabase Storage |
| Card sync | Postgres (conflict resolution via updated_at) |
| Real-time (challenges) | Supabase Realtime channels |

---

## Push Notifications

- **expo-notifications** for local (streak reminders, daily goal)
- **Expo Push Service** → APNs / FCM for remote notifications
- Triggered by Supabase Edge Functions on schedule

---

## .apkg Parsing

`.apkg` is a ZIP file containing:
- `collection.anki2` — SQLite database (notes, cards, decks, scheduling)
- `media` — JSON map of media files
- Media files (images, audio)

Parsing approach:
1. **expo-file-system** — download/pick the .apkg file
2. **JSZip** — unzip in memory
3. **sql.js** (WebAssembly SQLite) — read the `.anki2` SQLite DB without native deps
4. Transform Anki's schema → our local schema (Drizzle)
5. Copy media files to app's document directory

Export: reverse the process — build SQLite in-memory via sql.js, zip it.

---

## Deployment

| Target | Deploy |
|---|---|
| iOS | App Store via EAS Build |
| Android | Play Store via EAS Build |
| Web | Vercel (Expo web export) |
| Backend | Supabase cloud (free tier → pro) |
| CI/CD | GitHub Actions + EAS |

---

## Dev Tooling

- TypeScript strict mode
- ESLint + Prettier
- Expo Go for quick testing
- EAS Build for production builds
- Drizzle Kit for migrations
