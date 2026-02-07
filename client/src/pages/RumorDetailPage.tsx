import { useRoute } from "wouter";
import { useRumor, useVoteEvidence } from "@/hooks/use-rumors";
import { Navbar } from "@/components/Navbar";
import { TrustScore } from "@/components/TrustScore";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AddEvidenceDialog } from "@/components/AddEvidenceDialog";
import { UserStatsCard } from "@/components/UserStatsCard";
import { VoteWithStakeDialog } from "@/components/VoteWithStakeDialog";
import { VoteOnRumorDialog } from "@/components/VoteOnRumorDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import {
    ShieldCheck,
    ShieldAlert,
    Link as LinkIcon,
    History,
    ThumbsUp,
    ThumbsDown,
    ExternalLink,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function RumorDetailPage() {
    const [match, params] = useRoute("/rumor/:id");
    const id = params?.id || "";
    const { data: rumor, isLoading, error, refetch } = useRumor(id);
    const voteEvidence = useVoteEvidence();

    if (isLoading) return <DetailSkeleton />;
    if (error || !rumor)
        return <div className="p-20 text-center">Rumor not found</div>;

    const expiryDate = (rumor as any).expiry_date;
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    const isVotingBlocked = (rumor as any).status !== "Active" || isExpired;

    const supportingEvidence = rumor.evidence.filter(
        (e) => (e as any).evidence_type === "support",
    );
    const disputingEvidence = rumor.evidence.filter(
        (e) => (e as any).evidence_type === "dispute",
    );

    const handleVote = (
        evidenceId: string,
        isHelpful: boolean,
        stakeAmount: number,
    ) => {
        voteEvidence.mutate({
            evidenceId,
            isHelpful,
            rumorId: id,
            stakeAmount,
        });
    };

    const chartData = rumor.history.map((entry) => ({
        time: format(new Date((entry as any).created_at), "HH:mm"),
        score: (entry as any).new_score * 100,
    }));

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="container max-w-5xl mx-auto py-8 px-4">
                {/* Header Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-muted-foreground text-sm font-mono">
                                <span>
                                    RUMOR_ID: {id.substring(0, 8).toUpperCase()}
                                </span>
                                {((rumor as any).score_above_75_since ||
                                    (rumor as any).score_below_25_since) && (
                                    <>
                                        <span>•</span>
                                        <CountdownTimer
                                            targetDate={
                                                (rumor as any)
                                                    .score_above_75_since ||
                                                (rumor as any)
                                                    .score_below_25_since
                                            }
                                            type="resolution"
                                            status={(rumor as any).status}
                                            onExpire={() => refetch()}
                                        />
                                        <span>•</span>
                                    </>
                                )}
                                {(rumor as any).expiry_date && (
                                    <>
                                        <span>•</span>
                                        <CountdownTimer
                                            targetDate={
                                                (rumor as any).expiry_date
                                            }
                                            type="expiry"
                                            status={(rumor as any).status}
                                            onExpire={() => refetch()}
                                        />
                                        <span>•</span>
                                    </>
                                )}
                                <span>
                                    {(rumor as any).created_at
                                        ? format(
                                              new Date(
                                                  (rumor as any).created_at,
                                              ),
                                              "PPP p",
                                          )
                                        : "Unknown date"}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                                {rumor.content}
                            </h1>
                            {(rumor as any).image_url && (
                                <div className="rounded-lg overflow-hidden border border-border/50">
                                    <img
                                        src={(rumor as any).image_url}
                                        alt="Attached to rumor"
                                        className="w-full max-h-[400px] object-contain bg-black/20"
                                    />
                                </div>
                            )}
                        </div>

                        <Card className="bg-card/40 border-border/60">
                            <CardContent className="pt-6 space-y-4">
                                <TrustScore
                                    score={(rumor as any).trust_score}
                                    size="lg"
                                    className="mb-4"
                                />
                                <p className="text-sm text-muted-foreground mb-4">
                                    This score is calculated using a Bayesian
                                    algorithm based on the quality and quantity
                                    of supporting vs. disputing evidence.
                                </p>
                                
                                {/* Vote on Rumor Buttons */}
                                {rumor.status === "Active" && (
                                    <div className="flex gap-3 pt-2">
                                        <VoteOnRumorDialog rumorId={id} voteType="verify" />
                                        <VoteOnRumorDialog rumorId={id} voteType="debunk" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                        <UserStatsCard />

                        <Card className="border-border/60 bg-card/40">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-mono flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    SCORE_HISTORY
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(255,255,255,0.05)"
                                        />
                                        <XAxis
                                            dataKey="time"
                                            stroke="#666"
                                            fontSize={10}
                                            tickLine={false}
                                        />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#111",
                                                border: "1px solid #333",
                                            }}
                                            itemStyle={{ color: "#fff" }}
                                        />
                                        <Line
                                            type="stepAfter"
                                            dataKey="score"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Tabs defaultValue="evidence" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-secondary/50">
                            <TabsTrigger value="evidence">
                                Evidence Log
                            </TabsTrigger>
                            <TabsTrigger value="meta">Metadata</TabsTrigger>
                        </TabsList>
                        <AddEvidenceDialog rumorId={id} />
                    </div>

                    <TabsContent value="evidence" className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Supporting Column */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--status-verified))]/20">
                                    <ShieldCheck className="text-[hsl(var(--status-verified))]" />
                                    <h3 className="font-semibold text-[hsl(var(--status-verified))]">
                                        Supporting Evidence
                                    </h3>
                                    <Badge
                                        variant="outline"
                                        className="ml-auto bg-[hsl(var(--status-verified))]/10 border-[hsl(var(--status-verified))]/30"
                                    >
                                        {supportingEvidence.length}
                                    </Badge>
                                </div>

                                {supportingEvidence.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic py-4">
                                        No supporting evidence yet.
                                    </p>
                                ) : (
                                    supportingEvidence.map((item) => (
                                        <EvidenceCard
                                            key={item.id}
                                            item={item}
                                            onVote={handleVote}
                                            isVoting={voteEvidence.isPending}
                                            disabled={isVotingBlocked}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Disputing Column */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-destructive/20">
                                    <ShieldAlert className="text-destructive" />
                                    <h3 className="font-semibold text-destructive">
                                        Disputing Evidence
                                    </h3>
                                    <Badge
                                        variant="outline"
                                        className="ml-auto bg-destructive/10 border-destructive/30"
                                    >
                                        {disputingEvidence.length}
                                    </Badge>
                                </div>

                                {disputingEvidence.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic py-4">
                                        No disputing evidence yet.
                                    </p>
                                ) : (
                                    disputingEvidence.map((item) => (
                                        <EvidenceCard
                                            key={item.id}
                                            item={item}
                                            onVote={handleVote}
                                            isVoting={voteEvidence.isPending}
                                            disabled={isVotingBlocked}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="meta">
                        <Card>
                            <CardContent className="pt-6 font-mono text-sm space-y-2">
                                <p>Status: {rumor.status}</p>
                                <p>Evidence Count: {rumor.evidence.length}</p>
                                <p>
                                    Created:{" "}
                                    {new Date(
                                        (rumor as any).created_at,
                                    ).toISOString()}
                                </p>
                                <p>
                                    Last Updated:{" "}
                                    {new Date(
                                        (rumor as any).updated_at,
                                    ).toISOString()}
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

function EvidenceCard({
    item,
    onVote,
    isVoting,
    disabled = false,
}: {
    item: any;
    onVote: any;
    isVoting: boolean;
    disabled?: boolean;
}) {
    return (
        <Card className="bg-card/30 border-border/50 hover:bg-card/50 transition-colors">
            <CardContent className="p-4 space-y-3">
                <p className="text-sm leading-relaxed">
                    {item.content_text || "No description provided"}
                </p>

                {item.content_type === "image" && item.content_url && (
                    <div className="rounded-lg overflow-hidden border border-border/30">
                        <img
                            src={item.content_url}
                            alt="Evidence attachment"
                            className="w-full max-h-52 object-contain bg-black/10 cursor-pointer"
                            onClick={() =>
                                window.open(item.content_url, "_blank")
                            }
                        />
                    </div>
                )}

                {item.content_type !== "image" && item.content_url && (
                    <a
                        href={item.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Source Link
                    </a>
                )}

                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground font-mono">
                        {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                        })}
                    </span>

                    <div className="flex items-center gap-2">
                        <VoteWithStakeDialog
                            evidenceId={item.id}
                            isHelpful={true}
                            onVote={onVote}
                            isVoting={isVoting}
                            currentVotes={item.helpful_votes}
                            disabled={disabled}
                        />
                        <VoteWithStakeDialog
                            evidenceId={item.id}
                            isHelpful={false}
                            onVote={onVote}
                            isVoting={isVoting}
                            currentVotes={item.misleading_votes}
                            disabled={disabled}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DetailSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-32 w-full" />
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
}
