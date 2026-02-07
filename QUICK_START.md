# 🚀 QUICK START - 5 Minutes to Live

## ⚡ Step 1: Email Setup (2 min)

```bash
# 1. Get Gmail App Password
# Visit: https://myaccount.google.com/apppasswords
# Create password for "Mail" → Copy it

# 2. Add to .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop  # Your app password (no spaces)
```

## 🗄️ Step 2: Database Setup (1 min)

```sql
-- Open Supabase SQL Editor and run:

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

## ✅ Step 3: Test (2 min)

```bash
# Start server
npm run dev

# Visit in browser
http://localhost:5000/register

# Use test email
test@seecs.edu.pk

# Check console for OTP
# (or check your email)

# Complete registration
# Save the credentials shown

# Test login
http://localhost:5000/login
```

## 🎯 Quick Test Checklist

- [ ] `.env` has SMTP credentials
- [ ] Supabase migration ran successfully
- [ ] Server started without errors
- [ ] Can visit `/register` page
- [ ] OTP appears in console (dev mode)
- [ ] Can complete registration
- [ ] Receive credentials on screen
- [ ] Can login with credentials

## 🔧 Troubleshooting One-Liners

| Problem | Solution |
|---------|----------|
| Email not sending | Check SMTP_USER and SMTP_PASS in `.env` |
| OTP not working | Check console logs for the code |
| Database error | Run migration in Supabase SQL Editor |
| Page not found | Add routes to App.tsx (already done) |
| Duplicate toast error | Clear cache, restart server |

## 📱 New Routes Available

| Route | Purpose |
|-------|---------|
| `/register` | 3-step OTP registration |
| `/login` | User ID + password login |

## 🎨 What Users See

1. **Register** → Enter email → Get OTP → Verify → Get credentials
2. **Login** → Enter User ID + password → Access dashboard
3. **Privacy** → Email NEVER stored, only hash

## 🔐 Security Features

✅ Email hashed (SHA-256, one-way)
✅ Password hashed (Bcrypt)
✅ OTP expires (10 minutes)
✅ Domain restricted (@seecs.edu.pk)
✅ Session-based auth
✅ Duplicate prevention

## 📊 Database Check

```sql
-- Verify table exists
SELECT * FROM auth_users LIMIT 1;

-- Count users
SELECT COUNT(*) FROM auth_users;

-- View recent registrations
SELECT user_id, created_at FROM auth_users ORDER BY created_at DESC LIMIT 5;
```

## 🎉 You're Done!

**Everything is implemented and ready.**

Just:
1. Add Gmail creds to `.env`
2. Run SQL migration
3. Test registration flow

**That's it!**

---

## 📚 Full Documentation

- **This file**: Quick start
- `IMPLEMENTATION_COMPLETE.md`: Overview
- `SETUP_CHECKLIST.md`: Detailed checklist
- `docs/ANONYMOUS_AUTH_SETUP.md`: Complete guide
- `docs/AUTH_ARCHITECTURE.md`: System design
- `docs/USER_FLOW_PREVIEW.md`: UI previews

## 💡 Pro Tips

- OTP logged to console in dev mode
- Password also logged in dev mode
- Users get email backup of credentials
- Each email can only register once
- User ID format: `SEECS-XXXXXXXX`

## 🆘 Need Help?

1. Check `SETUP_CHECKLIST.md` for step-by-step
2. Read `docs/ANONYMOUS_AUTH_SETUP.md` for details
3. View `docs/USER_FLOW_PREVIEW.md` for UI examples

---

**Ready? Let's go! → `npm run dev` → `http://localhost:5000/register`**
