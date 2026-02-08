import React from "react";
import { Button } from "@/components/ui/button";
import { Terminal, Shield, Lock, Activity } from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function LandingPage() {
  const handleLogin = () => {
    window.location.href = apiUrl("/api/login");
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background text-foreground overflow-hidden">
      {/* Left Panel - Visual/Brand */}
      <div className="relative flex flex-col justify-between p-8 lg:p-12 lg:w-1/2 bg-grid-pattern border-b lg:border-b-0 lg:border-r border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/80 lg:via-background/50 lg:to-primary/5 z-0" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
            <Activity className="h-4 w-4" />
            <span>PROTOCOL V1.0 ONLINE</span>
          </div>

          <h1 className="font-sans text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Decentralized<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Truth</span>
            <br />Verification
          </h1>

          <p className="mt-6 max-w-md text-lg text-muted-foreground leading-relaxed">
            The Campus Rumor System uses Bayesian inference and anonymous consensus to mathematically separate fact from fiction. No central authority. No identity tracking.
          </p>
        </div>

        <div className="relative z-10 mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
            <Shield className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Trust Scoring</h3>
            <p className="text-sm text-muted-foreground">Dynamic probability scores update in real-time as evidence is crowdsourced.</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
            <Lock className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Cryptographic Anonymity</h3>
            <p className="text-sm text-muted-foreground">Vote hashes ensure one-person-one-vote without revealing your identity.</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Action */}
      <div className="flex flex-col items-center justify-center p-8 lg:w-1/2 bg-card relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

        <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/40">
            <Terminal className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access The Network</h2>
            <p className="text-sm text-muted-foreground">
              Authenticate via Replit to generate your anonymous session key.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            size="lg"
            className="w-full text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
          >
            Connect with Replit
          </Button>

          <p className="px-8 text-center text-xs text-muted-foreground">
            By connecting, you agree to the protocol's consensus mechanism. Your vote hash is permanent.
          </p>
        </div>
      </div>
    </div>
  );
}
