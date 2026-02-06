import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types based on your Supabase schema
export interface Database {
  public: {
    Tables: {
      rumors: {
        Row: {
          id: string;
          content: string;
          trust_score: number;
          status: 'Active' | 'Verified' | 'Debunked' | 'Inconclusive';
          created_at: string;
          updated_at: string;
          summary: string | null;
          content_warning: boolean;
        };
        Insert: {
          id?: string;
          content: string;
          trust_score?: number;
          status?: 'Active' | 'Verified' | 'Debunked' | 'Inconclusive';
          created_at?: string;
          updated_at?: string;
          summary?: string | null;
          content_warning?: boolean;
        };
        Update: {
          content?: string;
          trust_score?: number;
          status?: 'Active' | 'Verified' | 'Debunked' | 'Inconclusive';
          updated_at?: string;
          summary?: string | null;
          content_warning?: boolean;
        };
      };
      evidence: {
        Row: {
          id: string;
          rumor_id: string;
          evidence_type: 'support' | 'dispute';
          content_type: 'link' | 'image' | 'text';
          content_url: string | null;
          content_text: string | null;
          helpful_count: number;
          misleading_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          rumor_id: string;
          evidence_type: 'support' | 'dispute';
          content_type: 'link' | 'image' | 'text';
          content_url?: string | null;
          content_text?: string | null;
          helpful_count?: number;
          misleading_count?: number;
          created_at?: string;
        };
      };
      evidence_votes: {
        Row: {
          id: string;
          evidence_id: string;
          vote_hash: string;
          vote_type: 'helpful' | 'misleading';
          vote_weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          evidence_id: string;
          vote_hash: string;
          vote_type: 'helpful' | 'misleading';
          vote_weight?: number;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          rumor_id: string;
          event_type: string;
          old_score: number | null;
          new_score: number | null;
          evidence_id: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rumor_id: string;
          event_type: string;
          old_score?: number | null;
          new_score?: number | null;
          evidence_id?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
      user_fingerprints: {
        Row: {
          id: string;
          vote_hash: string;
          vote_count: number;
          vote_timing_avg_ms: number | null;
          agreement_rate: number | null;
          bot_flags: any[];
          is_suspicious: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vote_hash: string;
          vote_count?: number;
          vote_timing_avg_ms?: number | null;
          agreement_rate?: number | null;
          bot_flags?: any[];
          is_suspicious?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vote_count?: number;
          vote_timing_avg_ms?: number | null;
          agreement_rate?: number | null;
          bot_flags?: any[];
          is_suspicious?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}

export type Rumor = Database['public']['Tables']['rumors']['Row'];
export type Evidence = Database['public']['Tables']['evidence']['Row'];
export type EvidenceVote = Database['public']['Tables']['evidence_votes']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type UserFingerprint = Database['public']['Tables']['user_fingerprints']['Row'];
