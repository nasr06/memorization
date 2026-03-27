# Architecture

## System Diagram

```
┌──────────────────────────────────────────────────────┐
│                   Expo App (RN + Web)                 │
│                                                       │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │  Study UI   │  │  Social UI    │  │ Deck Mgmt  │  │
│  └──────┬──────┘  └──────┬────────┘  └─────┬──────┘  │
│         │                │                  │         │
│  ┌──────▼──────────────────────────────────▼──────┐  │
│  │               Zustand Store                     │  │
│  │  (streak, session, settings, user, decks)       │  │
│  └──────┬────────────────────────┬────────────────┘  │
│         │                        │                   │
│  ┌──────▼──────┐         ┌───────▼──────┐            │
│  │ Local SQLite│         │ TanStack     │            │
│  │ (Drizzle)   │         │ Query        │            │
│  │ offline DB  │         │ (Supabase)   │            │
│  └─────────────┘         └──────┬───────┘            │
└─────────────────────────────────┼────────────────────┘
                                  │ HTTPS / Realtime WS
                    ┌─────────────▼──────────────┐
                    │         Supabase            │
                    │  ┌──────┐  ┌─────────────┐ │
                    │  │ Auth │  │  Postgres   │ │
                    │  └──────┘  └─────────────┘ │
                    │  ┌──────────┐  ┌─────────┐ │
                    │  │ Storage  │  │Realtime │ │
                    │  └──────────┘  └─────────┘ │
                    │  ┌────────────────────────┐ │
                    │  │    Edge Functions      │ │
                    │  │  (push notifications,  │ │
                    │  │   leaderboard cron)    │ │
                    │  └────────────────────────┘ │
                    └────────────────────────────┘
```

---

## Data Flow: Study Session

```
User taps "Study"
  → SM-2 algorithm queries local SQLite for due cards
  → Renders card flip UI
  → User rates (Again / Hard / Good / Easy)
  → SM-2 updates next_review, interval, ease
  → Saves to local SQLite (immediate)
  → Queues sync event
  → TanStack Query syncs to Supabase in background
  → XP + streak updated in Zustand → persisted to SQLite
```

## Data Flow: .apkg Import

```
User picks .apkg file (expo-document-picker)
  → expo-file-system copies to app cache
  → JSZip extracts in memory
  → sql.js reads collection.anki2 SQLite
  → Parser transforms Anki schema → app schema
  → Drizzle bulk-inserts into local SQLite
  → Media files copied to documents directory
  → Deck appears in library
```

## Data Flow: Social / Leaderboard

```
User earns XP
  → XP event queued locally
  → On sync: Edge Function receives XP update
  → Updates user_xp_weekly table in Postgres
  → Friends' leaderboard is a Postgres VIEW
  → Realtime subscription pushes rank changes live
```

---

## Offline Strategy

All core functionality works offline:
- Study sessions (full SM-2, card flips)
- Card creation / editing
- Deck management
- Streak tracking (local time)
- Settings

Sync happens when connectivity returns:
- Optimistic updates locally
- Conflict resolution: last-write-wins per card (updated_at)
- Edge case: streak — server is authoritative after sync

---

## File Structure

```
app/
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    index.tsx          ← Home / Today screen
    decks.tsx          ← Deck library
    social.tsx         ← Friends & leaderboard
    profile.tsx        ← Stats, settings, achievements
  study/
    [deckId].tsx       ← Study session
  deck/
    [deckId]/
      index.tsx        ← Deck detail
      edit.tsx         ← Edit deck metadata
  card/
    [cardId]/
      edit.tsx
  import.tsx           ← .apkg import flow
  _layout.tsx

components/
  study/
    CardFlip.tsx
    RatingButtons.tsx
    SessionProgress.tsx
  gamification/
    StreakBadge.tsx
    XPBar.tsx
    LeaderboardRow.tsx
  deck/
    DeckCard.tsx
    DeckList.tsx
  ui/                  ← Generic: Button, Modal, etc.

lib/
  sm2.ts              ← SM-2 algorithm
  apkg/
    import.ts
    export.ts
    parser.ts
  supabase.ts
  notifications.ts

db/
  schema.ts           ← Drizzle schema
  migrations/
  queries/
    cards.ts
    decks.ts
    streak.ts

store/
  useStudyStore.ts
  useStreakStore.ts
  useUserStore.ts

hooks/
  useStreak.ts
  useDueCards.ts
  useLeaderboard.ts
```
