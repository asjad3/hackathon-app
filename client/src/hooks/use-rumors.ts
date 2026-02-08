import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/shared/routes";
import { useToast } from "@/hooks/use-toast";
import { InsertRumor, InsertEvidence } from "@/shared/schema";
import { apiUrl } from "@/lib/api";
import { z } from "zod";

// Types derived from the API definition
type RumorListResponse = z.infer<(typeof api.rumors.list.responses)[200]>;
type RumorDetailResponse = z.infer<(typeof api.rumors.get.responses)[200]>;

export function useRumors() {
    return useQuery({
        queryKey: [api.rumors.list.path],
        queryFn: async () => {
            const res = await fetch(apiUrl(api.rumors.list.path), {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch rumors");
            return api.rumors.list.responses[200].parse(await res.json());
        },
    });
}

export function useRumor(id: string) {
    return useQuery({
        queryKey: [api.rumors.get.path, id],
        queryFn: async () => {
            const url = apiUrl(buildUrl(api.rumors.get.path, { id }));
            const res = await fetch(url, { credentials: "include" });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error("Failed to fetch rumor");
            return api.rumors.get.responses[200].parse(await res.json());
        },
        enabled: !!id,
    });
}

export function useCreateRumor() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: InsertRumor) => {
            const res = await fetch(apiUrl(api.rumors.create.path), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!res.ok) {
                if (res.status === 400) {
                    const error = await res.json();
                    throw new Error(error.message || "Validation failed");
                }
                if (res.status === 401) throw new Error("Unauthorized");
                throw new Error("Failed to create rumor");
            }

            return api.rumors.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.rumors.list.path] });
            toast({
                title: "Rumor Submitted",
                description:
                    "Your rumor has been anonymously logged to the protocol.",
            });
        },
        onError: (error) => {
            toast({
                title: "Submission Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useCreateEvidence() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            rumorId,
            imageUrl,
            ...data
        }: InsertEvidence & { rumorId: string; imageUrl?: string }) => {
            const url = apiUrl(buildUrl(api.evidence.create.path, { id: rumorId }));
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, imageUrl }),
                credentials: "include",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to submit evidence");
            }

            return api.evidence.create.responses[201].parse(await res.json());
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [api.rumors.get.path, variables.rumorId],
            });
            toast({
                title: "Evidence Added",
                description: "The trust score is being recalculated...",
            });
        },
        onError: (error) => {
            toast({
                title: "Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useVoteEvidence() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            evidenceId,
            isHelpful,
            rumorId,
            stakeAmount = 1,
        }: {
            evidenceId: string;
            isHelpful: boolean;
            rumorId: string;
            stakeAmount?: number;
        }) => {
            const url = apiUrl(buildUrl(api.evidence.vote.path, { id: evidenceId }));
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isHelpful, stakeAmount }),
                credentials: "include",
            });

            if (!res.ok) {
                // Check if response is JSON before parsing
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const error = await res.json();
                    throw new Error(error.message || "Failed to vote");
                } else {
                    // Got HTML or other non-JSON response (likely error page)
                    const text = await res.text();
                    console.error(
                        "Non-JSON error response:",
                        text.substring(0, 200),
                    );
                    throw new Error(
                        `Server error (${res.status}): ${res.statusText}`,
                    );
                }
            }

            return api.evidence.vote.responses[200].parse(await res.json());
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: [api.rumors.get.path, variables.rumorId],
            });
            queryClient.invalidateQueries({
                queryKey: [api.user.stats.path],
            });
            toast({
                title: "Vote Recorded",
                description: data.newTrustScore
                    ? `Trust score updated to ${(data.newTrustScore * 100).toFixed(1)}%`
                    : "Your vote has been hashed and recorded.",
            });
        },
        onError: (error: Error) => {
            console.error("Vote error:", error);
            toast({
                title: "Vote Failed",
                description: error.message || "An error occurred while voting",
                variant: "destructive",
            });
        },
    });
}
