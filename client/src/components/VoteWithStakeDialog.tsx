import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Coins, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface VoteWithStakeDialogProps {
    evidenceId: string;
    isHelpful: boolean;
    onVote: (evidenceId: string, isHelpful: boolean, stakeAmount: number) => void;
    isVoting: boolean;
    currentVotes: number;
}

export function VoteWithStakeDialog({
    evidenceId,
    isHelpful,
    onVote,
    isVoting,
    currentVotes,
}: VoteWithStakeDialogProps) {
    const [open, setOpen] = useState(false);
    const [stakeAmount, setStakeAmount] = useState([1]);

    const { data: stats } = useQuery({
        queryKey: [api.user.stats.path],
        queryFn: async () => {
            const res = await fetch(api.user.stats.path, {
                credentials: "include",
            });
            if (!res.ok) return null;
            return api.user.stats.responses[200].parse(await res.json());
        },
    });

    const availablePoints = stats
        ? stats.totalPoints - stats.pointsStaked
        : 100;
    const reputation = stats?.reputation || 0.5;

    // Vote weight = reputation × (1 + evidenceQuality) × stake
    // Use 0.5 as assumed evidence quality (we don't know the real value client-side)
    const voteWeight = reputation * (1 + 0.5) * stakeAmount[0];

    const handleVote = () => {
        onVote(evidenceId, isHelpful, stakeAmount[0]);
        setOpen(false);
        setStakeAmount([1]); // Reset
    };

    const Icon = isHelpful ? ThumbsUp : ThumbsDown;
    const voteType = isHelpful ? "Helpful" : "Misleading";
    const colorClass = isHelpful
        ? "text-[hsl(var(--status-verified))] hover:bg-[hsl(var(--status-verified))]/10"
        : "text-destructive hover:bg-destructive/10";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2 text-xs ${colorClass}`}
                    disabled={isVoting}
                >
                    <Icon className="h-3 w-3 mr-1.5" />
                    {voteType} ({currentVotes})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        Vote {voteType}
                    </DialogTitle>
                    <DialogDescription>
                        Stake points to increase your vote's influence. Higher
                        stakes = stronger impact on the trust score.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Available Points */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/40">
                        <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                Available Points
                            </span>
                        </div>
                        <Badge variant="outline" className="font-mono">
                            {availablePoints}
                        </Badge>
                    </div>

                    {/* Stake Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">
                                Stake Amount
                            </label>
                            <span className="text-2xl font-bold font-mono">
                                {stakeAmount[0]}
                            </span>
                        </div>
                        <Slider
                            value={stakeAmount}
                            onValueChange={setStakeAmount}
                            min={1}
                            max={Math.max(1, Math.min(10, availablePoints))}
                            step={1}
                            className="w-full"
                            disabled={availablePoints < 1}
                        />
                        <p className="text-xs text-muted-foreground">
                            Stake between 1-10 points (max: {Math.min(10, availablePoints)})
                        </p>
                    </div>

                    {/* Vote Weight Preview */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">
                                    Vote Weight
                                </span>
                            </div>
                            <span className="text-lg font-bold font-mono text-primary">
                                {voteWeight.toFixed(2)}×
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Based on your reputation ({(reputation * 100).toFixed(0)}%) and stake
                        </p>
                    </div>

                    {/* Warning */}
                    {availablePoints < 1 && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                            <p className="text-sm text-destructive">
                                ⚠️ Insufficient points. Wait for your staked
                                votes to resolve.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isVoting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleVote}
                        disabled={isVoting || availablePoints < 1}
                        className={
                            isHelpful
                                ? "bg-[hsl(var(--status-verified))] hover:bg-[hsl(var(--status-verified))]/90"
                                : ""
                        }
                    >
                        {isVoting ? "Voting..." : `Stake ${stakeAmount[0]} & Vote`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
