-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('note', 'other')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    description TEXT,
    url TEXT,
    category VARCHAR(10) NOT NULL CHECK (category IN ('JEE', 'Other')),
    subject VARCHAR(255),
    tags JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_updated_at ON resources(updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own resources" 
    ON resources FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resources" 
    ON resources FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources" 
    ON resources FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources" 
    ON resources FOR DELETE 
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resources_updated_at 
    BEFORE UPDATE ON resources 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();