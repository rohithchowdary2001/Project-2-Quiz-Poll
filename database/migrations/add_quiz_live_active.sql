-- Add is_live_active column to quizzes table for real-time quiz activation control
ALTER TABLE quizzes ADD COLUMN is_live_active BOOLEAN DEFAULT FALSE AFTER is_active;

-- Update existing quizzes to be inactive by default
UPDATE quizzes SET is_live_active = FALSE WHERE is_live_active IS NULL;
