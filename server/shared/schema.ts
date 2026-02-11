import {
    pgTable,
    text,
    serial,
    integer,
    boolean,
    timestamp,
    doublePrecision,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Re-export auth models
export * from "./models/auth";

export const rumorStatusEnum = pgEnum("rumor_status", [
    "active",
    "verified",
    "debunked",
    "inconclusive",
]);

// Backup codes for password recovery
export const backupCodes = pgTable("backup_codes", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    codeHash: text("code_hash").notNull(),
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    usedAt: timestamp("used_at"),
});

export const rumors = pgTable("rumors", {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    trustScore: doublePrecision("trust_score").default(0.5).notNull(),
    status: rumorStatusEnum("status").default("active").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    summary: text("summary"),
    contentWarning: boolean("content_warning").default(false),
    imageUrl: text("image_url"),
    hasDependencies: boolean("has_dependencies").default(false),
    dependencyStatus: text("dependency_status"), // 'blocked', 'affected', NULL
});

export const rumorRelationships = pgTable("rumor_relationships", {
    id: serial("id").primaryKey(),
    parentRumorId: integer("parent_rumor_id")
        .references(() => rumors.id, { onDelete: "cascade" })
        .notNull(),
    childRumorId: integer("child_rumor_id")
        .references(() => rumors.id, { onDelete: "cascade" })
        .notNull(),
    relationshipType: text("relationship_type").default("depends_on").notNull(), // depends_on, related_to, contradicts
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evidence = pgTable("evidence", {
    id: serial("id").primaryKey(),
    rumorId: integer("rumor_id")
        .references(() => rumors.id)
        .notNull(),
    content: text("content").notNull(),
    url: text("url"), // Optional link
    isSupporting: boolean("is_supporting").notNull(), // true = supporting, false = disputing
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evidenceVotes = pgTable("evidence_votes", {
    id: serial("id").primaryKey(),
    evidenceId: integer("evidence_id")
        .references(() => evidence.id)
        .notNull(),
    voteHash: text("vote_hash").notNull(), // SHA256(user_id + salt + evidence_id)
    isHelpful: boolean("is_helpful").notNull(), // true = helpful, false = misleading
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
    id: serial("id").primaryKey(),
    rumorId: integer("rumor_id")
        .references(() => rumors.id)
        .notNull(),
    oldScore: doublePrecision("old_score").notNull(),
    newScore: doublePrecision("new_score").notNull(),
    changeReason: text("change_reason").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const rumorsRelations = relations(rumors, ({ many }) => ({
    evidence: many(evidence),
    auditLogs: many(auditLog),
    parentRelationships: many(rumorRelationships, {
        relationName: "parent",
    }),
    childRelationships: many(rumorRelationships, {
        relationName: "child",
    }),
}));

export const rumorRelationshipsRelations = relations(
    rumorRelationships,
    ({ one }) => ({
        parentRumor: one(rumors, {
            fields: [rumorRelationships.parentRumorId],
            references: [rumors.id],
            relationName: "parent",
        }),
        childRumor: one(rumors, {
            fields: [rumorRelationships.childRumorId],
            references: [rumors.id],
            relationName: "child",
        }),
    }),
);

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
    rumor: one(rumors, {
        fields: [evidence.rumorId],
        references: [rumors.id],
    }),
    votes: many(evidenceVotes),
}));

export const evidenceVotesRelations = relations(evidenceVotes, ({ one }) => ({
    evidence: one(evidence, {
        fields: [evidenceVotes.evidenceId],
        references: [evidence.id],
    }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
    rumor: one(rumors, {
        fields: [auditLog.rumorId],
        references: [rumors.id],
    }),
}));

// Schemas
export const insertRumorSchema = createInsertSchema(rumors).omit({
    id: true,
    trustScore: true,
    status: true,
    viewCount: true,
    createdAt: true,
    updatedAt: true,
});

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
    id: true,
    createdAt: true,
});

export const insertVoteSchema = createInsertSchema(evidenceVotes)
    .omit({
        id: true,
        createdAt: true,
        voteHash: true, // Generated on backend
    })
    .extend({
        // Frontend sends this, backend hashes it
        // Actually, for anonymity, frontend just sends the vote choice.
        // Backend handles the hashing using the authenticated user's ID.
    });

// Types
export type Rumor = typeof rumors.$inferSelect;
export type InsertRumor = z.infer<typeof insertRumorSchema>;

export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;

export type EvidenceVote = typeof evidenceVotes.$inferSelect;

export type AuditLogEntry = typeof auditLog.$inferSelect;

export type RumorRelationship = typeof rumorRelationships.$inferSelect;

export type RumorStatus = "active" | "verified" | "debunked" | "inconclusive";
