# 🔐 Complete Authentication Flow - OTP System

## ✅ Fixed Issues

The authentication system has been **completely updated** to enforce OTP-based authentication:

### What Was Wrong:
❌ Old "UserIdModal" allowed direct login without OTP
❌ Users could enter any User ID and bypass email verification
❌ No email validation or OTP verification

### What's Fixed Now:
✅ **All users must go through OTP verification**
✅ **No direct User ID entry** - deprecated the legacy endpoint
✅ **Email verification required** before account creation
✅ **Proper redirect flow** for unauthenticated users

---

## 🔄 Complete Authentication Flow

### **New User Registration Flow:**

```
1. User visits app → Auto-redirected to /login
   ↓
2. User clicks "Register here" → Goes to /register
   ↓
3. STEP 1: Email Entry
   • User enters: student@seecs.edu.pk
   • System validates: Must end with @seecs.edu.pk
   • System checks: Email not already registered
   • System generates: 6-digit OTP
   • System stores: OTP in memory (10-min expiry)
   • System sends: OTP email via nodemailer
   ↓
4. STEP 2: OTP Verification
   • User receives: Email with OTP (e.g., 123456)
   • User enters: OTP in the form
   • System validates: OTP matches and not expired
   • System hashes: Email → SHA-256 → email_hash
   • System generates: User ID (e.g., SEECS-A7F4B2C9)
   • System generates: Password (e.g., 1234-5678-9012)
   • System hashes: Password → bcrypt → password_hash
   • System stores: user_id, email_hash, password_hash in auth_users table
   • System sends: Credentials email (backup)
   • System creates: Session with userId
   ↓
5. STEP 3: Credentials Display
   • User sees: User ID and Password on screen
   • User can: Copy credentials to clipboard
   • User saves: Credentials (important!)
   • User clicks: "Continue to Dashboard"
   ↓
6. User logged in → Session active → Can access app
```

### **Returning User Login Flow:**

```
1. User visits app → Auto-redirected to /login
   ↓
2. User enters: User ID (e.g., SEECS-A7F4B2C9)
   ↓
3. User enters: Password (e.g., 1234-5678-9012)
   ↓
4. System queries: auth_users table by user_id
   ↓
5. System verifies: Password vs password_hash (bcrypt)
   ↓
6. System creates: Session with userId
   ↓
7. System updates: last_login timestamp
   ↓
8. User logged in → Redirected to home page
```

### **Session Management:**

```
1. User has active session → Can access all pages
   ↓
2. User closes browser → Session cookie persists (if configured)
   ↓
3. User returns → Session restored from cookie
   ↓
4. User clicks logout:
   • Session destroyed on server
   • localStorage cleared
   • Redirected to /login
```

---

## 🛡️ Security Enforcement

### **Route Protection:**

```javascript
// In App.tsx

if (!isAuthenticated) {
  // Only these routes are accessible:
  ✅ /register
  ✅ /login
  
  // All other routes redirect to /login:
  ❌ /
  ❌ /rumor/:id
  ❌ Any other route
}
```

### **Endpoint Protection:**

```javascript
// Legacy endpoint now returns 403:
POST /api/auth/set-user-id
→ Response: {
    error: "This authentication method is deprecated. 
            Please register at /register or login at /login",
    redirectTo: "/login"
  }

// Only these endpoints work:
✅ POST /api/auth/request-otp     → Send OTP
✅ POST /api/auth/verify-otp      → Verify & create account
✅ POST /api/auth/login           → Login with credentials
✅ POST /api/auth/logout          → Logout
✅ GET  /api/auth/status          → Check auth status
```

---

## 📧 Email Flow

### **Email 1: OTP Verification**
```
From: Campus Whisper
Subject: Your Campus Whisper Verification Code

Your verification code is: 123456

This code expires in 10 minutes.
```

**When sent:**
- After user enters email on /register
- Via nodemailer with Gmail SMTP

### **Email 2: Credentials Backup**
```
From: Campus Whisper
Subject: Your Campus Whisper Login Credentials

User ID: SEECS-A7F4B2C9
Password: 1234-5678-9012

⚠️ SAVE THESE! We don't store your email.
```

**When sent:**
- After successful OTP verification
- Immediately before showing credentials screen

---

## 🗄️ Database State

### **Before OTP Verification:**
```sql
-- auth_users table is empty for this email
SELECT * FROM auth_users WHERE email_hash = '7a3f2c1b...'
→ No rows
```

