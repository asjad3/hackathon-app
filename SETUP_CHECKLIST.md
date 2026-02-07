# 🚀 Anonymous Authentication - Setup Checklist

## ✅ Pre-Implementation Checklist

- [x] Install dependencies (nodemailer, bcryptjs)
- [x] Create auth service (`server/auth.ts`)
- [x] Create email service (`server/email.ts`)
- [x] Add API routes (`server/routes.ts`)
- [x] Create frontend pages (RegisterPage, LoginPage)
- [x] Update App.tsx with new routes
- [x] Create database migrations
- [x] Update TypeScript types

## 📋 User Setup Checklist

### Step 1: Gmail App Password
- [ ] Go to https://myaccount.google.com/apppasswords
- [ ] Create app password for "Mail"
- [ ] Copy the 16-character password (remove spaces)

### Step 2: Update .env File
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-app-password-here
```

### Step 3: Run Database Migration
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Run the SQL from `SETUP_AUTH_IN_SUPABASE.sql`
- [ ] Verify `auth_users` table exists

### Step 4: Test the System
- [ ] Restart dev server: `npm run dev`
- [ ] Navigate to http://localhost:5000/register
- [ ] Enter your @seecs.edu.pk email
- [ ] Check email for OTP
- [ ] Verify OTP
- [ ] Check email for credentials
- [ ] Test login with credentials

## 🧪 Testing Flow

### Registration Test:
1. Go to `/register`
2. Enter: `test@seecs.edu.pk`
3. Check console for OTP (development mode)
4. Enter OTP
5. Save credentials shown on screen
6. Check email for credentials backup

### Login Test:
1. Go to `/login`
2. Enter User ID (e.g., `SEECS-A7F4B2C9`)
3. Enter Password (e.g., `1234-5678-9012`)
4. Click Login
5. Should redirect to home page

### Duplicate Registration Test:
1. Try to register same email again
2. Should show error: "Email already registered"
3. Should redirect to login page

## 🔍 Troubleshooting

### Email Not Sending?
- Check Gmail App Password is correct
- Ensure 2FA is enabled on Gmail
- Check SMTP_USER and SMTP_PASS in .env
- Check server console for error messages

### OTP Not Working?
- Check OTP hasn't expired (10 min limit)
- Verify email address is exactly the same
- Check server console for OTP (dev mode)

### Cannot Login?
- Verify User ID is correct (case-sensitive)
- Verify Password is correct (check email backup)
- Check Supabase auth_users table for the user

### Database Error?
- Ensure migration was run successfully
- Check Supabase logs for errors
- Verify auth_users table exists with correct columns

## 🎯 Success Criteria

- [ ] Can register with @seecs.edu.pk email
- [ ] Receive OTP email within 1 minute
- [ ] Can verify OTP and get credentials
- [ ] Receive credentials backup email
- [ ] Can login with User ID + Password
- [ ] Cannot register same email twice
- [ ] Session persists after login
- [ ] Can logout successfully

## 📊 Database Verification

Run this in Supabase to verify everything:

```sql
-- Check if table exists
SELECT * FROM auth_users LIMIT 1;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'auth_users';

-- Count registered users
SELECT COUNT(*) as total_users FROM auth_users;

-- View recent registrations
SELECT user_id, created_at, last_login, is_active 
FROM auth_users 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔒 Security Verification

- [ ] Email addresses are NOT in database
- [ ] Only email_hash (SHA-256) is stored
- [ ] Passwords are bcrypt hashed
- [ ] OTP expires after 10 minutes
- [ ] Only @seecs.edu.pk emails accepted
- [ ] Cannot reverse User ID to email

## 📝 Notes

- Development mode logs OTP/password to console
- Remove console.log statements in production
- Users MUST save credentials (unrecoverable)
- Each email can only register once
- Sessions are stored server-side

## 🎉 Ready for Production?

Before deploying:
- [ ] Remove OTP/password console.log statements
- [ ] Set up production email service
- [ ] Configure proper SESSION_SECRET
- [ ] Enable HTTPS
- [ ] Set up rate limiting for OTP requests
- [ ] Add email template branding
- [ ] Test with real @seecs.edu.pk emails
