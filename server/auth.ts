import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import { sendOTPEmail, sendCredentialsEmail } from "./email";

// In-memory OTP storage (in production, use Redis)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Constants
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// NUST Department email domains
const DEPARTMENT_DOMAINS: Record<string, { code: string; name: string }> = {
    "seecs.edu.pk": {
        code: "SEECS",
        name: "School of Electrical Engineering & Computer Science",
    },
    "nbs.nust.edu.pk": { code: "NBS", name: "NUST Business School" },
    "s3h.nust.edu.pk": {
        code: "S3H",
        name: "School of Social Sciences & Humanities",
    },
    "scme.nust.edu.pk": {
        code: "SCME",
        name: "School of Chemical & Materials Engineering",
    },
    "smme.nust.edu.pk": {
        code: "SMME",
        name: "School of Mechanical & Manufacturing Engineering",
    },
    "nice.nust.edu.pk": {
        code: "NICE",
        name: "National Institute of Construction Engineering",
    },
    "ceme.nust.edu.pk": {
        code: "CEME",
        name: "College of Electrical & Mechanical Engineering",
    },
    "sns.nust.edu.pk": { code: "SNS", name: "School of Natural Sciences" },
    "sada.nust.edu.pk": {
        code: "SADA",
        name: "School of Art, Design & Architecture",
    },
    "igis.nust.edu.pk": {
        code: "IGIS",
        name: "Institute of Geographical Information Systems",
    },
    "rcms.nust.edu.pk": {
        code: "RCMS",
        name: "Research Centre for Modelling & Simulation",
    },
    "nipcons.nust.edu.pk": {
        code: "NIPCONS",
        name: "NUST Institute of Peace & Conflict Studies",
    },
    "student.nust.edu.pk": {
        code: "STUDENT",
        name: "NUST Student",
    },
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
    return Object.keys(DEPARTMENT_DOMAINS).map((d) => `@${d}`);
}

/**
 * Generate a deterministic hash from email (one-way, not reversible)
 */
function hashEmail(email: string): string {
    return createHash("sha256")
        .update(email.toLowerCase().trim())
        .digest("hex");
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
        words.push(num.toString().padStart(4, "0"));
    }
    return words.join("-");
}

/**
 * Generate backup codes for password recovery
 * Returns 8 codes in format: XXXX-XXXX-XXXX
 */
function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const parts = [];
        for (let j = 0; j < 3; j++) {
            const num = randomBytes(2).readUInt16BE(0) % 10000;
            parts.push(num.toString(36).toUpperCase().padStart(4, "0"));
        }
        codes.push(parts.join("-"));
    }
    return codes;
}

/**
 * Hash a backup code for storage
 */
