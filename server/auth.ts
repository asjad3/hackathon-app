import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase.js";
import { sendOTPEmail, sendCredentialsEmail } from "./email.js";

// In-memory OTP storage (in production, use Redis)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Constants
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// NUST Department email domains
const DEPARTMENT_DOMAINS: Record<string, { code: string; name: string }> = {
  "seecs.edu.pk": { code: "SEECS", name: "School of Electrical Engineering & Computer Science" },
  "nbs.nust.edu.pk": { code: "NBS", name: "NUST Business School" },
  "s3h.nust.edu.pk": { code: "S3H", name: "School of Social Sciences & Humanities" },
  "scme.nust.edu.pk": { code: "SCME", name: "School of Chemical & Materials Engineering" },
  "smme.nust.edu.pk": { code: "SMME", name: "School of Mechanical & Manufacturing Engineering" },
  "nice.nust.edu.pk": { code: "NICE", name: "National Institute of Construction Engineering" },
  "ceme.nust.edu.pk": { code: "CEME", name: "College of Electrical & Mechanical Engineering" },
  "sns.nust.edu.pk": { code: "SNS", name: "School of Natural Sciences" },
  "sada.nust.edu.pk": { code: "SADA", name: "School of Art, Design & Architecture" },
  "igis.nust.edu.pk": { code: "IGIS", name: "Institute of Geographical Information Systems" },
  "rcms.nust.edu.pk": { code: "RCMS", name: "Research Centre for Modelling & Simulation" },
  "nipcons.nust.edu.pk": { code: "NIPCONS", name: "NUST Institute of Peace & Conflict Studies" },
};

/**
 * Get department info from email domain
 */
function getDepartment(email: string): { code: string; name: string } | null {
  const emailLower = email.toLowerCase().trim();
  for (const [domain, info] of Object.entries(DEPARTMENT_DOMAINS)) {
    if (emailLower.endsWith(`@${domain}`)) {
      return info;
    }
  }
  return null;
}

/**
 * Get all allowed domain suffixes for display
 */
export function getAllowedDomains(): string[] {
  return Object.keys(DEPARTMENT_DOMAINS).map(d => `@${d}`);
}

/**
 * Generate a deterministic hash from email (one-way, not reversible)
 */
function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

/**
 * Generate a user-friendly unique ID from email hash with department prefix
 */
function generateUserId(emailHash: string, departmentCode: string): string {
  // Take first 8 characters of hash and convert to base36 for readability
  const numeric = parseInt(emailHash.substring(0, 16), 16);
  const userId = `${departmentCode}-${numeric.toString(36).toUpperCase().substring(0, 8)}`;
  return userId;
}

/**
 * Generate a secure random password
 */
function generatePassword(): string {
  // Generate 3 words from random bytes for memorability
  const words = [];
  for (let i = 0; i < 3; i++) {
    const num = randomBytes(2).readUInt16BE(0) % 10000;
    words.push(num.toString().padStart(4, '0'));
  }
  return words.join('-');
}

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate email domain - accepts all NUST department emails
 */
function isValidEmail(email: string): boolean {
  return getDepartment(email) !== null;
}

export interface OTPRequestResult {
  success: boolean;
  message: string;
  alreadyRegistered?: boolean;
}

export interface OTPVerifyResult {
  success: boolean;
  message: string;
  userId?: string;
  password?: string;
  alreadyRegistered?: boolean;
}

export interface LoginResult {
  success: boolean;
  message: string;
  userId?: string;
}

/**
 * Step 1: Request OTP
 * Validates email, checks if already registered, sends OTP
 */
export async function requestOTP(email: string): Promise<OTPRequestResult> {
  try {
    // Validate email domain
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: "Only NUST university emails are allowed (e.g. @seecs.edu.pk, @nbs.nust.edu.pk, @smme.nust.edu.pk, etc.)",
      };
    }

    // Hash the email
    const emailHash = hashEmail(email);

    // Check if user already exists (by email hash)
    const { data: existingUser } = await supabase
      .from("auth_users")
      .select("user_id")
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        message: "This email is already registered. Please login with your User ID and password.",
        alreadyRegistered: true,
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // Store OTP in memory (keyed by email hash for privacy)
    otpStore.set(emailHash, { otp, expiresAt });

    // Clean up expired OTPs
    setTimeout(() => otpStore.delete(emailHash), OTP_EXPIRY_MS);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return {
        success: false,
        message: "Failed to send OTP email. Please try again.",
      };
    }

    console.log(`[Auth] OTP sent to ${email.substring(0, 3)}***`);
    console.log(`[Auth] OTP for testing: ${otp}`); // Remove in production

    return {
      success: true,
      message: "OTP sent to your email. Please check your inbox.",
    };
  } catch (error) {
    console.error("[Auth] Error requesting OTP:", error);
    return {
      success: false,
      message: "An error occurred. Please try again.",
    };
  }
}

