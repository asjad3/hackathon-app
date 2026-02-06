import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { rateLimit } from "./middleware/rateLimit";
import session from "express-session";
import { randomUUID } from "crypto";

// Mock auth middleware for local development
function setupMockAuth(app: Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'hackathon-dev-secret-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  app.use((req: any, res, next) => {
    if (!req.session.userId) {
      req.session.userId = randomUUID();
    }
    req.user = { id: req.session.userId };
    req.isAuthenticated = () => true; // Always authenticated for local dev
    next();
  });
}

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: { id: string };
    }
  }
}

export async function registerRoutes(
    httpServer: Server,
    app: Express,
): Promise<Server> {
    // Mock Auth Setup for local development
    setupMockAuth(app);

    // Apply rate limiting to all API routes
    app.use("/api", rateLimit);

    // Rumor Routes
    app.get(api.rumors.list.path, async (req, res) => {
        const rumors = await storage.getRumors();
        res.json(rumors);
    });

    app.post(api.rumors.create.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const input = api.rumors.create.input.parse(req.body);
            const rumor = await storage.createRumor(input.content);
            res.status(201).json(rumor);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            throw err;
        }
    });

    app.get(api.rumors.get.path, async (req, res) => {
        const rumor = await storage.getRumor(req.params.id);
        if (!rumor) return res.status(404).json({ message: "Rumor not found" });
        res.json(rumor);
    });

    // Evidence Routes
    app.post(api.evidence.create.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const input = api.evidence.create.input.parse(req.body);
            const evidence = await storage.createEvidence({
                rumorId: req.params.id,
                evidenceType: input.isSupporting ? "support" : "dispute",
                contentType: input.url ? "link" : "text",
                contentUrl: input.url,
                contentText: input.content,
            });
            res.status(201).json(evidence);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            throw err;
        }
    });

    app.post(api.evidence.vote.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const { isHelpful } = api.evidence.vote.input.parse(req.body);
            const userId = req.user!.id; // Mock user ID from session

            const result = await storage.createVote({
                evidenceId: req.params.id,
                userId,
                isHelpful,
            });

            if (!result.success) {
                return res
                    .status(400)
                    .json({ message: result.error || "Vote failed" });
            }

            res.json(result);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Mock auth endpoints for local development
    app.get("/api/auth/user", (req, res) => {
        res.json({
            id: req.user!.id,
            username: "dev-user",
            displayName: "Local Dev User"
        });
    });

    app.get("/api/logout", (req: any, res) => {
        req.session.destroy(() => {
            res.redirect("/");
        });
    });

    return httpServer;
}

// Seed Data Helper
async function seedData() {
    try {
        const existingRumors = await storage.getRumors();
        if (existingRumors.length === 0) {
            console.log("Seeding data...");

            const r1 = await storage.createRumor(
                "The library 3rd floor is haunted by a ghost that helps you pass calculus.",
            );

            await storage.createEvidence({
                rumorId: r1.id,
                evidenceType: "support",
                contentType: "text",
                contentText:
                    "I fell asleep there and woke up with a completed derivative worksheet.",
            });

            await storage.createEvidence({
                rumorId: r1.id,
                evidenceType: "dispute",
                contentType: "text",
                contentText:
                    "It's just the janitor, Bob. He has a math degree.",
            });

            const r2 = await storage.createRumor(
                "Tuition is increasing by 15% next semester to fund a new e-sports arena.",
            );

            await storage.createEvidence({
                rumorId: r2.id,
                evidenceType: "support",
                contentType: "link",
                contentUrl: "http://university-news-leak.com/budget-2026",
                contentText: "Budget leak shows new arena funding",
            });

            console.log("Seeding complete.");
        }
    } catch (error) {
        console.error("Seeding failed:", error);
    }
}

// Run seed
seedData();
