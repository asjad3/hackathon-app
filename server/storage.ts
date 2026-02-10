import { supabase, type Rumor, type Evidence, type AuditLog } from "./supabase.js";
import { createHash } from "crypto";

type RumorStatus = "Active" | "Verified" | "Debunked" | "Inconclusive";

export interface RumorWithCount extends Rumor {
    evidence_count: number;
}

export interface EvidenceWithVotes extends Evidence {
    helpful_votes: number;
    misleading_votes: number;
}

export interface RumorDetail extends Rumor {
    evidence: EvidenceWithVotes[];
    history: AuditLog[];
}

export interface IStorage {
    // Rumors
    getRumors(): Promise<RumorWithCount[]>;
    getRumor(id: string): Promise<RumorDetail | null>;
    createRumor(content: string, imageUrl?: string | null, posterDepartment?: string | null): Promise<Rumor>;

    // Evidence
    createEvidence(data: {
        rumorId: string;
        evidenceType: "support" | "dispute";
        contentType: "link" | "image" | "text";
        contentUrl?: string;
        contentText?: string;
        creatorHash: string;
        creatorDepartment?: string | null;
    }): Promise<Evidence>;

    // Votes & Scoring
    createVote(data: {
        evidenceId: string;
        userId: string;
        isHelpful: boolean;
        stakeAmount?: number;
    }): Promise<{
        success: boolean;
        newTrustScore?: number;
        newStatus?: string;
        error?: string;
    }>;

