import { useState } from "react";
import { useRumors } from "@/hooks/use-rumors";
import { Navbar } from "@/components/Navbar";
import { CreateRumorDialog } from "@/components/CreateRumorDialog";
import { TrustScore } from "@/components/TrustScore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MessageSquare, Eye, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function FeedPage() {
    const { data: rumors, isLoading, error } = useRumors();
    const [filter, setFilter] = useState("all");

    if (isLoading) return <FeedSkeleton />;
    if (error)
        return (
            <div className="p-8 text-center text-destructive">
                Error loading feed.
            </div>
        );

    const filteredRumors = rumors?.filter((r) => {
        if (filter === "all") return true;
        if (filter === "verified") return r.status === "verified";
        if (filter === "debunked") return r.status === "debunked";
        if (filter === "active")
            return r.status === "active" || r.status === "inconclusive";
        return true;
    });

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container max-w-4xl py-8 px-4 mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Rumor Feed
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Active investigations and verified claims from the
                            campus network.
                        </p>
                    </div>
                    <CreateRumorDialog />
                </div>

                <Tabs
                    defaultValue="all"
                    onValueChange={setFilter}
                    className="space-y-6"
                >
                    <TabsList className="bg-secondary/50 border border-border/50 p-1">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active Debate</TabsTrigger>
                        <TabsTrigger
                            value="verified"
                            className="data-[state=active]:text-[hsl(var(--status-verified))]"
                        >
                            Verified
                        </TabsTrigger>
                        <TabsTrigger
                            value="debunked"
                            className="data-[state=active]:text-destructive"
                        >
                            Debunked
                        </TabsTrigger>
                    </TabsList>

                    <div className="grid gap-4">
                        {filteredRumors?.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-border rounded-xl">
                                <p className="text-muted-foreground">
                                    No rumors found in this category.
                                </p>
                            </div>
                        ) : (
                            filteredRumors?.map((rumor) => (
                                <Link
                                    key={rumor.id}
                                    href={`/rumor/${rumor.id}`}
                                    className="block group"
                                >
                                    <Card className="border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer bg-card/50 backdrop-blur-sm overflow-hidden relative">
                                        {/* Status accent line on left */}
                                        <div
                                            className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                rumor.trust_score >= 0.8
                                                    ? "bg-[hsl(var(--status-verified))]"
                                                    : rumor.trust_score <= 0.2
                                                      ? "bg-destructive"
                                                      : "bg-yellow-500"
                                            }`}
                                        />

                                        <CardHeader className="pb-2 pl-6">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex flex-col gap-2 w-full">
                                                    <div className="flex justify-between items-center w-full">
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-[10px] uppercase tracking-wider bg-background/50"
                                                        >
                                                            #
                                                            {rumor.id
                                                                .toString()
                                                                .padStart(
                                                                    4,
                                                                    "0",
                                                                )}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {formatDistanceToNow(
                                                                new Date(
                                                                    rumor.created_at,
                                                                ),
                                                                {
                                                                    addSuffix: true,
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                    <CardTitle className="text-lg font-medium leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                                                        {rumor.content}
                                                    </CardTitle>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pb-4 pl-6">
                                            <TrustScore
                                                score={rumor.trust_score}
                                            />
                                        </CardContent>

                                        <CardFooter className="pt-0 pb-4 pl-6 text-xs text-muted-foreground flex justify-between items-center border-t border-border/30 mt-2 pt-3">
                                            <div className="flex gap-4">
                                                <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                    {rumor.evidence_count}{" "}
                                                    evidence items
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                                Investigate{" "}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                </Tabs>
            </main>
        </div>
    );
}

function FeedSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-4xl py-8 px-4 mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}
