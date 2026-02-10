import { Router } from "express";
import { storage } from "./storage.js";
import { supabase } from "./supabase.js";

/**
 * DEMO/TESTING ENDPOINTS
 * These endpoints allow you to test time-based resolution without waiting 48 hours
 *
 * ⚠️ WARNING: These should be removed or protected in production!
 */

export const demoRouter = Router();

/**
 * POST /api/demo/force-resolve/:rumorId
 *
 * Manually sets the threshold timestamps to 48+ hours ago,
 * then triggers resolution for a specific rumor.
 *
 * This simulates what would happen after 48 hours of the score
 * being above 0.75 or below 0.25.
 */
demoRouter.post("/force-resolve/:rumorId", async (req, res) => {
    try {
        const { rumorId } = req.params;

        // Get current rumor
        const { data: rumor, error: fetchError } = await supabase
            .from("rumors")
            .select("id, trust_score, status")
            .eq("id", rumorId)
            .single();

        if (fetchError || !rumor) {
            return res.status(404).json({ error: "Rumor not found" });
        }

        if (rumor.status !== "Active") {
            return res.status(400).json({
                error: "Rumor is already resolved",
                currentStatus: rumor.status,
            });
        }

        // Determine which timestamp to set based on current score
        let updateField: string | null = null;
        let expectedStatus: string | null = null;

        if (rumor.trust_score >= 0.75) {
            updateField = "score_above_75_since";
            expectedStatus = "Verified";
        } else if (rumor.trust_score <= 0.25) {
            updateField = "score_below_25_since";
            expectedStatus = "Debunked";
        } else {
            // For inconclusive, we need to set created_at to 7+ days ago
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);

            const { error: updateError } = await supabase
                .from("rumors")
                .update({ created_at: sevenDaysAgo.toISOString() })
                .eq("id", rumorId);

            if (updateError) throw updateError;

            expectedStatus = "Inconclusive";
        }

        // Set the threshold timestamp to 48+ hours ago
        if (updateField) {
            const fortyEightHoursAgo = new Date();
            fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 49);

            const { error: updateError } = await supabase
                .from("rumors")
                .update({ [updateField]: fortyEightHoursAgo.toISOString() })
                .eq("id", rumorId);

            if (updateError) throw updateError;
        }

        // Now trigger the resolution check
        const result = await storage.checkAndResolveRumors();

        // Check if this rumor was resolved
        const wasResolved = result.rumors.some((r) => r.rumorId === rumorId);

        if (!wasResolved) {
            return res.status(400).json({
                error: "Rumor did not meet resolution criteria",
                currentScore: rumor.trust_score,
                expectedStatus,
                hint:
                    rumor.trust_score >= 0.25 && rumor.trust_score <= 0.75
                        ? "Score is in inconclusive range (0.25-0.75). Need to wait 7 days OR push score outside this range."
                        : "Unknown issue - check logs",
            });
        }

        const resolvedRumor = result.rumors.find((r) => r.rumorId === rumorId);

        return res.json({
            success: true,
            message: "Rumor resolved successfully!",
            rumorId,
            newStatus: resolvedRumor?.newStatus || expectedStatus,
            votersUpdated: resolvedRumor?.votersUpdated || 0,
            totalResolved: result.resolved,
            details: resolvedRumor,
        });
    } catch (error) {
        console.error("Error in force-resolve:", error);
        return res.status(500).json({
            error: "Failed to resolve rumor",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

/**
 * POST /api/demo/resolve-all
 *
 * Triggers the resolution check for ALL rumors.
 * This is what the CRON job does every hour.
 */
demoRouter.post("/resolve-all", async (req, res) => {
    try {
        const result = await storage.checkAndResolveRumors();

        return res.json({
            success: true,
            message: `Resolved ${result.resolved} rumor(s)`,
            resolved: result.resolved,
            rumors: result.rumors,
        });
    } catch (error) {
        console.error("Error in resolve-all:", error);
        return res.status(500).json({
            error: "Failed to resolve rumors",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

/**
 * GET /api/demo/resolution-candidates
 *
 * Shows which rumors are candidates for resolution
 * (helps debug why a rumor isn't resolving)
 */
demoRouter.get("/resolution-candidates", async (req, res) => {
    try {
        const now = new Date();
        const fortyEightHoursAgo = new Date(
            now.getTime() - 48 * 60 * 60 * 1000,
        );
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get all active rumors
        const { data: rumors, error } = await supabase
            .from("rumors")
            .select(
                "id, content, trust_score, status, created_at, score_above_75_since, score_below_25_since",
            )
            .eq("status", "Active");

        if (error) throw error;

        const candidates = rumors?.map((rumor) => {
            let canResolve = false;
            let reason = "";
            let expectedStatus = "";

            // Check verified criteria
            if (
                rumor.score_above_75_since &&
                new Date(rumor.score_above_75_since) <= fortyEightHoursAgo
            ) {
                canResolve = true;
                reason = "Score ≥ 0.75 for 48+ hours";
                expectedStatus = "Verified";
            }
            // Check debunked criteria
            else if (
                rumor.score_below_25_since &&
                new Date(rumor.score_below_25_since) <= fortyEightHoursAgo
            ) {
                canResolve = true;
                reason = "Score ≤ 0.25 for 48+ hours";
                expectedStatus = "Debunked";
            }
            // Check inconclusive criteria
            else if (
                new Date(rumor.created_at) <= sevenDaysAgo &&
                rumor.trust_score > 0.25 &&
                rumor.trust_score < 0.75
            ) {
                canResolve = true;
                reason = "Age > 7 days AND score in range 0.25-0.75";
                expectedStatus = "Inconclusive";
            } else {
                // Explain why it can't resolve
                if (rumor.trust_score >= 0.75) {
                    if (!rumor.score_above_75_since) {
                        reason = "Score ≥ 0.75 but timestamp not set yet";
                    } else {
                        const hoursAbove =
                            (now.getTime() -
                                new Date(rumor.score_above_75_since).getTime()) /
                            (1000 * 60 * 60);
                        reason = `Score ≥ 0.75 for only ${hoursAbove.toFixed(1)} hours (need 48)`;
                    }
                } else if (rumor.trust_score <= 0.25) {
                    if (!rumor.score_below_25_since) {
                        reason = "Score ≤ 0.25 but timestamp not set yet";
                    } else {
                        const hoursBelow =
                            (now.getTime() -
                                new Date(rumor.score_below_25_since).getTime()) /
                            (1000 * 60 * 60);
                        reason = `Score ≤ 0.25 for only ${hoursBelow.toFixed(1)} hours (need 48)`;
                    }
                } else {
                    const ageInDays =
                        (now.getTime() - new Date(rumor.created_at).getTime()) /
                        (1000 * 60 * 60 * 24);
                    reason = `Score in range 0.25-0.75, age ${ageInDays.toFixed(1)} days (need 7)`;
                }
            }

            return {
                id: rumor.id,
                content: rumor.content.substring(0, 50) + "...",
                trustScore: rumor.trust_score,
                canResolve,
                reason,
                expectedStatus,
                createdAt: rumor.created_at,
                scoreAbove75Since: rumor.score_above_75_since,
                scoreBelow25Since: rumor.score_below_25_since,
            };
        });

        return res.json({
            total: candidates?.length || 0,
            canResolve: candidates?.filter((c) => c.canResolve).length || 0,
            candidates: candidates || [],
        });
    } catch (error) {
        console.error("Error in resolution-candidates:", error);
        return res.status(500).json({
            error: "Failed to get candidates",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
