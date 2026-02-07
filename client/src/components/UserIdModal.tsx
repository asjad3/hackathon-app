import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserIdModalProps {
    open: boolean;
    onSubmit: (userId: string) => Promise<void>;
}

export function UserIdModal({ open, onSubmit }: UserIdModalProps) {
    const [userId, setUserId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!userId.trim()) {
            setError("Please enter your user ID");
            return;
        }

        if (userId.trim().length < 3) {
            setError("User ID must be at least 3 characters");
            return;
        }

        if (userId.trim().length > 50) {
            setError("User ID must be less than 50 characters");
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit(userId.trim());
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to set user ID",
            );
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} modal>
            <DialogContent
                className="sm:max-w-md"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Shield className="h-5 w-5 text-primary" />
                        Welcome to Rumor Verification
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        Enter your campus ID or email to continue
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="userId" className="text-sm font-medium">
                            User ID
                        </Label>
                        <Input
                            id="userId"
                            placeholder="e.g., s12345 or student@university.edu"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            disabled={isSubmitting}
                            autoFocus
                            className="text-base"
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Alert className="bg-muted/50 border-muted">
                        <Shield className="h-4 w-4" />
                        <AlertDescription className="text-xs text-muted-foreground">
                            <strong className="text-foreground">
                                Privacy Notice:
                            </strong>{" "}
                            Your ID is used to prevent duplicate voting but
                            remains anonymous. Votes are stored as irreversible
                            hashes and cannot be traced back to you.
                        </AlertDescription>
                    </Alert>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Setting up..." : "Continue"}
                    </Button>
                </form>

                <div className="text-xs text-muted-foreground text-center pt-2">
                    One ID per person. Your reputation and points are tied to
                    this ID.
                </div>
            </DialogContent>
        </Dialog>
    );
}
