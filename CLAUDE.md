# Memorization App — AI Coding Guide

This file tells Claude Code everything needed to vibe-code this project.

## What We're Building

A cross-platform flashcard app (iOS + Android + Web) that combines:
- Anki's .apkg format and SM-2 spaced repetition
- Duolingo's gamification (streaks, XP, levels, achievements)
- Social features (friends, leaderboards, challenges)

Read the full docs in `docs/` before writing any code.

## Docs Index

| File | Contents |
|---|---|
| `docs/OVERVIEW.md` | Vision, features, target users |
| `docs/TECH.md` | Full tech stack with library choices |
| `docs/ARCHITECTURE.md` | System diagram, data flows, file structure |
| `docs/DATA_MODELS.md` | SQLite + Supabase schemas, SM-2 algorithm |
| `docs/SCREENS.md` | Every screen spec + design tokens |
| `docs/FEATURES.md` | Detailed feature specs with code snippets |
| `docs/ROADMAP.md` | Phased plan — always check what phase we're in |
| `docs/SETUP.md` | How to bootstrap the project from scratch |

## Tech Stack Summary

- **Expo** (React Native) — iOS + Android + Web from one codebase
- **Expo Router** — file-based routing
- **NativeWind** — Tailwind CSS for React Native
- **Drizzle ORM + expo-sqlite** — local SQLite, offline-first
- **Zustand** — client state
- **TanStack Query** — server state / sync
- **Supabase** — backend (auth, postgres, storage, realtime)
- **JSZip + sql.js** — .apkg parsing (pure JS, no native deps needed)
- TypeScript strict mode throughout

## Coding Rules

1. **Offline-first**: all core features work without internet. Sync is additive.
2. **Types everywhere**: no `any`, use Zod for runtime validation at boundaries.
3. **Drizzle for all DB ops**: never write raw SQL for local DB except in migrations.
4. **NativeWind for styling**: no StyleSheet.create, no inline style objects. Use `className=` props.
5. **Reanimated for animations**: never use Animated API (legacy).
6. **Platform files**: use `.ios.tsx` / `.android.tsx` / `.web.tsx` only for genuine platform differences. Prefer cross-platform by default.
7. **Expo SDK only for native**: use expo-* packages, not bare react-native equivalents.
8. **SM-2 is pure**: `lib/sm2.ts` has zero dependencies, is pure functions, easy to test.
9. **Supabase RLS**: every table has Row Level Security. Never trust client for auth checks.
10. **No secrets in code**: all keys via `EXPO_PUBLIC_*` env vars.

## File Naming

- Components: PascalCase (`CardFlip.tsx`)
- Utilities/libs: camelCase (`sm2.ts`, `apkgParser.ts`)
- Screens (Expo Router): kebab-case files map to routes (`deck/[deckId].tsx`)
- DB queries: grouped by entity in `db/queries/` (`cards.ts`, `decks.ts`)

## Current Phase

**Check `docs/ROADMAP.md`** and work on the current unchecked phase.
Do not jump ahead to later phases unless explicitly asked.

## Commands

```bash
npx expo start          # dev server
npx expo start --web    # web only
npx drizzle-kit generate # generate migration after schema change
npx drizzle-kit migrate  # apply migrations (expo handles this at runtime too)
eas build --platform ios --profile preview
eas build --platform android --profile preview
```
