import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import FeedPage from "@/pages/FeedPage";
import RumorDetailPage from "@/pages/RumorDetailPage";
import RegisterPage from "@/pages/RegisterPage";
import LoginPage from "@/pages/LoginPage";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/auth/status", {
          credentials: "include",
        });
        const data = await res.json();

        if (data.authenticated) {
          setIsAuthenticated(true);
          // Sync localStorage if needed
          if (data.userId) {
            localStorage.setItem("userId", data.userId);
          }
        } else {
          setIsAuthenticated(false);
          // Clear localStorage if session is invalid
          localStorage.removeItem("userId");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        localStorage.removeItem("userId");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Redirect unauthenticated users to login/register
  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      // Allow access to auth pages
      const publicRoutes = ["/register", "/login"];
      if (!publicRoutes.includes(location)) {
        setLocation("/login");
      }
    }
  }, [isCheckingAuth, isAuthenticated, location, setLocation]);

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="font-mono text-sm tracking-widest animate-pulse">
            ESTABLISHING SECURE CONNECTION...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/register" component={RegisterPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={FeedPage} />
      <Route path="/rumor/:id" component={RumorDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
