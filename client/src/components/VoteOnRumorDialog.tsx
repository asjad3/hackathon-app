import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Coins, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

interface VoteOnRumorDialogProps {
    rumorId: string;
    voteType: "verify" | "debunk";
    disabled?: boolean;
    disabledReason?: string;
}

export function VoteOnRumorDialog({ rumorId, voteType, disabled = false, disabledReason }: VoteOnRumorDialogProps) {
    const [open, setOpen] = useState(false);
    const [stakeAmount, setStakeAmount] = useState([1]);
    const queryClient = useQueryClient();
    const { toast } = useToast();

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

    const voteRumor = useMutation({
        mutationFn: async ({ voteType, stakeAmount }: { voteType: "verify" | "debunk"; stakeAmount: number }) => {
            const url = `/api/rumors/${rumorId}/vote`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ voteType, stakeAmount }),
                credentials: "include",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to vote");
            }

            return api.rumor.vote.responses[200].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.rumors.get.path, rumorId] });
            queryClient.invalidateQueries({ queryKey: [api.user.stats.path] });
            toast({
                title: "Vote Recorded",
                description: `You voted to ${voteType} this rumor with ${stakeAmount[0]} points staked.`,
            });
            setOpen(false);
            setStakeAmount([1]);
        },
        onError: (error: Error) => {
            toast({
                title: "Vote Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const availablePoints = stats ? stats.totalPoints - stats.pointsStaked : 100;
    const reputation = stats?.reputation || 0.5;
    const voteWeight = reputation * stakeAmount[0];

    const handleVote = () => {
        voteRumor.mutate({ voteType, stakeAmount: stakeAmount[0] });
    };

    const Icon = voteType === "verify" ? ShieldCheck : ShieldAlert;
    const label = voteType === "verify" ? "Verify" : "Debunk";
    const colorClass = voteType === "verify"
        ? "bg-[hsl(var(--status-verified))] hover:bg-[hsl(var(--status-verified))]/90 border-[hsl(var(--status-verified))]"
        : "bg-destructive hover:bg-destructive/90 border-destructive";

    return (
        <>
            <Button
                onClick={() => disabled ? toast({ title: "Voting Disabled", description: disabledReason || "This rumor is no longer accepting votes.", variant: "destructive" }) : setOpen(true)}
                className={`gap-2 ${colorClass}`}
                disabled={disabled || voteRumor.isPending}
                variant={disabled ? "outline" : "default"}
            >
                <Icon className="h-4 w-4" />
                {label}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            Vote to {label} This Rumor
                        </DialogTitle>
                        <DialogDescription>
                            Stake points on your prediction. If the rumor resolves as {voteType === "verify" ? "Verified" : "Debunked"},
                            you'll earn a 20% bonus. If you're wrong, you'll lose your stake.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Available Points */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/40">
                            <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Available Points</span>
                            </div>
                            <Badge variant="outline" className="font-mono">
                                {availablePoints}
                            </Badge>
                        </div>

                        {/* Stake Slider */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Stake Amount</label>
                                <span className="text-2xl font-bold font-mono">{stakeAmount[0]}</span>
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
                                    <span className="text-sm font-medium">Vote Weight</span>
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
                                    ⚠️ Insufficient points. Wait for your staked votes to resolve.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={voteRumor.isPending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleVote}
                            disabled={voteRumor.isPending || availablePoints < 1}
                            className={colorClass}
                        >
                            {voteRumor.isPending ? "Voting..." : `Stake ${stakeAmount[0]} & ${label}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
