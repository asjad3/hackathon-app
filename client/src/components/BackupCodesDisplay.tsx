import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Download, CheckCircle2, AlertTriangle } from "lucide-react";

interface BackupCodesDisplayProps {
    backupCodes: string[];
    userId: string;
    password: string;
    onComplete: () => void;
}

export default function BackupCodesDisplay({
    backupCodes,
    userId,
    password,
    onComplete,
}: BackupCodesDisplayProps) {
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const copyToClipboard = () => {
        const text = `
CampusTrust Account Credentials
================================

User ID: ${userId}
Password: ${password}

Backup Codes (Save these securely!)
-----------------------------------
${backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

⚠️ Keep these codes safe! You can use them to recover your password if you forget it.
Each code can only be used once.
`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadCodes = () => {
        const text = `
CampusTrust Account Credentials
================================

User ID: ${userId}
Password: ${password}

Backup Codes (Save these securely!)
-----------------------------------
${backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

⚠️ IMPORTANT SECURITY NOTES:
- Keep these codes in a safe place
- Each code can only be used once
- You can use them to reset your password
- Do not share these codes with anyone
- Store them offline for maximum security

Generated on: ${new Date().toLocaleString()}
`;
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `campustrust-backup-codes-${userId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-3xl font-bold">
                        Account Created Successfully!
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Save your credentials and backup codes securely
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Credentials */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                        <div>
                            <label className="text-sm font-semibold text-slate-600">
                                User ID
                            </label>
                            <p className="text-lg font-mono font-bold text-slate-900">
                                {userId}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-600">
                                Password
                            </label>
                            <p className="text-lg font-mono font-bold text-slate-900">
                                {password}
                            </p>
                        </div>
                    </div>

                    {/* Warning Alert */}
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Important:</strong> Save these backup codes
                            now! You won't be able to see them again. Each code
                            can only be used once to recover your password.
                        </AlertDescription>
                    </Alert>

                    {/* Backup Codes */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">
                            Backup Recovery Codes
                        </h3>
                        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border">
                            {backupCodes.map((code, index) => (
                                <div
                                    key={index}
                                    className="font-mono text-sm bg-white p-2 rounded border text-center font-semibold"
                                >
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={copyToClipboard}
                            variant="outline"
                            className="flex-1"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy All
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={downloadCodes}
                            variant="outline"
                            className="flex-1"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download as Text
                        </Button>
                    </div>

                    {/* Confirmation */}
                    <div className="space-y-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-sm">
                                I have saved my credentials and backup codes
                                securely
                            </span>
                        </label>
                        <Button
                            onClick={onComplete}
                            disabled={!confirmed}
                            className="w-full"
                            size="lg"
                        >
                            Continue to Login
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
