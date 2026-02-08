import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Test connection
const { data, error } = await supabase.from('auth_users').select('user_id').limit(1);
if (error) {
  console.error('Connection failed:', error);
  process.exit(1);
}
console.log('Connected to Supabase successfully.');
console.log('\n⚠️  Please run this SQL in your Supabase Dashboard → SQL Editor:\n');
console.log(`----- COPY BELOW -----`);
console.log(`
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS department VARCHAR(10);
UPDATE auth_users SET department = SPLIT_PART(user_id, '-', 1) WHERE department IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_users_department ON auth_users(department);
`);
console.log(`----- COPY ABOVE -----`);
console.log('\nAfter running the SQL, the department feature will be fully enabled.');