function hashBackupCode(code: string): string {
    return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
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
    backupCodes?: string[];
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
                message:
                    "Only NUST university emails are allowed (e.g. @seecs.edu.pk, @nbs.nust.edu.pk, @smme.nust.edu.pk, etc.)",
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
                message:
                    "This email is already registered. Please login with your User ID and password.",
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
    otp: string,
): Promise<OTPVerifyResult> {
    try {
        // Validate email
        if (!isValidEmail(email)) {
            return {
                success: false,
                message:
                    "Only NUST university emails are allowed (e.g. @seecs.edu.pk, @nbs.nust.edu.pk, @smme.nust.edu.pk, etc.)",
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

        // Create user in database (department column is optional for backward compatibility)
        const insertData: Record<string, any> = {
            user_id: userId,
            email_hash: emailHash,
            password_hash: passwordHash,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
        };

        // Try with department first, fall back without it
        let dbError;
        const result1 = await supabase
            .from("auth_users")
            .insert({ ...insertData, department: department.code });
        if (result1.error && result1.error.message?.includes("department")) {
            // Column doesn't exist yet, insert without it
            const result2 = await supabase
                .from("auth_users")
                .insert(insertData);
            dbError = result2.error;
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

        // Generate backup codes
        const backupCodes = generateBackupCodes(8);

        // Store hashed backup codes
        const backupCodeInserts = backupCodes.map((code) => ({
            user_id: userId,
            code_hash: hashBackupCode(code),
            used: false,
            created_at: new Date().toISOString(),
        }));

        const { error: codesError } = await supabase
            .from("backup_codes")
            .insert(backupCodeInserts);

        if (codesError) {
            console.error("[Auth] Error storing backup codes:", codesError);
            // Don't fail registration, just log the error
        }

        // Send credentials via email
        const emailSent = await sendCredentialsEmail(email, userId, password);

        console.log(`[Auth] User created: ${userId}`);
        console.log(`[Auth] Password for testing: ${password}`); // Remove in production
        console.log(`[Auth] Backup codes generated: ${backupCodes.length}`);

        return {
            success: true,
            message: emailSent
                ? "Account created! Check your email for login credentials."
                : "Account created! Here are your credentials (email failed to send).",
            userId,
            password,
            backupCodes,
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
    password: string,
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
        const passwordValid = await bcrypt.compare(
            password,
            user.password_hash,
        );

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
setInterval(
    () => {
        const now = Date.now();
        for (const [key, value] of otpStore.entries()) {
            if (now > value.expiresAt) {
                otpStore.delete(key);
            }
        }
    },
    5 * 60 * 1000,
); // Run every 5 minutes

/**
 * Password Recovery Interfaces
 */
export interface RecoveryVerifyResult {
    success: boolean;
    message: string;
    userId?: string;
}

export interface PasswordResetResult {
    success: boolean;
    message: string;
    newPassword?: string;
}

/**
 * Verify backup code for password recovery
 */
export async function verifyBackupCode(
    userId: string,
    backupCode: string,
): Promise<RecoveryVerifyResult> {
    try {
        // Normalize and hash the provided code
        const codeHash = hashBackupCode(backupCode);

        // Find matching unused backup code
        const { data: codes, error } = await supabase
            .from("backup_codes")
            .select("id, used")
            .eq("user_id", userId)
            .eq("code_hash", codeHash)
            .maybeSingle();

        if (error || !codes) {
            return {
                success: false,
                message: "Invalid backup code.",
            };
        }

        if (codes.used) {
            return {
                success: false,
                message: "This backup code has already been used.",
            };
        }

        // Mark code as used
        await supabase
            .from("backup_codes")
            .update({
                used: true,
                used_at: new Date().toISOString(),
            })
            .eq("id", codes.id);

        console.log(`[Auth] Backup code verified for user: ${userId}`);

        return {
            success: true,
            message: "Backup code verified!",
            userId,
        };
    } catch (error) {
        console.error("[Auth] Error verifying backup code:", error);
        return {
            success: false,
            message: "An error occurred. Please try again.",
        };
    }
}

/**
 * Reset password after backup code verification
 */
export async function resetPassword(
    userId: string,
    newPassword: string,
): Promise<PasswordResetResult> {
    try {
        // Verify user exists
        const { data: user, error } = await supabase
            .from("auth_users")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (error || !user) {
            return {
                success: false,
                message: "User not found.",
            };
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from("auth_users")
            .update({ password_hash: passwordHash })
            .eq("user_id", userId);

        if (updateError) {
            console.error("[Auth] Error updating password:", updateError);
            return {
                success: false,
                message: "Failed to reset password. Please try again.",
            };
        }

        console.log(`[Auth] Password reset for user: ${userId}`);

        return {
            success: true,
            message: "Password reset successful!",
            newPassword,
        };
    } catch (error) {
        console.error("[Auth] Error resetting password:", error);
        return {
            success: false,
            message: "An error occurred. Please try again.",
        };
    }
}

/**
 * Reset password using backup code (all in one)
 */
export async function resetPasswordWithBackupCode(
    userId: string,
    backupCode: string,
    newPassword: string,
): Promise<PasswordResetResult> {
    // First verify the backup code
    const verifyResult = await verifyBackupCode(userId, backupCode);

    if (!verifyResult.success) {
        return {
            success: false,
            message: verifyResult.message,
        };
    }

    // Then reset the password
    return resetPassword(userId, newPassword);
}
