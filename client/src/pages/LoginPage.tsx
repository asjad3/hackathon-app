import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      toast({
        title: "Login Successful!",
        description: `Welcome back, ${data.userId}`,
      });

      // Store userId in localStorage
      localStorage.setItem("userId", data.userId);

      // Invalidate auth query so Router sees the new user and doesn't redirect back to login
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });

      // Redirect to home (Router will now have fresh auth state from useAuth())
      setLocation("/");
    } catch (err) {
      setError("Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Login with your unique NUST department ID and password
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userId"
                  type="text"
                  placeholder="DEPT-XXXXXXXX"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toUpperCase())}
                  className="pl-10 font-mono"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                e.g. SEECS-A7F4B2C9, NBS-1D3E5F7A
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="****-****-****"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 font-mono"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !userId || !password}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>Login</>
              )}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col gap-2">
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Register here
            </a>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-2">
            <p>🔒 Your identity is protected across all NUST departments</p>
            <p>We never store personal information</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
