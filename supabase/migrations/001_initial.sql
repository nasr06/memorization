-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  level INTEGER GENERATED ALWAYS AS (floor(sqrt(total_xp::float / 100))) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles ON DELETE CASCADE,
  addressee_id UUID REFERENCES profiles ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

-- XP events
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT, -- 'review', 'streak_bonus', 'challenge', 'import', 'daily_goal'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly leaderboard view
CREATE VIEW weekly_leaderboard AS
SELECT
  user_id,
  SUM(amount) AS weekly_xp,
  date_trunc('week', NOW()) AS week_start
FROM xp_events
WHERE created_at >= date_trunc('week', NOW())
GROUP BY user_id;

-- Community decks
CREATE TABLE community_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  card_count INTEGER,
  download_count INTEGER DEFAULT 0,
  tags TEXT[],
  apkg_url TEXT,
  cover_color TEXT,
  cover_emoji TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles ON DELETE CASCADE,
  opponent_id UUID REFERENCES profiles ON DELETE CASCADE,
  type TEXT,
  goal_xp INTEGER,
  status TEXT CHECK (status IN ('pending', 'active', 'completed')) DEFAULT 'pending',
  winner_id UUID REFERENCES profiles,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- XP events RLS
CREATE POLICY "Users can insert own xp" ON xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own xp" ON xp_events FOR SELECT USING (auth.uid() = user_id);

-- Friendships RLS
CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can create friend requests" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their friendships" ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Community decks RLS
CREATE POLICY "Published decks are viewable by everyone" ON community_decks FOR SELECT
  USING (is_published = true OR auth.uid() = author_id);
CREATE POLICY "Authors can manage their decks" ON community_decks FOR ALL
  USING (auth.uid() = author_id);

-- Challenges RLS
CREATE POLICY "Users can view their challenges" ON challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Users can create challenges" ON challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);
