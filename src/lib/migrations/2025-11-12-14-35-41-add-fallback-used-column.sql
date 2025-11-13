-- Add missing column to api_usage_logs table
ALTER TABLE api_usage_logs
ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false;

-- Update existing records to set fallback_used to false where NULL
UPDATE api_usage_logs
SET fallback_used = false
WHERE fallback_used IS NULL;