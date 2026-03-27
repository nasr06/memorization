# Screens & UX

## Navigation Structure

```
(tabs)
  ├── Home (Today)      ← main tab, streak + due cards + goal
  ├── Decks             ← library + import button
  ├── Social            ← friends, leaderboard, challenges
  └── Profile           ← stats, achievements, settings

Stack screens (pushed on top of tabs):
  study/[deckId]        ← full-screen study session
  deck/[deckId]         ← deck detail + card list
  card/[cardId]/edit    ← card editor
  import                ← .apkg import wizard
  community             ← browse shared decks
  friends/add           ← find friends
  challenges/[id]       ← challenge detail
```

---

## Screen Specs

### Home (Today) Tab

**Purpose:** Daily driver. Shows everything needed for today's session.

**Sections:**
1. **Streak hero** — large flame icon, current streak number, XP bar toward next level
2. **Daily goal progress** — circular progress ring (e.g. "47 / 100 cards"), XP earned today
3. **Due now** — horizontal scroll of deck cards with due count badges
4. **Quick study button** — "Study All Due" → aggregated session across all decks
5. **Motivational message** — "3 more cards to reach your goal!" / "Daily goal complete! 🔥"

**Empty state:** "No cards due today — you're all caught up!"

---

### Study Session (`study/[deckId]`)

**Full-screen, immersive.**

**Layout:**
- Progress bar at top (card X of N)
- Deck name + "End session" button
- Card container — tap to flip (3D flip animation)
  - **Front:** question / prompt
  - **Back:** answer + any media
- Rating buttons (shown after flip): Again / Hard / Good / Easy
  - Color coded: red / orange / green / teal
  - Show next interval below each: "10m / 1d / 4d / 7d"
- XP toast animation on each rating

**Gestures:**
- Swipe left = Again, swipe right = Easy (configurable)
- Tap anywhere on card = flip

**Session complete screen:**
- Confetti animation
- Stats: cards studied, time taken, accuracy %
- XP earned with level-up animation if applicable
- Streak status ("Streak maintained!" / "Streak started!")
- "Back to home" / "Study more"

---

### Decks Tab

**Purpose:** Browse, create, import decks.

**Layout:**
- Search bar
- "Import .apkg" + "Create deck" buttons
- Grid or list of deck cards
  - Each card: cover color/emoji, name, total cards, due count, last studied

**Deck detail (`deck/[deckId]`):**
- Cover header with deck name
- Stats row: total / due / new / suspended
- Card list (paginated)
- "Study" button (sticky bottom)
- "..." menu: Edit, Export .apkg, Share, Delete

---

### .apkg Import Flow (`import.tsx`)

1. **Pick file** — expo-document-picker, or drag-and-drop on web
2. **Parsing progress** — animated progress bar "Extracting... Reading cards... Importing..."
3. **Preview** — deck name, card count, note types found, media count
4. **Conflict check** — if deck already exists: "Replace / Merge / Cancel"
5. **Done** — success screen with XP earned for importing

---

### Social Tab

**Sections:**
1. **Weekly leaderboard** — ranked list of friends + self, resets Monday
   - Each row: rank, avatar, username, weekly XP, level badge
   - Self is highlighted
2. **Active challenges** — cards for in-progress challenges
3. **Friend activity feed** — "[Friend] studied 50 cards today" / "[Friend] hit a 30-day streak!"

**Friend management:**
- Add by username / QR code scan
- Pending requests list
- Block / remove

---

### Profile Tab

**Sections:**
1. **Avatar + username + level** — level ring around avatar
2. **Stats grid:** Total XP, Current streak, Longest streak, Total cards reviewed, Total study time
3. **Achievements** — scrollable badge grid (locked badges shown greyed)
4. **Heatmap** — GitHub-style activity grid for past year
5. **Settings button** → Settings screen

---

### Settings Screen

- **Daily goal** — slider: 10 / 25 / 50 / 100 / 200 cards
- **Reminder** — toggle + time picker
- **Streak freeze** — buy with XP, shows current count
- **Study order** — Random / Due date / Ease
- **Haptics** — toggle
- **Theme** — Light / Dark / System
- **Account** — Sign out, Delete account
- **Export data** — export all decks as .apkg bundle

---

## Gamification UX Details

### Streak Mechanics
- Streak increments when daily goal is met (not just any review)
- Grace period: midnight + 2 hours (so night owls don't lose streak)
- Streak freeze: can hold up to 2. Consume one if goal not met. Buy with XP (200 XP each).
- Streak flame icon changes color: orange (1-6d), red (7-29d), blue (30-89d), gold (90d+)

### XP & Levels
- Level = floor(sqrt(total_xp / 100)) so levels slow down as you progress
- Level 1 = 100 XP, Level 2 = 400 XP, Level 10 = 10,000 XP
- Level badge shown next to username everywhere

### Achievements (examples)
| Badge | Condition |
|---|---|
| First Card | Review first card |
| Week Warrior | 7-day streak |
| Month Master | 30-day streak |
| Century | 100-day streak |
| Importer | Import first .apkg |
| Deck Builder | Create 100 cards manually |
| Social Butterfly | Add 5 friends |
| Champion | Win a challenge |
| Night Owl | Study after midnight |
| Speed Demon | Review 50 cards in under 10 min |

---

## Design Tokens

```
Colors (dark-mode first):
  background:  #0F0F13
  surface:     #1A1A24
  card:        #22222E
  primary:     #6C63FF  ← purple accent
  success:     #4CAF50
  warning:     #FF9800
  danger:      #F44336
  text:        #F0F0F5
  subtext:     #8888AA

  streak-flame: #FF6B35 → #FF3D00 → #2196F3 → #FFD700

Typography:
  heading:     Inter Bold / SF Pro (native)
  body:        Inter Regular
  mono:        JetBrains Mono (card content / LaTeX)

Radii:
  card:        16px
  button:      12px
  badge:       999px (pill)

Motion:
  card-flip:   600ms spring, perspective 1000px
  xp-toast:    slide up + fade, 800ms
  confetti:    lottie animation
```
