-- Create revision_queue table
CREATE TABLE IF NOT EXISTS revision_queue (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  difficulty VARCHAR(10) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique constraint per user-topic combination
  UNIQUE(user_id, topic_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_revision_queue_user_id ON revision_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_queue_topic_id ON revision_queue(topic_id);
CREATE INDEX IF NOT EXISTS idx_revision_queue_added_date ON revision_queue(added_date);

-- Enable Row Level Security
ALTER TABLE revision_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own revision queue" ON revision_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revision queue items" ON revision_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revision queue items" ON revision_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revision queue items" ON revision_queue
  FOR DELETE USING (auth.uid() = user_id);