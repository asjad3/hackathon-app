import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { UserIdModal } from "@/components/UserIdModal";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import FeedPage from "@/pages/FeedPage";
import RumorDetailPage from "@/pages/RumorDetailPage";

function Router() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("userId")
  );
  const [showModal, setShowModal] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(true);

  // Check auth status and restore session if needed
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/auth/status", {
          credentials: "include",
        });
        const data = await res.json();

        if (data.authenticated) {
          // Session exists, sync localStorage if needed
          if (data.userId && !userId) {
            localStorage.setItem("userId", data.userId);
            setUserId(data.userId);
          }
          setIsSettingUp(false);
        } else if (userId) {
          // Have userId in localStorage but no session, restore it
          try {
            await handleUserIdSubmit(userId);
          } catch (error) {
            // If restore fails, show modal
            console.error("Failed to restore session:", error);
            setShowModal(true);
            setIsSettingUp(false);
          }
        } else {
          // No session and no userId, show modal
          setShowModal(true);
          setIsSettingUp(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setShowModal(true);
        setIsSettingUp(false);
      }
    };

    checkAuthStatus();
  }, []); // Empty dependency array - only run once on mount

  const handleUserIdSubmit = async (id: string) => {
    try {
      const res = await fetch("/api/auth/set-user-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to set user ID");
      }

      // Store in localStorage
      localStorage.setItem("userId", id);
      setUserId(id);
      setShowModal(false);
      setIsSettingUp(false);

      toast({
        title: "Authentication Successful",
        description: "You can now submit rumors and vote on evidence.",
      });
    } catch (error) {
      throw error; // Let modal handle the error display
    }
  };

  if (isLoading || isSettingUp) {
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
    <>
      <UserIdModal open={showModal} onSubmit={handleUserIdSubmit} />
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-40" />
      )}
      <div className={showModal ? "blur-sm pointer-events-none" : ""}>
        <Switch>
          <Route path="/" component={FeedPage} />
          <Route path="/rumor/:id" component={RumorDetailPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
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
