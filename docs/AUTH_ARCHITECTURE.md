# Anonymous Authentication System - Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANONYMOUS AUTH SYSTEM                        │
│                                                                 │
│  Email → SHA-256 Hash → User ID Generation → Bcrypt Password   │
│                                                                 │
│  🔒 NO EMAILS STORED IN DATABASE                                │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Registration Flow

```
┌──────────┐
│  USER    │
└────┬─────┘
     │
     │ 1. Enter email
     │    john.doe@seecs.edu.pk
     ▼
┌────────────────┐
│   Frontend     │
│ /register      │
└────┬───────────┘
     │
     │ 2. POST /api/auth/request-otp
     │    { email: "john.doe@seecs.edu.pk" }
     ▼
┌────────────────────────────┐
│   Backend Auth Service     │
│                            │
│  ✓ Validate domain         │
│    (@seecs.edu.pk only)    │
│                            │
│  ✓ Hash email (SHA-256)    │
│    → 7a3f2c1b9e4d...       │
│                            │
│  ✓ Check if exists         │
│    in auth_users table     │
│                            │
│  ✓ Generate 6-digit OTP    │
│    → 123456                │
│                            │
│  ✓ Store in memory         │
│    Map<emailHash, OTP>     │
│    (expires: 10 min)       │
└────────┬───────────────────┘
         │
         │ 3. Send OTP email
         ▼
    ┌─────────────┐
    │   Gmail     │
    │   SMTP      │
    └─────┬───────┘
          │
          │ 4. User receives email
          ▼
    ┌──────────┐
    │  USER    │
    │ Email    │
    │ Inbox    │
    └────┬─────┘
         │
         │ 5. Enter OTP: 123456
         ▼
┌────────────────┐
│   Frontend     │
│ /register      │
└────┬───────────┘
     │
     │ 6. POST /api/auth/verify-otp
     │    { email: "...", otp: "123456" }
     ▼
┌────────────────────────────┐
│   Backend Auth Service     │
│                            │
│  ✓ Verify OTP              │
│    (check memory store)    │
│                            │
│  ✓ Generate User ID        │
│    emailHash → base36      │
│    → "SEECS-A7F4B2C9"      │
│                            │
│  ✓ Generate Password       │
│    random secure           │
│    → "1234-5678-9012"      │
│                            │
│  ✓ Bcrypt password         │
│    → $2a$10$...           │
│                            │
│  ✓ Store in database       │
│    user_id, email_hash,    │
│    password_hash           │
│                            │
│  ✓ Delete OTP from memory  │
└────────┬───────────────────┘
         │
         │ 7. Send credentials email
         ▼
    ┌─────────────┐
    │   Gmail     │
    │   SMTP      │
    └─────┬───────┘
          │
          │ 8. Backup credentials
          ▼
    ┌──────────┐
    │  USER    │
    │  Email   │
    │  Inbox   │
    └────┬─────┘
         │
         │ 9. Save credentials
         │    User ID: SEECS-A7F4B2C9
         │    Password: 1234-5678-9012
         ▼
    ┌──────────┐
    │  USER    │
    │ Logged   │
    │    In    │
    └──────────┘
```

## 🔐 Login Flow

```
┌──────────┐
│  USER    │
└────┬─────┘
     │
     │ 1. Enter credentials
     │    User ID: SEECS-A7F4B2C9
     │    Password: 1234-5678-9012
     ▼
┌────────────────┐
│   Frontend     │
│   /login       │
└────┬───────────┘
     │
     │ 2. POST /api/auth/login
     │    { userId, password }
     ▼
┌────────────────────────────┐
│   Backend Auth Service     │
│                            │
│  ✓ Query auth_users        │
│    WHERE user_id = ?       │
│                            │
│  ✓ Get password_hash       │
│                            │
│  ✓ Bcrypt compare          │
│    password vs hash        │
│                            │
│  ✓ Create session          │
│    req.session.userId      │
│                            │
│  ✓ Update last_login       │
└────────┬───────────────────┘
         │
         │ 3. Session cookie set
         ▼
    ┌──────────┐
    │  USER    │
    │ Logged   │
    │   In     │
    └──────────┘
```

## 🗄️ Database Schema

