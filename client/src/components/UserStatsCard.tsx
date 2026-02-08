import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/routes";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Coins, TrendingUp, Target } from "lucide-react";

export function UserStatsCard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: [api.user.stats.path],
        queryFn: async () => {
            const res = await fetch(apiUrl(api.user.stats.path), {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch user stats");
            return api.user.stats.responses[200].parse(await res.json());
        },
    });

    if (isLoading) {
        return (
            <Card className="border-border/60 bg-card/40">
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!stats) return null;

    const reputationPercent = stats.reputation * 100;
    const accuracyPercent =
        stats.totalVotes > 0
            ? (stats.correctVotes / stats.totalVotes) * 100
            : 0;

    // Determine reputation tier
    let reputationTier = "Novice";
    let tierColor = "text-muted-foreground";
    if (stats.reputation >= 0.8) {
        reputationTier = "Expert";
        tierColor = "text-[hsl(var(--status-verified))]";
    } else if (stats.reputation >= 0.6) {
        reputationTier = "Trusted";
        tierColor = "text-primary";
    } else if (stats.reputation >= 0.4) {
        reputationTier = "Contributor";
        tierColor = "text-blue-400";
    }

    return (
        <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    YOUR_STATS
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Reputation */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                Reputation
                            </span>
                        </div>
                        <Badge
                            variant="outline"
                            className={`${tierColor} border-current/30 bg-current/10`}
                        >
                            {reputationTier}
                        </Badge>
                    </div>
                    <Progress value={reputationPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        {reputationPercent.toFixed(1)}% •{" "}
                        {stats.correctVotes}/{stats.totalVotes} correct votes
                    </p>
                </div>

                {/* Points */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/40">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Coins className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">
                                Available
                            </span>
                        </div>
                        <p className="text-lg font-bold">
                            {stats.totalPoints - stats.pointsStaked}
                        </p>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/40">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Target className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Staked</span>
                        </div>
                        <p className="text-lg font-bold">
                            {stats.pointsStaked}
                        </p>
                    </div>
                </div>

                {/* Vote Accuracy */}
                {stats.totalVotes > 0 && (
                    <div className="pt-2 border-t border-border/40">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                Vote Accuracy
                            </span>
                            <span className="font-mono font-medium">
                                {accuracyPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Info */}
                <p className="text-xs text-muted-foreground/70 pt-1">
                    Higher reputation = stronger vote weight. Earn points by
                    voting correctly!
                </p>
            </CardContent>
        </Card>
    );
}