/**
 * Step 2: Verify OTP and create account
 * Verifies OTP, creates user with hashed email, generates credentials
 */
export async function verifyOTPAndRegister(
  email: string,
  otp: string
): Promise<OTPVerifyResult> {
  try {
    // Validate email
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: "Only NUST university emails are allowed (e.g. @seecs.edu.pk, @nbs.nust.edu.pk, @smme.nust.edu.pk, etc.)",
      };
    }

    const emailHash = hashEmail(email);
    const department = getDepartment(email)!;

    // Check if already registered
    const { data: existingUser } = await supabase
      .from("auth_users")
      .select("user_id")
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        message: "This email is already registered.",
        alreadyRegistered: true,
      };
    }

    // Verify OTP
    const storedOTP = otpStore.get(emailHash);
    if (!storedOTP) {
      return {
        success: false,
        message: "OTP expired or not found. Please request a new one.",
      };
    }

    if (storedOTP.otp !== otp) {
      return {
        success: false,
        message: "Invalid OTP. Please try again.",
      };
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(emailHash);
      return {
        success: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // OTP is valid - clear it
    otpStore.delete(emailHash);

    // Generate credentials
    const userId = generateUserId(emailHash, department.code);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const emailStored = email.toLowerCase().trim();

    // Create user in database (department column is optional for backward compatibility)
    // email is stored for internal use only; never returned to client or shown in app
    const insertData: Record<string, any> = {
      user_id: userId,
      email_hash: emailHash,
      email: emailStored,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    // Try with department first, then fall back without it; same for email column
    let dbError: Error | null = null;
    const withDept = { ...insertData, department: department.code };
    const result1 = await supabase.from("auth_users").insert(withDept);
    if (result1.error && result1.error.message?.includes("department")) {
      const result2 = await supabase.from("auth_users").insert(insertData);
      if (result2.error && result2.error.message?.includes("email")) {
        const { email: _e, ...insertWithoutEmail } = insertData;
        dbError = (await supabase.from("auth_users").insert(insertWithoutEmail)).error;
      } else {
        dbError = result2.error;
      }
    } else {
      dbError = result1.error;
    }

    if (dbError) {
      console.error("[Auth] Database error:", dbError);
      return {
        success: false,
        message: "Failed to create account. Please try again.",
      };
    }

    // Send credentials via email
    const emailSent = await sendCredentialsEmail(email, userId, password);

    console.log(`[Auth] User created: ${userId}`);
    console.log(`[Auth] Password for testing: ${password}`); // Remove in production

    return {
      success: true,
      message: emailSent
        ? "Account created! Check your email for login credentials."
        : "Account created! Here are your credentials (email failed to send).",
      userId,
      password,
    };
  } catch (error) {
    console.error("[Auth] Error verifying OTP:", error);
    return {
      success: false,
      message: "An error occurred. Please try again.",
    };
  }
}

/**
 * Step 3: Login with User ID and Password
 */
export async function login(
  userId: string,
  password: string
): Promise<LoginResult> {
  try {
    // Get user from database
    const { data: user, error } = await supabase
      .from("auth_users")
      .select("user_id, password_hash")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !user) {
      return {
        success: false,
        message: "Invalid User ID or password.",
      };
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return {
        success: false,
        message: "Invalid User ID or password.",
      };
    }

    // Update last login
    await supabase
      .from("auth_users")
      .update({ last_login: new Date().toISOString() })
      .eq("user_id", userId);

    console.log(`[Auth] User logged in: ${userId}`);

    return {
      success: true,
      message: "Login successful!",
      userId: user.user_id,
    };
  } catch (error) {
    console.error("[Auth] Error logging in:", error);
    return {
      success: false,
      message: "An error occurred. Please try again.",
    };
  }
}

/**
 * Cleanup expired OTPs periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes
