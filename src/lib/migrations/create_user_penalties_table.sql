-- Create user_penalties table
CREATE TABLE IF NOT EXISTS user_penalties (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  penalty_type VARCHAR(50) NOT NULL,
  points_deducted INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_penalties_user_id ON user_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_penalties_created_at ON user_penalties(created_at);

-- Enable Row Level Security
ALTER TABLE user_penalties ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own penalties" ON user_penalties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert penalties" ON user_penalties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own penalties" ON user_penalties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own penalties" ON user_penalties
  FOR DELETE USING (auth.uid() = user_id);