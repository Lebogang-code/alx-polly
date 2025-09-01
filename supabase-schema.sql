-- Supabase Database Schema for Polling Application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
-- Note: Supabase already provides auth.users table, but we'll create a profiles table
-- to store additional user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Polls Table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security for polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Create policies for polls
CREATE POLICY "Anyone can view polls" 
  ON polls FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create polls" 
  ON polls FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own polls" 
  ON polls FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own polls" 
  ON polls FOR DELETE 
  USING (auth.uid() = created_by);

-- Poll Options Table
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security for poll_options
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

-- Create policies for poll_options
CREATE POLICY "Anyone can view poll options" 
  ON poll_options FOR SELECT 
  USING (true);

CREATE POLICY "Poll creators can insert options" 
  ON poll_options FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_id AND polls.created_by = auth.uid()
  ));

CREATE POLICY "Poll creators can update options" 
  ON poll_options FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_id AND polls.created_by = auth.uid()
  ));

CREATE POLICY "Poll creators can delete options" 
  ON poll_options FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_id AND polls.created_by = auth.uid()
  ));

-- Votes Table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  -- Ensure a user can only vote once per poll
  CONSTRAINT unique_user_poll_vote UNIQUE (user_id, poll_id)
);

-- Enable Row Level Security for votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for votes
CREATE POLICY "Anyone can view votes" 
  ON votes FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can vote" 
  ON votes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_id AND polls.is_active = true)
  );

CREATE POLICY "Users can delete their own votes" 
  ON votes FOR DELETE 
  USING (auth.uid() = user_id);

-- Create views for easier data access

-- View for poll details with vote counts
CREATE VIEW poll_details AS
SELECT 
  p.id,
  p.title,
  p.description,
  p.is_active,
  p.created_by,
  p.created_at,
  p.expires_at,
  COUNT(DISTINCT v.id) AS total_votes,
  profiles.name AS creator_name
FROM polls p
LEFT JOIN votes v ON p.id = v.poll_id
LEFT JOIN profiles ON p.created_by = profiles.id
GROUP BY p.id, profiles.name;

-- View for poll options with vote counts and percentages
CREATE VIEW poll_options_with_stats AS
SELECT 
  po.id,
  po.poll_id,
  po.text,
  COUNT(v.id) AS votes,
  CASE 
    WHEN poll_vote_count.total_votes > 0 
    THEN ROUND((COUNT(v.id)::NUMERIC / poll_vote_count.total_votes) * 100, 1)
    ELSE 0
  END AS percentage
FROM poll_options po
LEFT JOIN votes v ON po.id = v.option_id
LEFT JOIN (
  SELECT poll_id, COUNT(*) AS total_votes 
  FROM votes 
  GROUP BY poll_id
) poll_vote_count ON po.poll_id = poll_vote_count.poll_id
GROUP BY po.id, poll_vote_count.total_votes;

-- Create functions for common operations

-- Function to check if a poll is active
CREATE OR REPLACE FUNCTION is_poll_active(poll_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  is_active BOOLEAN;
  expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT 
    p.is_active, 
    p.expires_at 
  INTO is_active, expiry 
  FROM polls p 
  WHERE p.id = poll_id;
  
  RETURN is_active AND (expiry IS NULL OR expiry > now());
END;
$$ LANGUAGE plpgsql;

-- Function to cast a vote
CREATE OR REPLACE FUNCTION cast_vote(
  p_poll_id UUID,
  p_option_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_vote_id UUID;
BEGIN
  -- Check if poll is active
  IF NOT is_poll_active(p_poll_id) THEN
    RAISE EXCEPTION 'Poll is not active';
  END IF;
  
  -- Check if user has already voted on this poll
  BEGIN
    INSERT INTO votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, p_option_id, p_user_id)
    RETURNING id INTO v_vote_id;
  EXCEPTION WHEN unique_violation THEN
    -- If user already voted, update their vote
    UPDATE votes 
    SET option_id = p_option_id 
    WHERE poll_id = p_poll_id AND user_id = p_user_id
    RETURNING id INTO v_vote_id;
  END;
  
  RETURN v_vote_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for maintaining data integrity

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_polls_updated_at
  BEFORE UPDATE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_poll_options_updated_at
  BEFORE UPDATE ON poll_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();