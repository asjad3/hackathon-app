import { z } from "zod";
import {
    insertRumorSchema,
    insertEvidenceSchema,
    rumors,
    evidence,
    auditLog,
} from "./schema.js";

export const errorSchemas = {
    validation: z.object({
        message: z.string(),
        field: z.string().optional(),
    }),
    notFound: z.object({
        message: z.string(),
    }),
    internal: z.object({
        message: z.string(),
    }),
    unauthorized: z.object({
        message: z.string(),
    }),
};

export const api = {
    rumors: {
        list: {
            method: "GET" as const,
            path: "/api/rumors",
            responses: {
                200: z.array(
                    z.custom<
                        typeof rumors.$inferSelect & { evidenceCount: number }
                    >(),
                ),
            },
        },
        get: {
            method: "GET" as const,
            path: "/api/rumors/:id",
            responses: {
                200: z.custom<
                    typeof rumors.$inferSelect & {
                        evidence: (typeof evidence.$inferSelect & {
                            helpfulVotes: number;
                            misleadingVotes: number;
                        })[];
                        history: (typeof auditLog.$inferSelect)[];
                    }
                >(),
                404: errorSchemas.notFound,
            },
        },
        create: {
            method: "POST" as const,
            path: "/api/rumors",
            input: insertRumorSchema,
            responses: {
                201: z.custom<typeof rumors.$inferSelect>(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            },
        },
    },
    evidence: {
        create: {
            method: "POST" as const,
            path: "/api/rumors/:id/evidence",
            input: insertEvidenceSchema.omit({ rumorId: true }),
            responses: {
                201: z.custom<typeof evidence.$inferSelect>(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
                404: errorSchemas.notFound,
            },
        },
        vote: {
            method: "POST" as const,
            path: "/api/evidence/:id/vote",
            input: z.object({
                isHelpful: z.boolean(),
                stakeAmount: z
                    .number()
                    .int()
                    .min(1)
                    .max(10)
                    .optional()
                    .default(1),
            }),
            responses: {
                200: z.object({
                    success: z.boolean(),
                    newTrustScore: z.number().optional(),
                    newStatus: z.string().optional(),
                }),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
                404: errorSchemas.notFound,
            },
        },
    },
    rumor: {
        vote: {
            method: "POST" as const,
            path: "/api/rumors/:id/vote",
            input: z.object({
                voteType: z.enum(["verify", "debunk"]),
                stakeAmount: z
                    .number()
                    .int()
                    .min(1)
                    .max(10)
                    .optional()
                    .default(1),
            }),
            responses: {
                200: z.object({
                    success: z.boolean(),
                }),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
                404: errorSchemas.notFound,
            },
        },
    },
    relationships: {
        list: {
            method: "GET" as const,
            path: "/api/rumors/:id/relationships",
            responses: {
                200: z.array(
                    z.object({
                        id: z.number(),
                        parentRumorId: z.string(),
                        childRumorId: z.string(),
                        relationshipType: z.string(),
                        createdAt: z.string(),
                        parentRumor: z
                            .object({
                                id: z.string(),
                                content: z.string(),
                                status: z.string(),
                            })
                            .optional(),
                        childRumor: z
                            .object({
                                id: z.string(),
                                content: z.string(),
                                status: z.string(),
                            })
                            .optional(),
                    }),
                ),
                404: errorSchemas.notFound,
            },
        },
        create: {
            method: "POST" as const,
            path: "/api/rumors/:id/relationships",
            input: z.object({
                targetRumorId: z.string(),
                relationshipType: z
                    .enum(["depends_on", "related_to", "contradicts"])
                    .optional()
                    .default("depends_on"),
            }),
            responses: {
                201: z.object({
                    success: z.boolean(),
                    relationship: z
                        .object({
                            id: z.number(),
                            parentRumorId: z.string(),
                            childRumorId: z.string(),
                            relationshipType: z.string(),
                        })
                        .optional(),
                }),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
                404: errorSchemas.notFound,
            },
        },
        graph: {
            method: "GET" as const,
            path: "/api/rumors/:id/graph",
            responses: {
                200: z.object({
                    nodes: z.array(
                        z.object({
                            id: z.string(),
                            content: z.string(),
                            status: z.string(),
                            trustScore: z.number(),
                        }),
                    ),
                    edges: z.array(
                        z.object({
                            source: z.string(),
                            target: z.string(),
                            type: z.string(),
                        }),
                    ),
                }),
                404: errorSchemas.notFound,
            },
        },
    },
    user: {
        stats: {
            method: "GET" as const,
            path: "/api/user/stats",
            responses: {
                200: z.object({
                    reputation: z.number(),
                    totalPoints: z.number(),
                    pointsStaked: z.number(),
                    correctVotes: z.number(),
                    totalVotes: z.number(),
                }),
                404: errorSchemas.notFound,
            },
        },
    },
    auth: {
        setUserId: {
            method: "POST" as const,
            path: "/api/auth/set-user-id",
            input: z.object({
                userId: z.string().min(3).max(50),
            }),
            responses: {
                200: z.object({
                    success: z.boolean(),
                    userId: z.string(),
                }),
                400: errorSchemas.validation,
            },
        },
        status: {
            method: "GET" as const,
            path: "/api/auth/status",
            responses: {
                200: z.object({
                    authenticated: z.boolean(),
                    userId: z.string().optional(),
                }),
            },
        },
    },
};

export function buildUrl(
    path: string,
    params?: Record<string, string | number>,
): string {
    let url = path;
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (url.includes(`:${key}`)) {
                url = url.replace(`:${key}`, String(value));
            }
        });
    }
    return url;
}
