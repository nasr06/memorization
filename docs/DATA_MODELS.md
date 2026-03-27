# Data Models

## Local SQLite (Drizzle Schema)

### decks
```ts
decks {
  id           TEXT PRIMARY KEY   -- uuid
  name         TEXT NOT NULL
  description  TEXT
  coverColor   TEXT               -- hex color
  coverEmoji   TEXT
  isPublic     INTEGER DEFAULT 0  -- SQLite bool
  anki_id      TEXT               -- original Anki deck id (for re-export)
  createdAt    INTEGER            -- unix timestamp
  updatedAt    INTEGER
  syncedAt     INTEGER
}
```

### note_types (Anki "models")
```ts
note_types {
  id           TEXT PRIMARY KEY
  deckId       TEXT REFERENCES decks
  name         TEXT               -- e.g. "Basic", "Cloze"
  fields       TEXT               -- JSON array of field names
  templates    TEXT               -- JSON array of {front, back} templates
  css          TEXT               -- card styling
}
```

### notes
```ts
notes {
  id           TEXT PRIMARY KEY
  deckId       TEXT REFERENCES decks
  noteTypeId   TEXT REFERENCES note_types
  fields       TEXT               -- JSON: {fieldName: value}
  tags         TEXT               -- JSON array
  createdAt    INTEGER
  updatedAt    INTEGER
}
```

### cards
```ts
cards {
  id            TEXT PRIMARY KEY
  noteId        TEXT REFERENCES notes
  deckId        TEXT REFERENCES decks
  templateIndex INTEGER DEFAULT 0
  -- SM-2 scheduling
  due           INTEGER            -- unix timestamp
  interval      INTEGER DEFAULT 1  -- days
  ease          REAL DEFAULT 2.5
  reps          INTEGER DEFAULT 0
  lapses        INTEGER DEFAULT 0
  queue         INTEGER DEFAULT 0  -- 0=new, 1=learning, 2=review, -1=suspended
  -- metadata
  createdAt     INTEGER
  updatedAt     INTEGER
}
```

### review_log
```ts
review_log {
  id         TEXT PRIMARY KEY
  cardId     TEXT REFERENCES cards
  rating     INTEGER              -- 1=Again, 2=Hard, 3=Good, 4=Easy
  timeTaken  INTEGER              -- ms
  prevDue    INTEGER
  prevEase   REAL
  reviewedAt INTEGER
}
```

### streak
```ts
streak {
  id              TEXT PRIMARY KEY DEFAULT 'singleton'
  currentStreak   INTEGER DEFAULT 0
  longestStreak   INTEGER DEFAULT 0
  lastStudyDate   TEXT             -- ISO date "2026-03-27"
  streakFreezes   INTEGER DEFAULT 0
  totalXP         INTEGER DEFAULT 0
  weeklyXP        INTEGER DEFAULT 0
  weekStartDate   TEXT
  updatedAt       INTEGER
}
```

### settings
```ts
settings {
  key   TEXT PRIMARY KEY
  value TEXT
}
-- keys: dailyGoal, reminderTime, reminderEnabled, theme, haptics, etc.
```

---

## Supabase (Postgres)

### profiles
```sql
profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  total_xp     INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  level        INTEGER GENERATED ALWAYS AS (floor(sqrt(total_xp / 100))) STORED,
  created_at   TIMESTAMPTZ DEFAULT NOW()
)
```

### friendships
```sql
friendships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles,
  addressee_id UUID REFERENCES profiles,
  status      TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
)
```

### xp_events
```sql
xp_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles,
  amount      INTEGER NOT NULL,
  source      TEXT,             -- 'review', 'streak_bonus', 'challenge'
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

### weekly_leaderboard (VIEW)
```sql
-- Computed weekly XP per user, for friend leaderboard queries
CREATE VIEW weekly_leaderboard AS
SELECT
  user_id,
  SUM(amount) AS weekly_xp,
  date_trunc('week', NOW()) AS week_start
FROM xp_events
WHERE created_at >= date_trunc('week', NOW())
GROUP BY user_id;
```

### community_decks
```sql
community_decks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID REFERENCES profiles,
  title         TEXT NOT NULL,
  description   TEXT,
  card_count    INTEGER,
  download_count INTEGER DEFAULT 0,
  tags          TEXT[],
  apkg_url      TEXT,           -- Supabase Storage URL
  cover_color   TEXT,
  cover_emoji   TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
)
```

### challenges
```sql
challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles,
  opponent_id   UUID REFERENCES profiles,
  type          TEXT,           -- 'xp_race', 'streak_bet'
  goal_xp       INTEGER,
  status        TEXT,           -- 'pending', 'active', 'completed'
  winner_id     UUID REFERENCES profiles,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
)
```

---

## XP Rewards Table

| Action | XP |
|---|---|
| Review a card (Good/Easy) | 5 |
| Review a card (Hard) | 3 |
| Review a card (Again) | 1 |
| Complete daily goal | 50 |
| Maintain streak (per day) | 10 |
| Streak milestone (7d, 30d, etc.) | 100 |
| Import a deck | 20 |
| Create 10 cards | 15 |

---

## SM-2 Algorithm (lib/sm2.ts)

```
Input: rating (1-4), card { ease, interval, reps }

if rating < 2 (Again):
  reps = 0
  interval = 1
  ease = max(1.3, ease - 0.2)

else:
  if reps == 0: interval = 1
  elif reps == 1: interval = 6
  else: interval = round(interval * ease)

  ease = ease + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02))
  ease = max(1.3, ease)
  reps += 1

due = now + interval * 86400
```
