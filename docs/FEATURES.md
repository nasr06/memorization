# Feature Specs

## F1 — .apkg Import/Export

### Import
- User picks a `.apkg` file via file picker (or drag-drop on web)
- App unzips using JSZip (runs in JS, no native deps needed)
- Reads `collection.anki2` via sql.js (WASM SQLite)
- Parses:
  - `col` table → deck metadata, note type templates/CSS
  - `notes` table → note fields, tags
  - `cards` table → scheduling data (due, interval, ease, reps, lapses, queue)
  - `revlog` table → review history (optional, for stats)
  - `media` file → maps filenames to original names
- Transforms to app schema and bulk-inserts via Drizzle
- Copies media files to `{documentDirectory}/media/{deckId}/`
- Awards 20 XP

### Export
- Build an in-memory Anki SQLite via sql.js
- Populate with notes/cards from selected deck
- Re-map media files
- Zip with JSZip
- Save to device via `expo-sharing` or trigger browser download on web

### Anki Schema Notes
```
notes: id, guid, mid (note type id), mod, usn, tags, flds (fields separated by \x1f), sfld, csum, flags, data
cards: id, nid, did (deck id), ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data
col:   id, crt, mod, scm, ver, dty, usn, ls, conf (JSON), models (JSON), decks (JSON), dconf (JSON), tags (JSON)
```

---

## F2 — SM-2 Spaced Repetition

Implementation in `lib/sm2.ts`:

```typescript
type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

interface CardState {
  ease: number;       // starts at 2.5
  interval: number;   // days
  reps: number;
  lapses: number;
  queue: 0 | 1 | 2 | -1; // new, learning, review, suspended
}

function schedule(card: CardState, rating: Rating, now: number): CardState {
  // ...SM-2 logic (see DATA_MODELS.md for algorithm)
}
```

Learning steps (new cards): 1m → 10m → 1d (configurable per deck)
Lapses: Again sends card to 10m learning step

Deck config options:
- New cards per day
- Max reviews per day
- Learning steps
- Lapse steps
- Easy bonus multiplier
- Interval modifier

---

## F3 — Streak System

**Local tracking** (no server required for streak to work offline):

```typescript
// lib/streak.ts
async function checkAndUpdateStreak(db: SQLiteDB) {
  const today = getLocalDateString(); // "2026-03-27"
  const streak = await db.query.streak.findFirst();

  if (streak.lastStudyDate === today) return; // already counted today

  const yesterday = getYesterdayDateString();
  const withinGrace = isWithinGraceHours(streak.lastStudyDate, 2); // 2hr grace

  if (streak.lastStudyDate === yesterday || withinGrace) {
    // extend streak
    await db.update(streakTable).set({
      currentStreak: streak.currentStreak + 1,
      longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1),
      lastStudyDate: today,
    });
  } else if (streak.streakFreezes > 0) {
    // consume a freeze
    await db.update(streakTable).set({
      streakFreezes: streak.streakFreezes - 1,
      lastStudyDate: today,
    });
  } else {
    // streak broken
    await db.update(streakTable).set({
      currentStreak: 1,
      lastStudyDate: today,
    });
    // trigger "streak broken" notification/animation
  }
}
```

Called when daily goal is completed (not on every card).

---

## F4 — Push Notifications

Using `expo-notifications`:

```typescript
// lib/notifications.ts

// Schedule daily reminder
async function scheduleDailyReminder(time: { hour: number; minute: number }) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to study! 📚",
      body: getMotivationalMessage(), // rotates through messages
    },
    trigger: {
      hour: time.hour,
      minute: time.minute,
      repeats: true,
    },
  });
}

// Streak at-risk (schedule for 1hr before midnight)
async function scheduleStreakWarning() { ... }

// Due card alert (schedule for morning)
async function scheduleDueCardAlert(dueCount: number) { ... }
```

Notification messages rotate:
- "You have {N} cards due — don't break your {streak}-day streak!"
- "Your streak is at risk! Study now to keep it alive."
- "{N} cards are waiting for you. 5 minutes is all it takes."

---

## F5 — Friend System

**Add friends:**
- Search by username → send request → accept/decline
- QR code: generate QR containing `recall://add-friend/{userId}`, scan via camera

**Friend data visible:**
- Weekly XP (leaderboard)
- Current streak
- Level
- Recent activity (privacy setting: public/friends only)

**Supabase RLS policy:**
```sql
-- Users can only see friends' profiles if friendship is accepted
CREATE POLICY "view_friends" ON profiles
FOR SELECT USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (requester_id = auth.uid() AND addressee_id = id
      OR addressee_id = auth.uid() AND requester_id = id)
  )
);
```

---

## F6 — Community Decks

**Browse:** grid of published decks, filterable by tag (Language, Medical, History, etc.)
**Search:** full-text search on title + description
**Download:** fetches .apkg from Supabase Storage, imports automatically
**Publish:** user marks their deck public → .apkg generated and uploaded
**Rating:** 5-star rating + download count shown

---

## F7 — Challenges

**XP Race:** First to earn X XP wins
- Create challenge: pick friend, set XP goal, set time limit
- Both see real-time progress via Supabase Realtime
- Winner gets XP bonus + champion badge

**Streak Bet:** Both players bet their streak; loser loses N streak days (virtual penalty)
- High-risk, high-reward motivation mechanic
- Both must agree to terms

---

## F8 — Card Editor

**Supported content:**
- Plain text (both sides)
- Images (pick from library or camera)
- Audio (record inline or pick file)
- LaTeX (rendered via KaTeX or MathJax)
- Cloze deletion: wrap with `{{c1::text}}`

**Templates:**
- Basic (front → back)
- Basic + Reversed (auto-generates reverse card)
- Cloze
- Custom (user can edit Handlebars-like template)

**Bulk create:** paste tab-separated text → auto-creates cards
