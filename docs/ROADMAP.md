# Roadmap

## Phase 0 — Project Setup (Day 1)

- [x] `npx create-expo-app memorization --template tabs`
- [x] Install and configure: NativeWind, Expo Router, Drizzle, Zustand, TanStack Query
- [x] Set up Supabase project, get keys, `lib/supabase.ts`
- [x] Set up Drizzle schema + first migration (decks, notes, cards, streak, settings)
- [x] EAS project init (`eas build:configure`)
- [x] Set up GitHub repo + CI skeleton

**Goal:** App boots on iOS/Android/Web, shows placeholder home screen.

---

## Phase 1 — Core Study Loop (Week 1)

Priority: get the fundamental loop working end-to-end.

- [ ] Drizzle schema: decks, note_types, notes, cards, review_log
- [ ] SM-2 algorithm (`lib/sm2.ts`) + unit tests
- [ ] Deck creation screen (basic)
- [ ] Card creation screen (text only)
- [ ] Study session screen: card flip animation, rating buttons
- [ ] Scheduling: SM-2 applied on rating, persisted to SQLite
- [ ] Home screen: list due cards per deck, "Study All" button
- [ ] Basic streak tracking (local only)
- [ ] Local settings: daily goal, theme

**Goal:** Can create a deck, add cards, study with SM-2, see due counts. Offline only.

---

## Phase 2 — .apkg Import (Week 2)

- [ ] Install JSZip + sql.js
- [ ] `lib/apkg/parser.ts`: parse Anki collection.anki2 schema
- [ ] `lib/apkg/import.ts`: full import pipeline
- [ ] Import UI: file picker → progress → preview → confirm
- [ ] Media handling: copy images/audio to document directory
- [ ] Card rendering: display HTML card templates (WebView or RN renderer)
- [ ] Test with real Anki decks (Japanese, vocabulary, etc.)
- [ ] .apkg export: `lib/apkg/export.ts`

**Goal:** User can import any standard Anki deck and study it.

---

## Phase 3 — Gamification (Week 3)

- [ ] Supabase auth: email + Google + Apple sign-in
- [ ] Profiles table + sync
- [ ] XP system: award XP on card reviews, track in streak table
- [ ] Level calculation + XP bar UI
- [ ] Streak UI on home screen (flame, number, grace period logic)
- [ ] Streak freeze: buy with XP, consume automatically
- [ ] Daily goal: progress ring, completion detection
- [ ] XP toast animation on each card rating
- [ ] Session complete screen: confetti, stats, XP earned
- [ ] Achievements system: define all badges, check conditions after each session
- [ ] Achievement unlock animation + notification

**Goal:** App is fun to use alone. Streak + XP + achievements working.

---

## Phase 4 — Social (Week 4)

- [ ] Push notifications setup (expo-notifications + Expo Push Service)
- [ ] Daily reminder scheduler
- [ ] Streak at-risk warning (1hr before midnight if goal not met)
- [ ] Friend system: add by username, QR code, accept/decline
- [ ] Supabase RLS policies for friend visibility
- [ ] Weekly leaderboard: Postgres view + UI
- [ ] Friend activity feed
- [ ] XP sync to Supabase (background, optimistic)
- [ ] Community decks: browse, download, publish
- [ ] Challenges: XP race (basic version)

**Goal:** Social features live. Users can compete with friends.

---

## Phase 5 — Polish & Launch Prep (Week 5-6)

- [ ] LaTeX support in cards (KaTeX)
- [ ] Audio card support (expo-av)
- [ ] Bulk card import (paste TSV)
- [ ] Study statistics screen (heatmap, review history graphs)
- [ ] Dark/light theme polish
- [ ] Onboarding flow (3-screen tour + demo deck)
- [ ] Performance: virtualized card lists, query optimization
- [ ] Accessibility: VoiceOver / TalkBack support
- [ ] Web: PWA manifest, install prompt
- [ ] App Store assets: screenshots, description, icon
- [ ] EAS production build + TestFlight / Play beta
- [ ] Landing page (can be a simple Expo web route)

---

## Phase 6 — Post-Launch

- [ ] Streak bet challenges
- [ ] Collaborative decks (multiple editors)
- [ ] AI card generation (given a topic → generate flashcards via Claude API)
- [ ] TTS audio auto-generation for language decks
- [ ] Markdown card content
- [ ] Offline PWA improvements
- [ ] iPad / tablet layout

---

## MVP Definition

MVP = Phase 1 + Phase 2 + Phase 3 (minus social)

A user should be able to:
1. Import an Anki deck
2. Study it with proper SM-2 scheduling
3. Track their streak and XP
4. See achievements unlock

Everything in Phase 4+ is "nice to have" for initial launch.
