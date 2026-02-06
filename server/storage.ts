import { supabase, type Rumor, type Evidence, type AuditLog } from "./supabase";
import { createHash } from 'crypto';

type RumorStatus = 'Active' | 'Verified' | 'Debunked' | 'Inconclusive';

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
  createRumor(content: string): Promise<Rumor>;

  // Evidence
  createEvidence(data: { rumorId: string; evidenceType: 'support' | 'dispute'; contentType: 'link' | 'image' | 'text'; contentUrl?: string; contentText?: string }): Promise<Evidence>;

  // Votes & Scoring
  createVote(data: { evidenceId: string; userId: string; isHelpful: boolean }): Promise<{ success: boolean; newTrustScore?: number; newStatus?: string; error?: string }>;
}

export class DatabaseStorage implements IStorage {
  async getRumors(): Promise<RumorWithCount[]> {
    // Get all rumors
    const { data: rumors, error } = await supabase
      .from('rumors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rumors) return [];

    // Get evidence counts for each rumor
    const rumorsWithCounts = await Promise.all(
      rumors.map(async (rumor) => {
        const { count } = await supabase
          .from('evidence')
          .select('*', { count: 'exact', head: true })
          .eq('rumor_id', rumor.id);

        return {
          ...rumor,
          evidence_count: count || 0
        };
      })
    );

    return rumorsWithCounts;
  }

  async getRumor(id: string): Promise<RumorDetail | null> {
    // Get rumor
    const { data: rumor, error: rumorError } = await supabase
      .from('rumors')
      .select('*')
      .eq('id', id)
      .single();

    if (rumorError || !rumor) return null;

    // Get evidence with vote counts
    const { data: evidenceList, error: evidenceError } = await supabase
      .from('evidence')
      .select('*')
      .eq('rumor_id', id);

    if (evidenceError) throw evidenceError;

    const evidenceWithVotes: EvidenceWithVotes[] = await Promise.all(
      (evidenceList || []).map(async (ev) => {
        const { count: helpful } = await supabase
          .from('evidence_votes')
          .select('*', { count: 'exact', head: true })
          .eq('evidence_id', ev.id)
          .eq('vote_type', 'helpful');

        const { count: misleading } = await supabase
          .from('evidence_votes')
          .select('*', { count: 'exact', head: true })
          .eq('evidence_id', ev.id)
          .eq('vote_type', 'misleading');

        return {
          ...ev,
          helpful_votes: helpful || 0,
          misleading_votes: misleading || 0
        };
      })
    );

    // Get audit history
    const { data: history, error: historyError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('rumor_id', id)
      .order('created_at', { ascending: false });

    if (historyError) throw historyError;

    return {
      ...rumor,
      evidence: evidenceWithVotes,
      history: history || []
    };
  }

  async createRumor(content: string): Promise<Rumor> {
    const { data, error } = await supabase
      .from('rumors')
      .insert({ content })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createEvidence(data: {
    rumorId: string;
    evidenceType: 'support' | 'dispute';
    contentType: 'link' | 'image' | 'text';
    contentUrl?: string;
    contentText?: string;
  }): Promise<Evidence> {
    const { data: evidence, error } = await supabase
      .from('evidence')
      .insert({
        rumor_id: data.rumorId,
        evidence_type: data.evidenceType,
        content_type: data.contentType,
        content_url: data.contentUrl || null,
        content_text: data.contentText || null
      })
      .select()
      .single();

    if (error) throw error;
    return evidence;
  }

  async createVote(data: {
    evidenceId: string;
    userId: string;
    isHelpful: boolean;
  }): Promise<{ success: boolean; newTrustScore?: number; newStatus?: string; error?: string }> {
    try {
      // 1. Generate anonymous vote hash
      const salt = process.env.VOTE_SALT || 'HACKATHON_SECRET_SALT_2026';
      const voteHash = createHash('sha256')
        .update(`${data.userId}:${salt}:${data.evidenceId}`)
        .digest('hex');

      // 2. Check for duplicate vote
      const { data: existing } = await supabase
        .from('evidence_votes')
        .select('id')
        .eq('vote_hash', voteHash)
        .single();

      if (existing) {
        return { success: false, error: 'You have already voted on this evidence' };
      }

      // 3. Check bot behavior (timing pattern)
      await this.checkBotBehavior(voteHash);

      // 4. Insert vote
      const voteType = data.isHelpful ? 'helpful' : 'misleading';
      const { error: voteError } = await supabase
        .from('evidence_votes')
        .insert({
          evidence_id: data.evidenceId,
          vote_hash: voteHash,
          vote_type: voteType
        });

      if (voteError) throw voteError;

      // 5. Update evidence vote counts
      const { data: evidence } = await supabase
        .from('evidence')
        .select('*, rumor_id')
        .eq('id', data.evidenceId)
        .single();

      if (!evidence) throw new Error('Evidence not found');

      // Increment the appropriate counter
      const field = data.isHelpful ? 'helpful_count' : 'misleading_count';
      const newCount = (evidence[field] || 0) + 1;

      await supabase
        .from('evidence')
        .update({ [field]: newCount })
        .eq('id', data.evidenceId);

      // 6. Recalculate rumor trust score
      const result = await this.updateRumorScore(evidence.rumor_id);

      return {
        success: true,
        newTrustScore: result.newScore,
        newStatus: result.newStatus
      };

    } catch (err) {
      console.error('Vote creation error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create vote' };
    }
  }

  private async checkBotBehavior(voteHash: string): Promise<void> {
    // Get or create user fingerprint
    const { data: fingerprint } = await supabase
      .from('user_fingerprints')
      .select('*')
      .eq('vote_hash', voteHash)
      .single();

    const now = Date.now();

    if (!fingerprint) {
      // Create new fingerprint
      await supabase
        .from('user_fingerprints')
        .insert({
          vote_hash: voteHash,
          vote_count: 1
        });
      return;
    }

    // Check timing pattern - get recent votes
    const { data: recentVotes } = await supabase
      .from('evidence_votes')
      .select('created_at')
      .eq('vote_hash', voteHash)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentVotes && recentVotes.length >= 2) {
      const lastVoteTime = new Date(recentVotes[0].created_at).getTime();
      const secondLastTime = new Date(recentVotes[1].created_at).getTime();
      const timeDiff = (now - lastVoteTime) / 1000; // seconds

      if (timeDiff < 2) {
        console.warn(`⚠️ BOT FLAG: Rapid voting detected for hash ${voteHash.substring(0, 8)}...`);

        // Add bot flag
        const currentFlags = fingerprint.bot_flags || [];
        await supabase
          .from('user_fingerprints')
          .update({
            bot_flags: [...currentFlags, { type: 'rapid_voting', timestamp: new Date().toISOString() }],
            is_suspicious: true
          })
          .eq('vote_hash', voteHash);
      }
    }

    // Update vote count
    await supabase
      .from('user_fingerprints')
      .update({ vote_count: fingerprint.vote_count + 1 })
      .eq('vote_hash', voteHash);
  }

  private async updateRumorScore(rumorId: string): Promise<{ newScore: number; newStatus: RumorStatus }> {
    // Get current rumor
    const { data: rumor } = await supabase
      .from('rumors')
      .select('trust_score')
      .eq('id', rumorId)
      .single();

    if (!rumor) throw new Error('Rumor not found');

    const oldScore = rumor.trust_score;

    // Get all evidence for this rumor
    const { data: evidenceList } = await supabase
      .from('evidence')
      .select('*')
      .eq('rumor_id', rumorId);

    if (!evidenceList || evidenceList.length === 0) {
      return { newScore: 0.5, newStatus: 'Active' };
    }

    // Calculate Bayesian score with log scaling
    let alpha = 1.0; // Prior for supporting
    let beta = 1.0;  // Prior for disputing

    for (const ev of evidenceList) {
      const helpfulCount = ev.helpful_count || 0;
      const misleadingCount = ev.misleading_count || 0;
      const netVotes = helpfulCount - misleadingCount;

      if (netVotes > 0) {
        // Apply log scaling: weight = 1 + ln(netVotes)
        const weight = 1 + Math.log(Math.max(1, netVotes));

        if (ev.evidence_type === 'support') {
          alpha += weight;
        } else {
          beta += weight;
        }
      }
    }

    // Calculate new score (Beta distribution mean)
    const newScore = alpha / (alpha + beta);

    // Determine status based on thresholds
    let newStatus: RumorStatus = 'Active';
    if (newScore >= 0.8) newStatus = 'Verified';
    else if (newScore <= 0.2) newStatus = 'Debunked';
    else if (newScore >= 0.4 && newScore <= 0.6) newStatus = 'Inconclusive';

    // Update rumor
    await supabase
      .from('rumors')
      .update({
        trust_score: newScore,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', rumorId);

    // Log to audit trail
    await supabase
      .from('audit_log')
      .insert({
        rumor_id: rumorId,
        event_type: 'score_update',
        old_score: oldScore,
        new_score: newScore,
        metadata: { alpha, beta, threshold: newStatus }
      });

    return { newScore, newStatus };
  }
}

export const storage = new DatabaseStorage();
