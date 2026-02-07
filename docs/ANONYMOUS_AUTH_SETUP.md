# Anonymous Authentication System - Setup Guide

## 🔐 Overview

This system provides **completely anonymous authentication** for campus users:
- ✅ Email verification (OTP)
- ✅ Anonymous user IDs (generated from email hash)
- ✅ **Emails are NEVER stored** in the database
- ✅ Only @seecs.edu.pk emails allowed

## 📋 Prerequisites

### 1. Gmail App Password (for sending OTP emails)

**Steps:**
1. Go to your Google Account: https://myaccount.google.com/
2. Enable 2-Factor Authentication (if not already enabled)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Create a new app password:
   - App: "Mail"
   - Device: "Custom" (name it "Campus Whisper")
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
6. Remove spaces: `abcdefghijklmnop`

### 2. Update Environment Variables

Add to `.env`:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
```

### 3. Run Database Migration

**In Supabase SQL Editor:**
```sql
-- Run this migration
-- File: supabase/migrations/20260207_add_anonymous_auth.sql

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) UNIQUE NOT NULL,
  email_hash VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_email_hash UNIQUE(email_hash),
  CONSTRAINT unique_user_id UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_users_user_id ON auth_users(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email_hash);

COMMENT ON TABLE auth_users IS 'Anonymous authentication - emails are hashed, not stored';
COMMENT ON COLUMN auth_users.user_id IS 'User-friendly ID generated from email hash';
COMMENT ON COLUMN auth_users.email_hash IS 'SHA-256 hash of email - one-way, cannot recover original email';
COMMENT ON COLUMN auth_users.password_hash IS 'Bcrypt hash of randomly generated password sent via email';
```

**Also run the user_credibility migration:**
```sql
-- File: supabase/migrations/20260207_add_user_credibility_to_rumor_votes.sql

ALTER TABLE rumor_votes 
ADD COLUMN IF NOT EXISTS user_credibility DECIMAL(5,4) DEFAULT 0.5;

COMMENT ON COLUMN rumor_votes.user_credibility IS 'User wealth-based credibility at time of vote (0-1 scale, based on total_points)';
COMMENT ON COLUMN rumor_votes.vote_weight IS 'reputation × user_credibility × stake';
```

## 🚀 How It Works

### Registration Flow:

1. **User enters email** (must end with @seecs.edu.pk)
2. **System checks** if email hash already exists
3. **OTP sent** via email (6-digit code, expires in 10 minutes)
4. **User enters OTP** to verify
5. **System generates:**
   - User ID: `SEECS-A7F4B2C9` (derived from email hash)
   - Password: `1234-5678-9012` (random, secure)
6. **Credentials sent** via email (backup)
7. **User logs in** with User ID + Password

### Privacy Features:

- ✅ **Email → SHA-256 Hash** (one-way, cannot reverse)
- ✅ **Email NOT stored** in database
- ✅ **User ID derived** from hash (consistent but anonymous)
- ✅ **Password bcrypt hashed** (secure storage)
- ✅ **OTP in-memory only** (not in database)

### User ID Generation:

```typescript
Email: "john.doe@seecs.edu.pk"
  ↓ SHA-256
Hash: "7a3f2c1b9e4d8a6f..."
  ↓ First 16 chars → Base36
User ID: "SEECS-A7F4B2C9"
```

**Properties:**
- Same email → Same User ID (always)
- Cannot reverse User ID → Original email
- Looks friendly and professional

## 🔗 API Endpoints

### POST `/api/auth/request-otp`
```json
{
  "email": "student@seecs.edu.pk"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email. Please check your inbox."
}
```

### POST `/api/auth/verify-otp`
```json
{
  "email": "student@seecs.edu.pk",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Account created! Check your email for login credentials.",
  "userId": "SEECS-A7F4B2C9",
  "password": "1234-5678-9012"
}
```

### POST `/api/auth/login`
```json
{
  "userId": "SEECS-A7F4B2C9",
  "password": "1234-5678-9012"
}
```

**Response:**
```json
{
  "message": "Login successful!",
  "userId": "SEECS-A7F4B2C9"
}
```

### POST `/api/auth/logout`
```json
{}
```

## 📱 Frontend Routes

- `/register` - OTP registration flow (3 steps)
- `/login` - User ID + Password login
- Legacy: Modal-based userId entry still works

## 🧪 Testing

### Development Mode:
- OTP is logged to console for testing
- Generated password is logged to console
- Check server logs after requesting OTP

### Production:
- Remove console.log statements for OTP/password
- Rely on email delivery only

## 🎯 Security Benefits

1. **No Email Database** - Cannot leak emails
2. **One-Way Hashing** - Cannot reverse engineer
3. **Email Domain Restriction** - Only @seecs.edu.pk
4. **Bcrypt Password** - Industry standard hashing
5. **Session-Based** - Secure cookie authentication
6. **OTP Expiry** - 10-minute window
7. **Auto-Cleanup** - Expired OTPs removed from memory

## ⚠️ Important Notes

- Users MUST save their credentials (we can't recover them)
- Email is sent with credentials as backup
- If user loses credentials, they need a new email
- Each email can only register once (checked by hash)

## 🔧 Dependencies Added

- `nodemailer` - Email sending
- `bcryptjs` - Password hashing
- `@types/nodemailer` - TypeScript types
- `@types/bcryptjs` - TypeScript types

## 📂 Files Created/Modified

**New Files:**
- `server/auth.ts` - Auth logic (OTP, registration, login)
- `server/email.ts` - Email sending (OTP, credentials)
- `client/src/pages/RegisterPage.tsx` - Registration UI
- `client/src/pages/LoginPage.tsx` - Login UI
- `supabase/migrations/20260207_add_anonymous_auth.sql` - Database schema

**Modified Files:**
- `server/routes.ts` - Added auth endpoints
- `server/supabase.ts` - Added auth_users type
- `client/src/App.tsx` - Added register/login routes
- `.env` - Added SMTP configuration
