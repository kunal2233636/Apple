rc/lib/migrations/create_cbse_question_sets_table.sql</path>
<content">-- Migration: Create CBSE Question Sets Table
-- This table stores persistent question sets for CBSE Class 12 assessments
-- Compatible with the question persistence system

CREATE TABLE IF NOT EXISTS cbse_question_sets (
    id VARCHAR(255) PRIMARY KEY,
    chapter_name VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cbse_year VARCHAR(4) DEFAULT '2026',
    questions JSONB NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    generation_count INTEGER NOT NULL DEFAULT 1,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_chapter_subject 
    ON cbse_question_sets (chapter_name, subject_name);

CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_subject 
    ON cbse_question_sets (subject_name);

CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_last_modified 
    ON cbse_question_sets (last_modified DESC);

CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_generated_at 
    ON cbse_question_sets (generated_at DESC);

-- Create unique constraint to prevent duplicate question sets for the same chapter-subject
CREATE UNIQUE INDEX IF NOT EXISTS idx_cbse_question_sets_unique_chapter_subject 
    ON cbse_question_sets (chapter_name, subject_name);

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE cbse_question_sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (uncomment and modify based on your auth requirements)
-- Example policies for user-based access:
-- CREATE POLICY "Users can view their own question sets" ON cbse_question_sets
--     FOR SELECT USING (true); -- Modify this based on your auth logic

-- CREATE POLICY "Users can insert their own question sets" ON cbse_question_sets
--     FOR INSERT WITH CHECK (true); -- Modify this based on your auth logic

-- CREATE POLICY "Users can update their own question sets" ON cbse_question_sets
--     FOR UPDATE USING (true); -- Modify this based on your auth logic

-- Function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_cbse_question_sets_updated_at 
    BEFORE UPDATE ON cbse_question_sets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a sample question set for testing (optional)
-- This can be used for initial testing of the persistence system
/*
INSERT INTO cbse_question_sets (
    id,
    chapter_name,
    subject_name,
    questions,
    total_questions
) VALUES (
    'sample_chapter_sample_subject',
    'Sample Chapter',
    'Sample Subject',
    '[]'::jsonb,
    0
);
*/