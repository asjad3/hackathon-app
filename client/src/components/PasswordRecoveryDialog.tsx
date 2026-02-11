import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key, Lock } from "lucide-react";

interface PasswordRecoveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function PasswordRecoveryDialog({
    open,
    onOpenChange,
}: PasswordRecoveryDialogProps) {
    const [userId, setUserId] = useState("");
    const [backupCode, setBackupCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!userId.trim()) {
            setError("Please enter your User ID");
            return;
        }

        if (!backupCode.trim()) {
            setError("Please enter a backup code");
            return;
        }

        if (!newPassword || newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userId.trim(),
                    backupCode: backupCode.trim().toUpperCase(),
                    newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to reset password");
            }

            setSuccess(true);
            setTimeout(() => {
                onOpenChange(false);
                // Reset form
                setUserId("");
                setBackupCode("");
                setNewPassword("");
                setConfirmPassword("");
                setSuccess(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Password Recovery
                    </DialogTitle>
                    <DialogDescription>
                        Use one of your backup codes to reset your password
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                            Password reset successful! You can now login with
                            your new password.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="userId">User ID</Label>
                            <Input
                                id="userId"
                                placeholder="e.g., SEECS-A7F4B2C9"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="backupCode">Backup Code</Label>
                            <Input
                                id="backupCode"
                                placeholder="XXXX-XXXX-XXXX"
                                value={backupCode}
                                onChange={(e) => setBackupCode(e.target.value)}
                                disabled={loading}
                                className="font-mono"
                            />
                            <p className="text-xs text-slate-500">
                                Enter one of your 8 backup codes
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="At least 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm New Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                disabled={loading}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Reset Password
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