    createRumorVote(data: {
        rumorId: string;
        userId: string;
        voteType: "verify" | "debunk";
        stakeAmount?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;

    // User Management
    getOrCreateUser(voteHash: string): Promise<import("./supabase").User>;
    getUserStats(voteHash: string): Promise<{
        reputation: number;
        totalPoints: number;
        pointsStaked: number;
        correctVotes: number;
        totalVotes: number;
    } | null>;

    // Resolution
    resolveRumor(
        rumorId: string,
        finalStatus: "Verified" | "Debunked" | "Inconclusive",
    ): Promise<number>;
    checkAndResolveRumors(): Promise<{
        resolved: number;
        rumors: Array<{
            rumorId: string;
            newStatus: string;
            votersUpdated: number;
        }>;
    }>;

    // Rumor Relationships (DAG)
    createRumorRelationship(data: {
        parentRumorId: string;
        childRumorId: string;
        relationshipType: string;
    }): Promise<{
        success: boolean;
        relationship?: any;
        error?: string;
    }>;
    getRumorRelationships(rumorId: string): Promise<any[]>;
    getRumorGraph(rumorId: string): Promise<{
        nodes: Array<{
            id: string;
            content: string;
            status: string;
            trustScore: number;
        }>;
        edges: Array<{ source: string; target: string; type: string }>;
    }>;
}

export class DatabaseStorage implements IStorage {
    async getRumors(): Promise<RumorWithCount[]> {
        // Get all rumors
        const { data: rumors, error } = await supabase
            .from("rumors")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        if (!rumors) return [];

        // Get evidence counts for each rumor
        const rumorsWithCounts = await Promise.all(
            rumors.map(async (rumor) => {
                const { count } = await supabase
                    .from("evidence")
                    .select("*", { count: "exact", head: true })
                    .eq("rumor_id", rumor.id);

                return {
                    ...rumor,
                    evidence_count: count || 0,
                    // Map new AI fields to old field names for backward compatibility
                    summary: rumor.ai_summary || rumor.summary || null,
                    content_warning:
                        rumor.has_harmful_content ||
                        rumor.content_warning ||
                        false,
                };
            }),
        );

        return rumorsWithCounts;
    }

    async getRumor(id: string): Promise<RumorDetail | null> {
        // Get rumor
        const { data: rumor, error: rumorError } = await supabase
            .from("rumors")
            .select("*")
            .eq("id", id)
            .single();

        if (rumorError || !rumor) return null;

        // Debug: Log what fields Supabase returns
        console.log("[getRumor] Fields from Supabase:", Object.keys(rumor));
        console.log("[getRumor] ai_summary:", rumor.ai_summary);
        console.log("[getRumor] summary:", rumor.summary);
        console.log(
            "[getRumor] has_harmful_content:",
            rumor.has_harmful_content,
        );
        console.log("[getRumor] content_warning:", rumor.content_warning);

        // Get evidence with vote counts
        const { data: evidenceList, error: evidenceError } = await supabase
            .from("evidence")
            .select("*")
            .eq("rumor_id", id);

        if (evidenceError) throw evidenceError;

        const evidenceWithVotes: EvidenceWithVotes[] = await Promise.all(
            (evidenceList || []).map(async (ev) => {
                const { count: helpful } = await supabase
                    .from("evidence_votes")
                    .select("*", { count: "exact", head: true })
                    .eq("evidence_id", ev.id)
                    .eq("vote_type", "helpful");

                const { count: misleading } = await supabase
                    .from("evidence_votes")
                    .select("*", { count: "exact", head: true })
                    .eq("evidence_id", ev.id)
                    .eq("vote_type", "misleading");

                return {
                    ...ev,
                    helpful_votes: helpful || 0,
                    misleading_votes: misleading || 0,
                };
            }),
        );

        // Get audit history
        const { data: history, error: historyError } = await supabase
            .from("audit_log")
            .select("*")
            .eq("rumor_id", id)
            .order("created_at", { ascending: false });

        if (historyError) throw historyError;

        return {
            ...rumor,
            evidence: evidenceWithVotes,
            history: history || [],
            // Map new AI fields to old field names for backward compatibility
            summary: rumor.ai_summary || rumor.summary || null,
            content_warning:
                rumor.has_harmful_content || rumor.content_warning || false,
        };
    }

    async createRumor(
        content: string,
        imageUrl?: string | null,
        posterDepartment?: string | null,
    ): Promise<Rumor> {
        console.log("[Storage] Creating rumor with AI analysis...");

        // 🤖 Run AI analysis synchronously BEFORE saving
        const { analyzeRumor } = await import("./ai/analyzer.js");
        const createdAt = new Date().toISOString();

        let aiAnalysis;
        try {
            aiAnalysis = await analyzeRumor(content, createdAt);
            console.log("[Storage] ✅ AI analysis completed:", {
                hasSummary: !!aiAnalysis.summary,
                isTimeBound: aiAnalysis.isTimeBound,
                hasHarmful: aiAnalysis.hasHarmfulContent,
            });
        } catch (error) {
            console.error(
                "[Storage] ⚠️ AI analysis failed, using defaults:",
                error,
            );
            // If AI fails, continue with empty analysis
            aiAnalysis = {
                summary: null,
                isTimeBound: false,
                expiryDate: null,
                censoredContent: null,
                hasHarmfulContent: false,
                analysisMetadata: {
                    processingTime: 0,
                    model: "fallback",
                    confidence: "low" as const,
                },
            };
        }

        // 💾 Save rumor with AI analysis results
        const insertData: Record<string, any> = {
            content,
            image_url: imageUrl || null,
            // AI analysis fields
            ai_summary: aiAnalysis.summary,
            summary: aiAnalysis.summary, // Backward compatibility
            is_time_bound: aiAnalysis.isTimeBound,
            expiry_date: aiAnalysis.expiryDate,
            censored_content: aiAnalysis.censoredContent,
            has_harmful_content: aiAnalysis.hasHarmfulContent,
            ai_confidence: aiAnalysis.analysisMetadata.confidence,
            ai_processed_at: new Date().toISOString(),
        };

        // Add poster department if available (column may not exist yet)
        if (posterDepartment) {
            insertData.poster_department = posterDepartment;
        }

        const { data, error } = await supabase
            .from("rumors")
            .insert(insertData)
            .select()
            .single();

        // If poster_department column doesn't exist, retry without it
        if (error && error.message?.includes('poster_department')) {
            delete insertData.poster_department;
            const retry = await supabase
                .from("rumors")
                .insert(insertData)
                .select()
                .single();
            if (retry.error) throw retry.error;
            console.log(`[Storage] ✅ Rumor created successfully: ${retry.data.id}`);
            return retry.data;
        }

        if (error) throw error;

        console.log(`[Storage] ✅ Rumor created successfully: ${data.id}`);

        return data;
    }

    async createEvidence(data: {
        rumorId: string;
        evidenceType: "support" | "dispute";
        contentType: "link" | "image" | "text";
        contentUrl?: string;
        contentText?: string;
        creatorHash: string;
        creatorDepartment?: string | null;
    }): Promise<Evidence> {
        const insertData: Record<string, any> = {
            rumor_id: data.rumorId,
            evidence_type: data.evidenceType,
            content_type: data.contentType,
            content_url: data.contentUrl || null,
            content_text: data.contentText || null,
            creator_hash: data.creatorHash,
        };

        if (data.creatorDepartment) {
            insertData.creator_department = data.creatorDepartment;
        }

        const { data: evidence, error } = await supabase
            .from("evidence")
            .insert(insertData)
            .select()
            .single();

        // If creator_department column doesn't exist, retry without it
        if (error && error.message?.includes('creator_department')) {
            delete insertData.creator_department;
            const retry = await supabase
                .from("evidence")
                .insert(insertData)
                .select()
                .single();
            if (retry.error) throw retry.error;
            return retry.data;
        }

        if (error) throw error;
        return evidence;
    }

    async createVote(data: {
        evidenceId: string;
        userId: string;
        isHelpful: boolean;
        stakeAmount?: number;
    }): Promise<{
        success: boolean;
        newTrustScore?: number;
        newStatus?: string;
        error?: string;
    }> {
        try {
            const stake = data.stakeAmount || 1; // Default stake is 1 point

            const salt = process.env.VOTE_SALT || "HACKATHON_SECRET_SALT_2026";

            // 1. Generate user hash (consistent across all votes for this user)
            const userHash = createHash("sha256")
                .update(`${data.userId}:${salt}`)
                .digest("hex");

            // 2. Generate vote hash (unique per evidence to prevent duplicates)
            const voteHash = createHash("sha256")
                .update(`${data.userId}:${salt}:${data.evidenceId}`)
                .digest("hex");

            // 3. Get or create user (using consistent user hash)
            const user = await this.getOrCreateUser(userHash);

            // 4. Get evidence details to check rumor status
            const { data: evidence } = await supabase
                .from("evidence")
                .select("*, rumor_id")
                .eq("id", data.evidenceId)
                .single();

            if (!evidence) throw new Error("Evidence not found");

            // 5. Check if rumor is expired or resolved
            const { data: rumor } = await supabase
                .from("rumors")
                .select("status, expiry_date")
                .eq("id", evidence.rumor_id)
                .single();

            if (!rumor) throw new Error("Rumor not found");

            // Check if rumor has expired
            if (rumor.expiry_date) {
                const expiryDate = new Date(rumor.expiry_date);
                const now = new Date();
                if (now >= expiryDate) {
                    // Auto-resolve the expired rumor
                    await this.resolveExpiredRumor(evidence.rumor_id);
                    return {
                        success: false,
                        error: "This rumor has expired and can no longer be voted on. It has been automatically resolved.",
                    };
                }
            }

            // Check if rumor is already resolved
            if (rumor.status !== "Active") {
                return {
                    success: false,
                    error: `This rumor has been ${rumor.status.toLowerCase()} and is no longer accepting votes.`,
                };
            }

            // 6. Check if user has enough points
            const availablePoints = user.total_points - user.points_staked;
            if (availablePoints < stake) {
                return {
                    success: false,
                    error: `Insufficient points. You have ${availablePoints} available, but need ${stake} to stake.`,
                };
            }

            // 7. Check for duplicate vote (using vote hash with evidence ID)
            const { data: existing, error: checkError } = await supabase
                .from("evidence_votes")
                .select("id")
                .eq("vote_hash", voteHash)
                .maybeSingle();

            if (checkError && checkError.code !== "PGRST116") {
                // PGRST116 = no rows found, which is OK
                throw checkError;
            }

            if (existing) {
                return {
                    success: false,
                    error: "You have already voted on this evidence",
                };
            }

            // 6. Get evidence details again for vote_outcomes and creator check
            const { data: evidenceDetails } = await supabase
                .from("evidence")
                .select("*, rumor_id")
                .eq("id", data.evidenceId)
                .single();

            if (!evidenceDetails) throw new Error("Evidence not found");

            // 7. Check if user is trying to vote on their own evidence
            const userCreatorHash = createHash("sha256")
                .update(`${data.userId}:${salt}:creator`)
                .digest("hex");

            if (evidenceDetails.creator_hash === userCreatorHash) {
                return {
                    success: false,
                    error: "You cannot vote on your own evidence",
                };
            }

            // 8. Calculate evidence quality (for vote weight)
            const helpfulCount = evidenceDetails.helpful_count || 0;
            const misleadingCount = evidenceDetails.misleading_count || 0;
            const totalVotes = helpfulCount + misleadingCount;
            const evidenceQuality =
                totalVotes > 0 ? helpfulCount / totalVotes : 0.5;

            // 9. Calculate vote weight: reputation × (1 + evidence_quality) × stake
            const voteWeight = user.reputation * (1 + evidenceQuality) * stake;

            // 10. Check bot behavior (timing pattern, using user hash)
            await this.checkBotBehavior(userHash);

            // 11. Insert vote with weight and reputation snapshot (using vote hash for duplicates)
            const voteType = data.isHelpful ? "helpful" : "misleading";
            const { error: voteError } = await supabase
                .from("evidence_votes")
                .insert({
                    evidence_id: data.evidenceId,
                    vote_hash: voteHash,
                    vote_type: voteType,
                    vote_weight: voteWeight,
                    stake_amount: stake,
                    voter_reputation: user.reputation,
                });

            if (voteError) throw voteError;

            // 12. Create vote outcome record (using user hash for later resolution)
            await supabase.from("vote_outcomes").insert({
                vote_hash: userHash,
                rumor_id: evidenceDetails.rumor_id,
                evidence_id: data.evidenceId,
                vote_type: voteType,
                stake_amount: stake,
            });

            // 13. Update user's staked points (using consistent user hash)
            await supabase
                .from("users")
                .update({
                    points_staked: user.points_staked + stake,
                    updated_at: new Date().toISOString(),
                })
                .eq("vote_hash", userHash);

            // 14. Update evidence vote counts
            const field = data.isHelpful ? "helpful_count" : "misleading_count";
            const newCount = (evidenceDetails[field] || 0) + 1;

            await supabase
                .from("evidence")
                .update({ [field]: newCount })
                .eq("id", data.evidenceId);

            // 15. Update agreement correlation (bot detection, using user hash)
            await this.updateAgreementCorrelation(
                userHash,
                data.evidenceId,
                voteType,
            );

            // 16. Recalculate rumor trust score
            const result = await this.updateRumorScore(evidenceDetails.rumor_id);

            return {
                success: true,
                newTrustScore: result.newScore,
                newStatus: result.newStatus,
            };
        } catch (err) {
            console.error("Vote creation error:", err);
            return {
                success: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to create vote",
            };
        }
    }

    async createRumorVote(data: {
        rumorId: string;
        userId: string;
        voteType: "verify" | "debunk";
        stakeAmount?: number;
    }): Promise<{
        success: boolean;
        newTrustScore?: number;
        newStatus?: string;
        error?: string;
    }> {
        try {
            const stake = data.stakeAmount || 1;
            const salt = process.env.VOTE_SALT || "HACKATHON_SECRET_SALT_2026";

            // Generate user hash (consistent across all votes)
            const userHash = createHash("sha256")
                .update(`${data.userId}:${salt}`)
                .digest("hex");

            // Get or create user
            const user = await this.getOrCreateUser(userHash);

            // Check if rumor exists and get its status and expiry
            const { data: rumor } = await supabase
                .from("rumors")
                .select("status, expiry_date, trust_score")
                .eq("id", data.rumorId)
                .single();

            if (!rumor) {
                return {
                    success: false,
                    error: "Rumor not found",
                };
            }

            // Check if rumor has expired
            if (rumor.expiry_date) {
                const expiryDate = new Date(rumor.expiry_date);
                const now = new Date();
                if (now >= expiryDate) {
                    // Auto-resolve the expired rumor
                    await this.resolveExpiredRumor(data.rumorId);
                    return {
                        success: false,
                        error: "This rumor has expired and can no longer be voted on. It has been automatically resolved.",
                    };
                }
            }

            // Check if rumor is already resolved
            if (rumor.status !== "Active") {
                return {
                    success: false,
                    error: `This rumor has been ${rumor.status.toLowerCase()} and is no longer accepting votes.`,
                };
            }

            // Check available points
            const availablePoints = user.total_points - user.points_staked;
            if (availablePoints < stake) {
                return {
                    success: false,
                    error: `Insufficient points. You have ${availablePoints} available, but need ${stake} to stake.`,
                };
            }

            // Check for duplicate vote
            const { data: existing } = await supabase
                .from("rumor_votes")
                .select("id")
                .eq("rumor_id", data.rumorId)
                .eq("vote_hash", userHash)
                .maybeSingle();

            if (existing) {
                return {
                    success: false,
                    error: "You have already voted on this rumor",
                };
            }

            // Calculate user credibility based on total tokens
            // Users with more tokens have higher credibility (but diminishing returns)
            // Formula: credibility = log(1 + total_points) / log(1 + 10000)
            // This gives 0-1 scale where 10000 tokens = 1.0 credibility
            const userCredibility = Math.log(1 + user.total_points) / Math.log(1 + 10000);

            // Calculate vote weight: base_reputation × user_credibility × stake
            // This means:
            // - User's proven reputation (from past correct votes)
            // - User's wealth/credibility (total tokens)
            // - Amount they're willing to risk (stake)
            const voteWeight = user.reputation * userCredibility * stake;

            console.log('[RumorVote] Vote weight calculation:', {
                userId: data.userId.slice(0, 8),
                reputation: user.reputation,
                totalPoints: user.total_points,
                userCredibility: userCredibility.toFixed(3),
                stake,
                finalWeight: voteWeight.toFixed(3),
                voteType: data.voteType,
            });

            // Insert vote
            const { error: voteError } = await supabase
                .from("rumor_votes")
                .insert({
                    rumor_id: data.rumorId,
                    vote_hash: userHash,
                    vote_type: data.voteType,
                    stake_amount: stake,
                    voter_reputation: user.reputation,
                    vote_weight: voteWeight,
                    user_credibility: userCredibility,
                });

            if (voteError) throw voteError;

            // Update user's staked points
            await supabase
                .from("users")
                .update({
                    points_staked: user.points_staked + stake,
                    updated_at: new Date().toISOString(),
                })
                .eq("vote_hash", userHash);

            // Bot detection
            await this.checkBotBehavior(userHash);

            // Recalculate rumor trust score
            const result = await this.updateRumorScore(data.rumorId);

            return {
                success: true,
                newTrustScore: result.newScore,
                newStatus: result.newStatus,
            };
        } catch (err) {
            console.error("Rumor vote creation error:", err);
            return {
                success: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to create rumor vote",
            };
        }
    }

    private async checkBotBehavior(voteHash: string): Promise<void> {
        // Get or create user fingerprint
        const { data: fingerprint } = await supabase
            .from("user_fingerprints")
            .select("*")
            .eq("vote_hash", voteHash)
            .single();

        const now = Date.now();

        if (!fingerprint) {
            // Create new fingerprint
            await supabase.from("user_fingerprints").insert({
                vote_hash: voteHash,
                vote_count: 1,
            });
            return;
        }

        // Check timing pattern - get recent votes via vote_outcomes (which uses the consistent user hash)
        const { data: recentVotes } = await supabase
            .from("vote_outcomes")
            .select("created_at")
            .eq("vote_hash", voteHash)
            .order("created_at", { ascending: false })
            .limit(5);

        if (recentVotes && recentVotes.length >= 2) {
            const lastVoteTime = new Date(recentVotes[0].created_at).getTime();
            const secondLastTime = new Date(
                recentVotes[1].created_at,
            ).getTime();
            const timeDiff = (now - lastVoteTime) / 1000; // seconds

            if (timeDiff < 2) {
                console.warn(
                    `⚠️ BOT FLAG: Rapid voting detected for hash ${voteHash.substring(0, 8)}...`,
                );

                // Add bot flag
                const currentFlags = fingerprint.bot_flags || [];
                await supabase
                    .from("user_fingerprints")
                    .update({
                        bot_flags: [
                            ...currentFlags,
                            {
                                type: "rapid_voting",
                                timestamp: new Date().toISOString(),
                            },
                        ],
                        is_suspicious: true,
                    })
                    .eq("vote_hash", voteHash);
            }
        }

        // Update vote count
        await supabase
            .from("user_fingerprints")
            .update({ vote_count: fingerprint.vote_count + 1 })
            .eq("vote_hash", voteHash);
    }

    private async updateRumorScore(
        rumorId: string,
    ): Promise<{ newScore: number; newStatus: RumorStatus }> {
        // Get current rumor
        const { data: rumor } = await supabase
            .from("rumors")
            .select("trust_score, score_above_75_since, score_below_25_since")
            .eq("id", rumorId)
            .single();

        if (!rumor) throw new Error("Rumor not found");

        const oldScore = rumor.trust_score;

        // Calculate Bayesian score using both EVIDENCE votes and DIRECT RUMOR votes
        let alpha = 1.0; // Prior for supporting/verify
        let beta = 1.0; // Prior for disputing/debunk

        // PART 1: Process Evidence Votes (existing logic)
        const { data: evidenceList } = await supabase
            .from("evidence")
            .select("*")
            .eq("rumor_id", rumorId);

        if (evidenceList && evidenceList.length > 0) {
            for (const ev of evidenceList) {
                // Fetch individual votes with their weights for this evidence
                const { data: votes } = await supabase
                    .from("evidence_votes")
                    .select("vote_type, vote_weight")
                    .eq("evidence_id", ev.id);

                if (!votes || votes.length === 0) continue;

                // Sum weighted helpful and misleading votes
                let weightedHelpful = 0;
                let weightedMisleading = 0;
                for (const v of votes) {
                    if (v.vote_type === "helpful") {
                        weightedHelpful += v.vote_weight || 1;
                    } else {
                        weightedMisleading += v.vote_weight || 1;
                    }
                }

                const netWeight = weightedHelpful - weightedMisleading;

                // Only count evidence that the community trusts (positive net weight)
                if (netWeight > 0) {
                    // Apply log scaling to cap mob influence
                    const weight = 1 + Math.log(Math.max(1, netWeight));

                    if (ev.evidence_type === "support") {
                        alpha += weight;
                    } else if (ev.evidence_type === "dispute") {
                        beta += weight;
                    }
                }
            }
        }

        // PART 2: Process Direct Rumor Votes (NEW - weighted by user credibility and stake)
        const { data: rumorVotes } = await supabase
            .from("rumor_votes")
            .select("vote_type, vote_weight, user_credibility, stake_amount, voter_reputation")
            .eq("rumor_id", rumorId);

        if (rumorVotes && rumorVotes.length > 0) {
            let totalVerifyWeight = 0;
            let totalDebunkWeight = 0;

            for (const vote of rumorVotes) {
                const weight = vote.vote_weight || 1;
                if (vote.vote_type === "verify") {
                    totalVerifyWeight += weight;
                } else if (vote.vote_type === "debunk") {
                    totalDebunkWeight += weight;
                }
            }

            // Apply logarithmic scaling to prevent whale dominance
            // This gives more weight to initial votes and diminishing returns for later ones
            if (totalVerifyWeight > 0) {
                const verifyContribution = 1 + Math.log(1 + totalVerifyWeight);
                alpha += verifyContribution;
                console.log('[TrustScore] Verify votes contribution:', {
                    totalWeight: totalVerifyWeight.toFixed(2),
                    contribution: verifyContribution.toFixed(2),
                });
            }

            if (totalDebunkWeight > 0) {
                const debunkContribution = 1 + Math.log(1 + totalDebunkWeight);
                beta += debunkContribution;
                console.log('[TrustScore] Debunk votes contribution:', {
                    totalWeight: totalDebunkWeight.toFixed(2),
                    contribution: debunkContribution.toFixed(2),
                });
            }
        }

        // Calculate new score (Beta distribution mean)
        const newScore = alpha / (alpha + beta);

        console.log('[TrustScore] Final calculation:', {
            rumorId: rumorId.slice(0, 8),
            alpha: alpha.toFixed(2),
            beta: beta.toFixed(2),
            oldScore: oldScore.toFixed(3),
            newScore: newScore.toFixed(3),
            change: (newScore - oldScore).toFixed(3),
        });

        // Status stays Active — only the resolution cron sets final Verified/Debunked/Inconclusive
        // This prevents premature resolution and ensures the 48h threshold is enforced
        let newStatus: RumorStatus = "Active";

        // Track time-based thresholds for resolution
        const now = new Date().toISOString();
        const updates: any = {
            trust_score: newScore,
            status: newStatus,
            updated_at: now,
        };

        // Track when score crosses 0.75 threshold
        if (newScore >= 0.75 && !rumor.score_above_75_since) {
            updates.score_above_75_since = now;
        } else if (newScore < 0.75 && rumor.score_above_75_since) {
            updates.score_above_75_since = null; // Reset if drops below
        }

        // Track when score crosses 0.25 threshold
        if (newScore <= 0.25 && !rumor.score_below_25_since) {
            updates.score_below_25_since = now;
        } else if (newScore > 0.25 && rumor.score_below_25_since) {
            updates.score_below_25_since = null; // Reset if rises above
        }

        // Update rumor
        await supabase.from("rumors").update(updates).eq("id", rumorId);

        // Log to audit trail
        await supabase.from("audit_log").insert({
            rumor_id: rumorId,
            event_type: "score_update",
            old_score: oldScore,
            new_score: newScore,
            metadata: { alpha, beta, threshold: newStatus },
        });

        return { newScore, newStatus };
    }

    // ============================================
    // USER MANAGEMENT & REPUTATION
    // ============================================

    async getOrCreateUser(
        voteHash: string,
    ): Promise<import("./supabase").User> {
        // Try to get existing user
        const { data: existing } = await supabase
            .from("users")
            .select("*")
            .eq("vote_hash", voteHash)
            .maybeSingle();

        if (existing) {
            return existing;
        }

        // Create new user with default values
        const { data: newUser, error } = await supabase
            .from("users")
            .insert({
                vote_hash: voteHash,
                reputation: 0.5, // Laplace smoothing: (0 + 1) / (0 + 2) = 0.5
                correct_votes: 0,
                total_votes: 0,
                total_points: 100, // Starting points
                points_staked: 0,
                bot_flag_score: 0.0,
                is_suspicious: false,
            })
            .select()
            .single();

        if (error) throw error;
        return newUser;
    }

    async getUserStats(voteHash: string): Promise<{
        reputation: number;
        totalPoints: number;
        pointsStaked: number;
        correctVotes: number;
        totalVotes: number;
    } | null> {
        const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("vote_hash", voteHash)
            .maybeSingle();

        if (!user) return null;

        return {
            reputation: user.reputation,
            totalPoints: user.total_points,
            pointsStaked: user.points_staked,
            correctVotes: user.correct_votes,
            totalVotes: user.total_votes,
        };
    }

    // ============================================
    // BOT DETECTION - AGREEMENT CORRELATION
    // ============================================

    private async updateAgreementCorrelation(
        voteHash: string,
        evidenceId: string,
        voteType: string,
    ): Promise<void> {
        // Get all other votes on this evidence via vote_outcomes (which stores consistent user hashes)
        const { data: otherVotes } = await supabase
            .from("vote_outcomes")
            .select("vote_hash, vote_type")
            .eq("evidence_id", evidenceId)
            .neq("vote_hash", voteHash);

        if (!otherVotes || otherVotes.length === 0) return;

        // Update agreement with each other voter
        for (const otherVote of otherVotes) {
            const agreed = otherVote.vote_type === voteType;

            // Ensure consistent ordering for the pair
            const [hash1, hash2] =
                voteHash < otherVote.vote_hash
                    ? [voteHash, otherVote.vote_hash]
                    : [otherVote.vote_hash, voteHash];

            // Get or create agreement record
            const { data: existing } = await supabase
                .from("vote_agreements")
                .select("*")
                .eq("vote_hash_1", hash1)
                .eq("vote_hash_2", hash2)
                .maybeSingle();

            if (existing) {
                // Update existing agreement
                const newTotal = existing.total_shared_votes + 1;
                const newAgreement =
                    existing.agreement_count + (agreed ? 1 : 0);
                const newRate = newAgreement / newTotal;

                await supabase
                    .from("vote_agreements")
                    .update({
                        total_shared_votes: newTotal,
                        agreement_count: newAgreement,
                        agreement_rate: newRate,
                        last_updated: new Date().toISOString(),
                    })
                    .eq("vote_hash_1", hash1)
                    .eq("vote_hash_2", hash2);

                // If agreement rate > 90%, flag both users
                if (newRate > 0.9 && newTotal >= 10) {
                    await this.flagHighAgreement(hash1, hash2, newRate);
                }
            } else {
                // Create new agreement record
                await supabase.from("vote_agreements").insert({
                    vote_hash_1: hash1,
                    vote_hash_2: hash2,
                    total_shared_votes: 1,
                    agreement_count: agreed ? 1 : 0,
                    agreement_rate: agreed ? 1.0 : 0.0,
                });
            }
        }
    }

    private async flagHighAgreement(
        hash1: string,
        hash2: string,
        rate: number,
    ): Promise<void> {
        console.warn(
            `⚠️ BOT FLAG: High agreement detected (${(rate * 100).toFixed(1)}%) between users`,
        );

        // Apply down-weight factor to both users
        const downWeightFactor = 0.1; // Reduce vote weight to 10%

        for (const hash of [hash1, hash2]) {
            const { data: fingerprint } = await supabase
                .from("user_fingerprints")
                .select("*")
                .eq("vote_hash", hash)
                .maybeSingle();

            if (fingerprint) {
                const currentFlags = fingerprint.agreement_flags || [];
                await supabase
                    .from("user_fingerprints")
                    .update({
                        agreement_flags: [
                            ...currentFlags,
                            {
                                type: "high_agreement",
                                rate,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                        down_weight_factor: downWeightFactor,
                        is_suspicious: true,
                    })
                    .eq("vote_hash", hash);
            }
        }
    }

    // ============================================
    // TIME-BASED RESOLUTION
    // ============================================

    async resolveRumor(
        rumorId: string,
        finalStatus: "Verified" | "Debunked" | "Inconclusive",
    ): Promise<number> {
        console.log(
            `[Resolution] Resolving rumor ${rumorId} as ${finalStatus}`,
        );

        // 1. Update rumor status
        await supabase
            .from("rumors")
            .update({
                status: finalStatus,
                resolution_pending: false,
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", rumorId);

        // 2. Get all vote outcomes for this rumor
        const { data: voteOutcomes } = await supabase
            .from("vote_outcomes")
            .select("*")
            .eq("rumor_id", rumorId)
            .is("was_correct", null); // Only unresolved votes

        if (!voteOutcomes || voteOutcomes.length === 0) return 0;

        let votersUpdated = 0;

        // 3. Determine correctness for each vote
        for (const outcome of voteOutcomes) {
            // Get the evidence this vote was on
            const { data: evidence } = await supabase
                .from("evidence")
                .select("evidence_type")
                .eq("id", outcome.evidence_id)
                .single();

            if (!evidence) continue;

            // Determine if vote was correct
            let wasCorrect: boolean | null = false;

            if (finalStatus === "Verified") {
                // Supporting evidence votes were correct
                wasCorrect =
                    (evidence.evidence_type === "support" &&
                        outcome.vote_type === "helpful") ||
                    (evidence.evidence_type === "dispute" &&
                        outcome.vote_type === "misleading");
            } else if (finalStatus === "Debunked") {
                // Disputing evidence votes were correct
                wasCorrect =
                    (evidence.evidence_type === "dispute" &&
                        outcome.vote_type === "helpful") ||
                    (evidence.evidence_type === "support" &&
                        outcome.vote_type === "misleading");
            } else {
                // Inconclusive - no one wins or loses
                wasCorrect = null;
            }

            // 4. Calculate points gained/lost
            // NOTE: When user staked, we only incremented points_staked (a lock).
            // total_points was NOT reduced. So on resolution:
            //   - correct: unlock stake (reduce points_staked) + add bonus to total_points
            //   - incorrect: deduct stake from total_points + unlock (reduce points_staked)
            //   - inconclusive: just unlock stake (reduce points_staked), no change to total_points
            let pointsGained = 0;
            let pointsLost = 0;

            if (wasCorrect === true) {
                // Correct vote: bonus = max(1, floor(stake * 0.2)) — always at least 1 point
                pointsGained = Math.max(
                    1,
                    Math.floor(outcome.stake_amount * 0.2),
                );
            } else if (wasCorrect === false) {
                // Incorrect vote: lose the staked amount from total_points
                pointsLost = outcome.stake_amount;
            } else {
                // Inconclusive: no bonus, no penalty — stake just gets unlocked
                pointsGained = 0;
            }

            // 5. Update vote outcome
            await supabase
                .from("vote_outcomes")
                .update({
                    was_correct: wasCorrect,
                    points_gained: pointsGained,
                    points_lost: pointsLost,
                    resolved_at: new Date().toISOString(),
                })
                .eq("id", outcome.id);

            // 6. Update user stats
            const { data: user } = await supabase
                .from("users")
                .select("*")
                .eq("vote_hash", outcome.vote_hash)
                .single();

            if (user) {
                const newTotalVotes = user.total_votes + 1;
                const newCorrectVotes =
                    user.correct_votes + (wasCorrect === true ? 1 : 0);
                const newReputation =
                    (newCorrectVotes + 1) / (newTotalVotes + 2); // Laplace smoothing
                const newTotalPoints =
                    user.total_points + pointsGained - pointsLost;
                const newPointsStaked =
                    user.points_staked - outcome.stake_amount;

                await supabase
                    .from("users")
                    .update({
                        total_votes: newTotalVotes,
                        correct_votes: newCorrectVotes,
                        reputation: newReputation,
                        total_points: newTotalPoints,
                        points_staked: newPointsStaked,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("vote_hash", outcome.vote_hash);

                console.log(
                    `[Resolution] Updated user ${outcome.vote_hash.substring(0, 8)}... - Reputation: ${newReputation.toFixed(3)}, Points: ${newTotalPoints}`,
                );
                votersUpdated++;
            }
        }

        // 7. Resolve direct rumor votes
        const { data: rumorVotes } = await supabase
            .from("rumor_votes")
            .select("*")
            .eq("rumor_id", rumorId)
            .is("was_correct", null);

        if (rumorVotes && rumorVotes.length > 0) {
            for (const vote of rumorVotes) {
                // Determine if vote was correct
                let wasCorrect: boolean | null = false;

                if (finalStatus === "Verified") {
                    wasCorrect = vote.vote_type === "verify";
                } else if (finalStatus === "Debunked") {
                    wasCorrect = vote.vote_type === "debunk";
                } else {
                    // Inconclusive
                    wasCorrect = null;
                }

                // Calculate points
                let pointsGained = 0;
                let pointsLost = 0;

                if (wasCorrect === true) {
                    pointsGained = Math.max(
                        1,
                        Math.floor(vote.stake_amount * 0.2),
                    );
                } else if (wasCorrect === false) {
                    pointsLost = vote.stake_amount;
                }

                // Update rumor vote
                await supabase
                    .from("rumor_votes")
                    .update({
                        was_correct: wasCorrect,
                        points_gained: pointsGained,
                        points_lost: pointsLost,
                        resolved_at: new Date().toISOString(),
                    })
                    .eq("id", vote.id);

                // Update user stats
                const { data: user } = await supabase
                    .from("users")
                    .select("*")
                    .eq("vote_hash", vote.vote_hash)
                    .single();

                if (user) {
                    const newTotalVotes = user.total_votes + 1;
                    const newCorrectVotes =
                        user.correct_votes + (wasCorrect === true ? 1 : 0);
                    const newReputation =
                        (newCorrectVotes + 1) / (newTotalVotes + 2);
                    const newTotalPoints =
                        user.total_points + pointsGained - pointsLost;
                    const newPointsStaked =
                        user.points_staked - vote.stake_amount;

                    await supabase
                        .from("users")
                        .update({
                            total_votes: newTotalVotes,
                            correct_votes: newCorrectVotes,
                            reputation: newReputation,
                            total_points: newTotalPoints,
                            points_staked: newPointsStaked,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("vote_hash", vote.vote_hash);

                    votersUpdated++;
                }
            }
        }

        // 8. Log resolution to audit trail
        await supabase.from("audit_log").insert({
            rumor_id: rumorId,
            event_type: "resolution",
            metadata: {
                final_status: finalStatus,
                votes_resolved: voteOutcomes.length,
            },
        });

        console.log(
            `[Resolution] Resolved rumor ${rumorId} - Updated ${votersUpdated} voters`,
        );

        return votersUpdated;
    }

    /**
     * Resolve an expired rumor based on its current trust score
     */
    async resolveExpiredRumor(rumorId: string): Promise<void> {
        console.log(`[ResolveExpired] Resolving expired rumor: ${rumorId.slice(0, 8)}`);

        // Get current rumor
        const { data: rumor } = await supabase
            .from("rumors")
            .select("trust_score, status")
            .eq("id", rumorId)
            .single();

        if (!rumor || rumor.status !== "Active") {
            console.log(`[ResolveExpired] Rumor ${rumorId.slice(0, 8)} is not active, skipping`);
            return;
        }

        // Determine final status based on trust score
        let finalStatus: "Verified" | "Debunked" | "Inconclusive";

        if (rumor.trust_score >= 0.75) {
            finalStatus = "Verified";
        } else if (rumor.trust_score <= 0.25) {
            finalStatus = "Debunked";
        } else {
            finalStatus = "Inconclusive";
        }

        console.log(`[ResolveExpired] Resolving as ${finalStatus} (score: ${rumor.trust_score.toFixed(3)})`);

        // Resolve the rumor
        await this.resolveRumor(rumorId, finalStatus);
    }

    async checkAndResolveRumors(): Promise<{
        resolved: number;
        rumors: Array<{
            rumorId: string;
            newStatus: string;
            votersUpdated: number;
        }>;
    }> {
        const now = new Date();
        const fortyEightHoursAgo = new Date(
            now.getTime() - 48 * 60 * 60 * 1000,
        );
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const resolvedRumors: Array<{
            rumorId: string;
            newStatus: string;
            votersUpdated: number;
        }> = [];

        // Get all active rumors
        const { data: activeRumors } = await supabase
            .from("rumors")
            .select("*")
            .eq("status", "Active");

        if (!activeRumors) return { resolved: 0, rumors: [] };

        for (const rumor of activeRumors) {
            let shouldResolve = false;
            let finalStatus: "Verified" | "Debunked" | "Inconclusive" | null =
                null;

            // Check for Verified (score >= 0.75 for 48h)
            if (rumor.trust_score >= 0.75 && rumor.score_above_75_since) {
                const thresholdTime = new Date(rumor.score_above_75_since);
                if (thresholdTime <= fortyEightHoursAgo) {
                    shouldResolve = true;
                    finalStatus = "Verified";
                }
            }

            // Check for Debunked (score <= 0.25 for 48h)
            if (rumor.trust_score <= 0.25 && rumor.score_below_25_since) {
                const thresholdTime = new Date(rumor.score_below_25_since);
                if (thresholdTime <= fortyEightHoursAgo) {
                    shouldResolve = true;
                    finalStatus = "Debunked";
                }
            }

            // Check for Inconclusive (7 days old, score between 0.25-0.75)
            const createdAt = new Date(rumor.created_at);
            if (
                createdAt <= sevenDaysAgo &&
                rumor.trust_score > 0.25 &&
                rumor.trust_score < 0.75
            ) {
                shouldResolve = true;
                finalStatus = "Inconclusive";
            }

            if (shouldResolve && finalStatus) {
                const votersUpdated = await this.resolveRumor(
                    rumor.id,
                    finalStatus,
                );
                resolvedRumors.push({
                    rumorId: rumor.id,
                    newStatus: finalStatus,
                    votersUpdated,
                });
            }
        }

        return { resolved: resolvedRumors.length, rumors: resolvedRumors };
    }

    // Rumor Relationships (DAG) Methods
    async createRumorRelationship(data: {
        parentRumorId: string;
        childRumorId: string;
        relationshipType: string;
    }): Promise<{
        success: boolean;
        relationship?: any;
        error?: string;
    }> {
        try {
            // Check if both rumors exist
            const { data: parent } = await supabase
                .from("rumors")
                .select("id")
                .eq("id", data.parentRumorId)
                .single();

            const { data: child } = await supabase
                .from("rumors")
                .select("id")
                .eq("id", data.childRumorId)
                .single();

            if (!parent || !child) {
                return {
                    success: false,
                    error: "One or both rumors not found",
                };
            }

            // Check for self-reference
            if (data.parentRumorId === data.childRumorId) {
                return {
                    success: false,
                    error: "Cannot create relationship to itself",
                };
            }

            // Check for circular dependency using the stored function
            const { data: hasCircle } = await supabase.rpc(
                "check_circular_dependency",
                {
                    p_parent_id: data.parentRumorId,
                    p_child_id: data.childRumorId,
                },
            );

            if (hasCircle) {
                return {
                    success: false,
                    error: "This relationship would create a circular dependency",
                };
            }

            // Create the relationship
            const { data: relationship, error } = await supabase
                .from("rumor_relationships")
                .insert({
                    parent_rumor_id: data.parentRumorId,
                    child_rumor_id: data.childRumorId,
                    relationship_type: data.relationshipType,
                })
                .select()
                .single();

            if (error) {
                // Check if it's a unique constraint violation
                if (error.code === "23505") {
                    return {
                        success: false,
                        error: "This relationship already exists",
                    };
                }
                throw error;
            }

            return {
                success: true,
                relationship,
            };
        } catch (error) {
            console.error("Error creating rumor relationship:", error);
            return {
                success: false,
                error: "Failed to create relationship",
            };
        }
    }

    async getRumorRelationships(rumorId: string): Promise<any[]> {
        // Get relationships where this rumor is either parent or child
        const { data: relationships, error } = await supabase
            .from("rumor_relationships")
            .select(
                `
                id,
                parent_rumor_id,
                child_rumor_id,
                relationship_type,
                created_at,
                parent:parent_rumor_id(id, content, status),
                child:child_rumor_id(id, content, status)
            `,
            )
            .or(`parent_rumor_id.eq.${rumorId},child_rumor_id.eq.${rumorId}`);

        if (error) {
            console.error("Error fetching rumor relationships:", error);
            return [];
        }

        return relationships || [];
    }

    async getRumorGraph(rumorId: string): Promise<{
        nodes: Array<{
            id: string;
            content: string;
            status: string;
            trustScore: number;
        }>;
        edges: Array<{ source: string; target: string; type: string }>;
    }> {
        const nodes: Map<string, any> = new Map();
        const edges: Array<{ source: string; target: string; type: string }> =
            [];
        const visited = new Set<string>();

        // Recursive function to build the graph
        const buildGraph = async (currentId: string, depth: number = 0) => {
            if (visited.has(currentId) || depth > 5) return; // Prevent infinite loops, limit depth
            visited.add(currentId);

            // Get the current rumor
            const { data: rumor } = await supabase
                .from("rumors")
                .select("id, content, status, trust_score")
                .eq("id", currentId)
                .single();

            if (rumor) {
                nodes.set(rumor.id, {
                    id: rumor.id,
                    content: rumor.content.substring(0, 100), // Truncate for graph display
                    status: rumor.status,
                    trustScore: rumor.trust_score,
                });

                // Get all relationships (both as parent and child)
                const { data: relationships } = await supabase
                    .from("rumor_relationships")
                    .select(
                        "parent_rumor_id, child_rumor_id, relationship_type",
                    )
                    .or(
                        `parent_rumor_id.eq.${currentId},child_rumor_id.eq.${currentId}`,
                    );

                if (relationships) {
                    for (const rel of relationships) {
                        edges.push({
                            source: rel.parent_rumor_id,
                            target: rel.child_rumor_id,
                            type: rel.relationship_type,
                        });

                        // Recursively explore connected rumors
                        if (rel.parent_rumor_id === currentId) {
                            await buildGraph(rel.child_rumor_id, depth + 1);
                        } else {
                            await buildGraph(rel.parent_rumor_id, depth + 1);
                        }
                    }
                }
            }
        };

        await buildGraph(rumorId);

        return {
            nodes: Array.from(nodes.values()),
            edges,
        };
    }
}

export const storage = new DatabaseStorage();