```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY,
  
  -- User-friendly ID (derived from email_hash)
  user_id VARCHAR(50) UNIQUE NOT NULL,
  -- Example: "SEECS-A7F4B2C9"
  
  -- SHA-256 hash of email (ONE-WAY, CANNOT REVERSE)
  email_hash VARCHAR(64) UNIQUE NOT NULL,
  -- Example: "7a3f2c1b9e4d8a6f..."
  
  -- Bcrypt hash of generated password
  password_hash TEXT NOT NULL,
  -- Example: "$2a$10$..."
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for fast lookup
CREATE INDEX idx_auth_users_user_id ON auth_users(user_id);
CREATE INDEX idx_auth_users_email_hash ON auth_users(email_hash);
```

## 🔒 Privacy Guarantees

```
┌──────────────────────────────────────────────────────────┐
│              WHAT'S STORED vs NOT STORED                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ❌ NOT STORED (Maximum Privacy):                        │
│     • Email addresses                                    │
│     • Any reversible email information                   │
│     • Plain-text passwords                               │
│     • OTPs (only in memory, temp)                        │
│                                                          │
│  ✅ STORED (Secure & Anonymous):                         │
│     • Email hash (SHA-256, one-way)                      │
│     • User ID (derived from hash)                        │
│     • Password hash (bcrypt)                             │
│     • Timestamps (created_at, last_login)                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 🔑 User ID Generation Algorithm

```javascript
// Input: email = "john.doe@seecs.edu.pk"

// Step 1: Normalize and hash
const normalized = email.toLowerCase().trim();
// → "john.doe@seecs.edu.pk"

const emailHash = SHA256(normalized);
// → "7a3f2c1b9e4d8a6f5c2b1a9e8d7c6b5a..."

// Step 2: Take first 16 chars, convert to number
const numeric = parseInt(emailHash.substring(0, 16), 16);
// → 8812345678901234 (example)

// Step 3: Convert to base36 for readability
const base36 = numeric.toString(36).toUpperCase();
// → "A7F4B2C9DE"

// Step 4: Take first 8 chars, add prefix
const userId = `SEECS-${base36.substring(0, 8)}`;
// → "SEECS-A7F4B2C9"

// Properties:
// ✓ Same email always generates same User ID
// ✓ Cannot reverse User ID back to email
// ✓ Looks professional and user-friendly
// ✓ Short enough to remember/type
```

## 🛡️ Security Features

```
┌────────────────────────────────────────────────────┐
│          MULTI-LAYER SECURITY                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  Layer 1: Email Domain Validation                 │
│           Only @seecs.edu.pk allowed               │
│                                                    │
│  Layer 2: OTP Verification                        │
│           6-digit code, 10-min expiry              │
│                                                    │
│  Layer 3: One-Way Email Hashing                   │
│           SHA-256, cannot reverse                  │
│                                                    │
│  Layer 4: Password Hashing                        │
│           Bcrypt with salt                         │
│                                                    │
│  Layer 5: Session Management                      │
│           Secure HTTP-only cookies                 │
│                                                    │
│  Layer 6: Duplicate Prevention                    │
│           Email hash uniqueness check              │
│                                                    │
└────────────────────────────────────────────────────┘
```

## 📧 Email Templates

### OTP Email:
```
Subject: Your Campus Whisper Verification Code

Your verification code is: 123456

This code expires in 10 minutes.
```

### Credentials Email:
```
Subject: Your Campus Whisper Login Credentials

User ID: SEECS-A7F4B2C9
Password: 1234-5678-9012

⚠️ SAVE THESE! We don't store your email, so we can't recover them.
```

## 🔄 Duplicate Registration Handling

```
User tries to register with same email again:

1. Backend hashes email → checks auth_users
2. Finds matching email_hash
3. Returns error: "Email already registered"
4. Frontend shows message + redirects to /login
5. User uses existing credentials

This prevents:
• Multiple accounts per email
• Account duplication
• Email enumeration attacks (partially)
```

## 🚀 Performance Considerations

- **OTP Storage**: In-memory Map (fast lookup)
- **Auto-cleanup**: Expired OTPs removed every 5 min
- **Database Indexes**: On user_id and email_hash
- **Session Store**: Server-side (secure)
- **Email Delivery**: Async, non-blocking

## 🎯 Key Benefits

1. **Complete Anonymity**: No emails in database
2. **GDPR Compliant**: No personal data stored
3. **Secure**: Industry-standard hashing
4. **User-Friendly**: Simple ID + password
5. **Duplicate Prevention**: One account per email
6. **Department-Only**: @seecs.edu.pk restriction
