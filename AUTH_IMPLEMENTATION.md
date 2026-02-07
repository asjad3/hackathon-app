# 🔐 Anonymous OTP Authentication - Quick Start

## ⚡ What Was Implemented

A complete **anonymous authentication system** using email OTP verification:

- ✅ Email OTP verification (@seecs.edu.pk only)
- ✅ Anonymous User ID generation (from email hash)
- ✅ **NO EMAILS stored in database** (privacy-first)
- ✅ Secure password generation and storage
- ✅ Beautiful UI for registration and login
- ✅ Duplicate email prevention

## 🎯 Setup Steps (3 Minutes)

### 1. Install Dependencies (Already Done ✓)
```bash
npm install nodemailer bcryptjs @types/nodemailer @types/bcryptjs
```

### 2. Configure Email in `.env`

Add these lines to your `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

**Get Gmail App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Enable 2FA (if not already)
3. Create app password for "Mail"
4. Copy the password (remove spaces)

### 3. Run Database Migration

Open **Supabase SQL Editor** and run:
```bash
# File already created for you:
SETUP_AUTH_IN_SUPABASE.sql
```

Or copy/paste this:
```sql
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) UNIQUE NOT NULL,
  email_hash VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_auth_users_user_id ON auth_users(user_id);
CREATE INDEX idx_auth_users_email_hash ON auth_users(email_hash);
```

### 4. Restart Server & Test

```bash
npm run dev
```

Then visit:
- **Register:** http://localhost:5000/register
- **Login:** http://localhost:5000/login

## 🧪 Testing Flow

1. Go to `/register`
2. Enter: `test@seecs.edu.pk`
3. Check email for OTP (or check console logs in dev mode)
4. Enter OTP
5. Get credentials: `SEECS-XXXXXXXX` and password
6. Check email for backup copy
7. Login with credentials at `/login`

## 📂 What's New

**Backend:**
- `server/auth.ts` - Auth logic (OTP, registration, login)
- `server/email.ts` - Email service (nodemailer)
- `server/routes.ts` - 4 new API endpoints

**Frontend:**
- `client/src/pages/RegisterPage.tsx` - 3-step OTP flow
- `client/src/pages/LoginPage.tsx` - User ID + password login

**Database:**
- `auth_users` table - Stores hashed emails only

**Documentation:**
- `SETUP_CHECKLIST.md` - Step-by-step checklist
- `docs/ANONYMOUS_AUTH_SETUP.md` - Detailed guide
- `docs/AUTH_ARCHITECTURE.md` - System architecture
- `SETUP_AUTH_IN_SUPABASE.sql` - SQL migration

## 🔒 Privacy Features

```
Email Input          Database Storage
─────────────        ─────────────────
john@seecs.edu.pk → SHA-256 Hash: 7a3f2c1b...
                  → User ID: SEECS-A7F4B2C9
                  → Password: 1234-5678-9012

✅ Email is NEVER stored
✅ Hash cannot be reversed
✅ Completely anonymous
```

## 🎯 API Endpoints

- `POST /api/auth/request-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP & create account
- `POST /api/auth/login` - Login with User ID + password
- `POST /api/auth/logout` - Logout and destroy session

## ⚠️ Important Notes

1. **Save your credentials!** We can't recover them (no email stored)
2. Each email can only register **once** (checked by hash)
3. OTP expires in **10 minutes**
4. Only **@seecs.edu.pk** emails allowed

## 🐛 Troubleshooting

**Email not sending?**
- Check Gmail App Password is correct
- Ensure 2FA is enabled
- Check `.env` has correct SMTP_USER and SMTP_PASS

**Can't login?**
- Check credentials are exact (case-sensitive)
- Check email for backup copy
- Check Supabase `auth_users` table

**OTP not working?**
- Check it hasn't expired (10 min limit)
- Check console logs for OTP (dev mode)
- Try requesting a new OTP

## 📖 Full Documentation

- **Quick Setup:** `SETUP_CHECKLIST.md`
- **Detailed Guide:** `docs/ANONYMOUS_AUTH_SETUP.md`
- **Architecture:** `docs/AUTH_ARCHITECTURE.md`

## ✅ Success Checklist

- [ ] `.env` configured with Gmail credentials
- [ ] Database migration run in Supabase
- [ ] Can register with @seecs.edu.pk email
- [ ] Receive OTP email
- [ ] Can verify and get credentials
- [ ] Can login with User ID + password
- [ ] Cannot register same email twice

## 🚀 Ready to Go!

Your anonymous authentication system is ready. Users can now:
1. Register anonymously with university email
2. Get unique User ID + password
3. Login securely without exposing identity

**Need help?** Check the documentation files above.
