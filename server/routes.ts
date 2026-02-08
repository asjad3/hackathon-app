import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "./shared/routes";
import { z } from "zod";
import { rateLimit } from "./middleware/rateLimit";
import session from "express-session";
import { randomUUID, createHash } from "crypto";
import { demoRouter } from "./demo-resolution";

// User ID authentication for local development
function setupMockAuth(app: Express) {
    app.use(
        session({
            secret: process.env.SESSION_SECRET || "hackathon-dev-secret-2026",
            resave: false,
            saveUninitialized: false, // Don't auto-create sessions
            cookie: { secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
        }),
    );

    app.use((req: any, res, next) => {
        // Only set user if userId exists in session
        if (req.session.userId) {
            req.user = { id: req.session.userId };
            req.isAuthenticated = () => true;
        } else {
            req.user = null;
            req.isAuthenticated = () => false;
        }
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

declare module "express-session" {
    interface SessionData {
        userId?: string;
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

    // Demo/Testing endpoints for time-based resolution
    // ⚠️ Remove in production!
    app.use("/api/demo", demoRouter);

    // Anonymous Authentication Endpoints
    app.post("/api/auth/request-otp", async (req, res) => {
        try {
            const { email } = req.body;

            if (!email || typeof email !== "string") {
                return res.status(400).json({ message: "Email is required" });
            }

            const { requestOTP } = await import("./auth");
            const result = await requestOTP(email);

            if (!result.success) {
                return res.status(400).json({ message: result.message, alreadyRegistered: result.alreadyRegistered });
            }

            res.json({ message: result.message });
        } catch (error) {
            console.error("[API] Error requesting OTP:", error);
            res.status(500).json({ message: "Failed to send OTP" });
        }
    });

    app.post("/api/auth/verify-otp", async (req, res) => {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({ message: "Email and OTP are required" });
            }

            const { verifyOTPAndRegister } = await import("./auth");
            const result = await verifyOTPAndRegister(email, otp);

            if (!result.success) {
                return res.status(400).json({
                    message: result.message,
                    alreadyRegistered: result.alreadyRegistered
                });
            }

            // Set session
            req.session.userId = result.userId!;
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.status(500).json({ message: "Failed to create session" });
                }

                res.json({
                    message: result.message,
                    userId: result.userId,
                    password: result.password,
                });
            });
        } catch (error) {
            console.error("[API] Error verifying OTP:", error);
            res.status(500).json({ message: "Failed to verify OTP" });
        }
    });

    app.post("/api/auth/login", async (req, res) => {
        try {
            const { userId, password } = req.body;

            if (!userId || !password) {
                return res.status(400).json({ message: "User ID and password are required" });
            }

            const { login } = await import("./auth");
            const result = await login(userId, password);

            if (!result.success) {
                return res.status(401).json({ message: result.message });
            }

            // Set session
            req.session.userId = result.userId!;
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.status(500).json({ message: "Failed to create session" });
                }

                res.json({ message: result.message, userId: result.userId });
            });
        } catch (error) {
            console.error("[API] Error logging in:", error);
            res.status(500).json({ message: "Failed to login" });
        }
    });

    app.post("/api/auth/logout", (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
                return res.status(500).json({ message: "Failed to logout" });
            }
            res.json({ message: "Logged out successfully" });
        });
    });

    // Legacy authentication endpoint - DEPRECATED
    // Users should use /register or /login instead
    // Kept only for backward compatibility, will be removed
    app.post("/api/auth/set-user-id", (req, res) => {
        console.warn("[Auth] DEPRECATED: /api/auth/set-user-id called. Use /api/auth/login instead.");

        // Return error to force users to proper auth flow
        return res.status(403).json({
            error: "This authentication method is deprecated. Please register at /register or login at /login",
            redirectTo: "/login"
        });
    });

    app.get("/api/auth/status", (req, res) => {
        // Check if user has a valid session with userId
        if (req.session.userId) {
            res.json({ authenticated: true, userId: req.session.userId });
        } else {
            res.json({ authenticated: false });
        }
    });

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
            // Extract department from userId (e.g. "SEECS-A7F4B2C9" → "SEECS")
            const posterDept = req.user!.id.split("-")[0] || null;
            const rumor = await storage.createRumor(
                input.content,
                input.imageUrl,
                posterDept,
            );
            res.status(201).json(rumor);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            throw err;
        }
    });

    app.get(api.rumors.get.path, async (req, res) => {
        const rumor = await storage.getRumor(req.params.id as string);
        if (!rumor) return res.status(404).json({ message: "Rumor not found" });
        res.json(rumor);
    });

    // Evidence Routes
    app.post(api.evidence.create.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const input = api.evidence.create.input.parse(req.body);
            const userId = req.user!.id;
            const posterDept = userId.split("-")[0] || null;
            const salt = process.env.VOTE_SALT || "HACKATHON_SECRET_SALT_2026";
            const creatorHash = createHash("sha256")
                .update(`${userId}:${salt}:creator`)
                .digest("hex");

            const imageUrl = (req.body as any).imageUrl as string | undefined;
            let contentType: "link" | "image" | "text" = "text";
            if (imageUrl) contentType = "image";
            else if (input.url) contentType = "link";

            const evidence = await storage.createEvidence({
                rumorId: req.params.id as string,
                evidenceType: input.isSupporting ? "support" : "dispute",
                contentType,
                contentUrl: imageUrl || input.url || undefined,
                contentText: input.content,
                creatorHash,
                creatorDepartment: posterDept,
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
        console.log(
            "[VOTE] Evidence vote endpoint hit:",
            req.params.id,
            req.body,
        );

        if (!req.isAuthenticated()) {
            console.log("[VOTE] Not authenticated");
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const { isHelpful, stakeAmount } = api.evidence.vote.input.parse(
                req.body,
            );
            const userId = req.user!.id; // Mock user ID from session

            console.log("[VOTE] Processing vote:", {
                evidenceId: req.params.id,
                userId,
                isHelpful,
                stakeAmount,
            });

            const result = await storage.createVote({
                evidenceId: req.params.id as string,
                userId,
                isHelpful,
                stakeAmount,
            });

            if (!result.success) {
                console.log("[VOTE] Vote failed:", result.error);
                return res
                    .status(400)
                    .json({ message: result.error || "Vote failed" });
            }

            console.log("[VOTE] Vote successful");
            res.json(result);
        } catch (err) {
            console.error("[VOTE] Error:", err);
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Rumor voting endpoint
    app.post(api.rumor.vote.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const { voteType, stakeAmount } = api.rumor.vote.input.parse(
                req.body,
            );
            const userId = req.user!.id;

            const result = await storage.createRumorVote({
                rumorId: req.params.id as string,
                userId,
                voteType,
                stakeAmount,
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

    // Rumor Relationships - List relationships for a rumor
    app.get(api.relationships.list.path, async (req, res) => {
        try {
            const rumorId = req.params.id as string;
            const relationships = await storage.getRumorRelationships(rumorId);
            res.json(relationships);
        } catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Rumor Relationships - Create a new relationship
    app.post(api.relationships.create.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const { targetRumorId, relationshipType } =
                api.relationships.create.input.parse(req.body);
            const sourceRumorId = req.params.id as string;

            const result = await storage.createRumorRelationship({
                parentRumorId: sourceRumorId,
                childRumorId: targetRumorId,
                relationshipType: relationshipType || "depends_on",
            });

            if (!result.success) {
                return res.status(400).json({
                    message: result.error || "Failed to create relationship",
                });
            }

            res.status(201).json(result);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Rumor Relationships - Get dependency graph
    app.get(api.relationships.graph.path, async (req, res) => {
        try {
            const rumorId = req.params.id as string;
            const graph = await storage.getRumorGraph(rumorId);
            res.json(graph);
        } catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // User Stats Endpoint
    app.get(api.user.stats.path, async (req, res) => {
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });

        try {
            const userId = req.user!.id;
            const salt = process.env.VOTE_SALT || "HACKATHON_SECRET_SALT_2026";

            // Generate user hash (consistent across all their votes)
            const { createHash } = await import("crypto");
            const userHash = createHash("sha256")
                .update(`${userId}:${salt}`)
                .digest("hex");

            const stats = await storage.getUserStats(userHash);

            if (!stats) {
                // User hasn't voted yet, return defaults
                return res.json({
                    reputation: 0.5,
                    totalPoints: 100,
                    pointsStaked: 0,
                    correctVotes: 0,
                    totalVotes: 0,
                });
            }

            res.json(stats);
        } catch (err) {
            console.error("User stats error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
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

            const salt = process.env.VOTE_SALT || "HACKATHON_SECRET_SALT_2026";
            const seedCreatorHash = createHash("sha256")
                .update(`seed_user:${salt}:creator`)
                .digest("hex");

            const r1 = await storage.createRumor(
                "The library 3rd floor is haunted by a ghost that helps you pass calculus.",
            );

            await storage.createEvidence({
                rumorId: r1.id,
                evidenceType: "support",
                contentType: "text",
                contentText:
                    "I fell asleep there and woke up with a completed derivative worksheet.",
                creatorHash: seedCreatorHash,
            });

            await storage.createEvidence({
                rumorId: r1.id,
                evidenceType: "dispute",
                contentType: "text",
                contentText:
                    "It's just the janitor, Bob. He has a math degree.",
                creatorHash: seedCreatorHash,
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
                creatorHash: seedCreatorHash,
            });

            console.log("Seeding complete.");
        }
    } catch (error) {
        console.error("Seeding failed:", error);
    }
}

// Run seed
seedData();
