-- Add backup_codes table for password recovery
CREATE TABLE IF NOT EXISTS backup_codes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    code_hash TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    used_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_backup_codes_user_id ON backup_codes(user_id);
CREATE INDEX idx_backup_codes_used ON backup_codes(used);

-- Add indexes to auth_users if they don't exist
CREATE INDEX IF NOT EXISTS idx_auth_users_user_id ON auth_users(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email_hash);