### **After OTP Verification:**
```sql
-- New row created
INSERT INTO auth_users (
  user_id,      -- SEECS-A7F4B2C9
  email_hash,   -- 7a3f2c1b9e4d8a6f... (SHA-256 of email)
  password_hash -- $2a$10$abc123... (Bcrypt of password)
)
```

### **Email Privacy Guarantee:**
```
❌ Email NOT stored: student@seecs.edu.pk
✅ Hash stored: 7a3f2c1b9e4d8a6f5c2b1a9e8d7c6b5a...

Cannot reverse hash → Original email is LOST FOREVER
```

---

## 🚫 What Users CANNOT Do

❌ **Cannot login without OTP verification**
❌ **Cannot bypass email validation**
❌ **Cannot register same email twice**
❌ **Cannot access app without authentication**
❌ **Cannot use made-up User IDs**
❌ **Cannot recover credentials without email**

---

## ✅ What Users CAN Do

✅ **Register with @seecs.edu.pk email**
✅ **Receive OTP via email**
✅ **Verify OTP and get credentials**
✅ **Login with generated User ID + Password**
✅ **Access app features after authentication**
✅ **Check email for credentials backup**
✅ **Logout and login again**

---

## 🧪 Testing the Flow

### **Test 1: New User Registration**
```bash
1. Clear localStorage and cookies
2. Visit: http://localhost:5000
3. Should redirect to: /login
4. Click: "Register here"
5. Should navigate to: /register
6. Enter email: test@seecs.edu.pk
7. Click: "Send Verification Code"
8. Check: Server console for OTP (dev mode)
9. Enter: OTP from console
10. Should see: Credentials display
11. Note: User ID and Password
12. Click: "Continue to Dashboard"
13. Should redirect to: /
14. Should see: Navbar with user avatar
```

### **Test 2: Existing User Login**
```bash
1. Visit: http://localhost:5000
2. Should redirect to: /login
3. Enter: User ID from registration
4. Enter: Password from registration
5. Click: "Login"
6. Should redirect to: /
7. Should see: Dashboard
```

### **Test 3: Duplicate Email Prevention**
```bash
1. Try to register with same email again
2. System checks: email_hash exists in database
3. Returns error: "Email already registered"
4. User redirected to: /login
```

### **Test 4: Logout Flow**
```bash
1. While logged in, click: User avatar
2. Click: "Disconnect Session"
3. Session destroyed on server
4. localStorage cleared
5. Redirected to: /login
6. Cannot access: Protected routes
```

### **Test 5: Invalid OTP**
```bash
1. Enter email and request OTP
2. Enter wrong OTP: 000000
3. Should see error: "Invalid OTP"
4. OTP still valid, can try again
```

### **Test 6: Expired OTP**
```bash
1. Request OTP
2. Wait 11 minutes
3. Enter OTP
4. Should see error: "OTP has expired"
5. Must request new OTP
```

---

## 🔧 Configuration Required

### **1. Environment Variables (.env)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

### **2. Database Migration**
```sql
-- Must run in Supabase SQL Editor
-- See: SETUP_AUTH_IN_SUPABASE.sql
CREATE TABLE auth_users (...)
```

### **3. Server Restart**
```bash
# After configuration
npm run dev
```

---

## 📊 Session Flow Diagram

```
┌─────────────────────────────────────────────┐
│         User Visits App                     │
└───────────────┬─────────────────────────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Check Session Cookie  │
    └───────────┬───────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    [Has Session]   [No Session]
        │               │
        ▼               ▼
    Dashboard      /login page
        │               │
        │               ▼
        │         User registers
        │         or logs in
        │               │
        │               ▼
        │         Session created
        │               │
        └───────────────┘
                │
                ▼
          User logged in
          Can access app
```

---

## 🎯 Key Points

1. **No more UserIdModal** - Completely removed
2. **OTP is mandatory** - Cannot bypass
3. **Email verification** - Required for registration
4. **Session-based auth** - Secure cookies
5. **Email privacy** - Only hash stored
6. **One email = One account** - Enforced by database
7. **Proper redirects** - Unauthenticated → /login

---

## 📝 Summary

**The authentication system now:**
- ✅ Enforces OTP verification for all new users
- ✅ Requires proper login with User ID + Password
- ✅ Protects all routes except /login and /register
- ✅ Maintains user anonymity (no emails stored)
- ✅ Provides email backup of credentials
- ✅ Prevents duplicate registrations
- ✅ Uses secure session management

**Users must:**
1. Register with @seecs.edu.pk email
2. Verify email with OTP
3. Receive and save credentials
4. Login with User ID + Password
5. Maintain active session to use app

**No shortcuts or bypasses available!**
