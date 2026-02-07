import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Shield, KeyRound, Loader2, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"email" | "otp" | "credentials">("email");
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{ userId: string; password: string } | null>(null);

  const handleRequestOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        if (data.alreadyRegistered) {
          // Redirect to login
          setTimeout(() => setLocation("/login"), 2000);
        }
        return;
      }

      toast({
        title: "OTP Sent!",
        description: "Check your email for the verification code.",
      });
      setStep("otp");
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setCredentials({ userId: data.userId, password: data.password });
      setStep("credentials");

      toast({
        title: "Account Created!",
        description: "Save your credentials securely.",
      });
    } catch (err) {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const handleContinue = () => {
    // userId is already stored from credentials state
    if (credentials) {
      localStorage.setItem("userId", credentials.userId);
    }
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Anonymous Registration</CardTitle>
          <CardDescription>
            Register with your SEECS email. Your identity stays private.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">University Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.name@seecs.edu.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Only @seecs.edu.pk emails are allowed
                </p>
              </div>

              <Button
                onClick={handleRequestOTP}
                disabled={loading || !email.includes("@seecs.edu.pk")}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>Send Verification Code</>
                )}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">OTP sent to:</p>
                <p className="font-mono text-sm mt-1">{email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-Digit Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    disabled={loading}
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Code expires in 10 minutes
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("email")}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>Verify Code</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "credentials" && credentials && (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Account created successfully! Save your credentials.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-2 border-primary/30">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">User ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={credentials.userId}
                      readOnly
                      className="font-mono bg-background"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(credentials.userId, "User ID")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={credentials.password}
                      readOnly
                      className="font-mono bg-background"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(credentials.password, "Password")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertDescription className="text-sm">
                  <strong>⚠️ Save These Credentials!</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Your email is NOT stored (for privacy)</li>
                    <li>• We cannot recover these if lost</li>
                    <li>• Check your email for a backup copy</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button onClick={handleContinue} className="w-full">
                Continue to Dashboard
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Login here
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
