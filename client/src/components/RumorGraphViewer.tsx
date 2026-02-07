import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    GitBranch,
    Link2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
} from "lucide-react";

interface RumorGraphViewerProps {
    rumorId: string;
}

export function RumorGraphViewer({ rumorId }: RumorGraphViewerProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [targetRumorId, setTargetRumorId] = useState("");
    const [relationshipType, setRelationshipType] = useState("depends_on");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: graph } = useQuery({
        queryKey: [`/api/rumors/${rumorId}/graph`],
        queryFn: async () => {
            const url = buildUrl(api.relationships.graph.path, { id: rumorId });
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch graph");
            return api.relationships.graph.responses[200].parse(
                await res.json(),
            );
        },
    });

    const { data: relationships } = useQuery({
        queryKey: [`/api/rumors/${rumorId}/relationships`],
        queryFn: async () => {
            const url = buildUrl(api.relationships.list.path, { id: rumorId });
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch relationships");
            return api.relationships.list.responses[200].parse(
                await res.json(),
            );
        },
    });

    const createRelationship = useMutation({
        mutationFn: async () => {
            const url = buildUrl(api.relationships.create.path, {
                id: rumorId,
            });
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetRumorId: targetRumorId,
                    relationshipType,
                }),
                credentials: "include",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(
                    error.message || "Failed to create relationship",
                );
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`/api/rumors/${rumorId}/graph`],
            });
            queryClient.invalidateQueries({
                queryKey: [`/api/rumors/${rumorId}/relationships`],
            });
            toast({
                title: "Relationship Created",
                description: "The rumor relationship has been established.",
            });
            setIsDialogOpen(false);
            setTargetRumorId("");
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to Create Relationship",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "verified":
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case "debunked":
                return <XCircle className="h-4 w-4 text-red-600" />;
            case "active":
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            default:
                return null;
        }
    };

    const getRelationshipTypeLabel = (type: string) => {
        switch (type) {
            case "depends_on":
                return "Depends On";
            case "related_to":
                return "Related To";
            case "contradicts":
                return "Contradicts";
            default:
                return type;
        }
    };

    return (
        <Card className="bg-card/30 border-border/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <GitBranch className="h-5 w-5" />
                        Rumor Dependencies (DAG)
                    </CardTitle>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Link2 className="h-4 w-4 mr-2" />
                                Link Rumor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Create Rumor Relationship
                                </DialogTitle>
                                <DialogDescription>
                                    Link this rumor to another rumor to track
                                    dependencies and propagate status changes.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="targetRumorId">
                                        Target Rumor ID
                                    </Label>
                                    <Input
                                        id="targetRumorId"
                                        type="number"
                                        placeholder="Enter rumor ID"
                                        value={targetRumorId}
                                        onChange={(e) =>
                                            setTargetRumorId(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="relationshipType">
                                        Relationship Type
                                    </Label>
                                    <Select
                                        value={relationshipType}
                                        onValueChange={setRelationshipType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="depends_on">
                                                Depends On
                                            </SelectItem>
                                            <SelectItem value="related_to">
                                                Related To
                                            </SelectItem>
                                            <SelectItem value="contradicts">
                                                Contradicts
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={() => createRelationship.mutate()}
                                    disabled={
                                        !targetRumorId ||
                                        createRelationship.isPending
                                    }
                                >
                                    {createRelationship.isPending
                                        ? "Creating..."
                                        : "Create Relationship"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Relationships List */}
                {relationships && relationships.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                            Connected Rumors
                        </h4>
                        <div className="space-y-2">
                            {relationships.map((rel: any) => {
                                const isParent =
                                    rel.parent_rumor_id === rumorId;
                                const connectedRumor = isParent
                                    ? rel.child
                                    : rel.parent;
                                const direction = isParent ? "→" : "←";

                                return (
                                    <div
                                        key={rel.id}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getStatusIcon(
                                                    connectedRumor?.status ||
                                                        "",
                                                )}
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    #{connectedRumor?.id}{" "}
                                                    {direction}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {getRelationshipTypeLabel(
                                                        rel.relationship_type,
                                                    )}
                                                </Badge>
                                            </div>
                                            <p className="text-sm line-clamp-2">
                                                {connectedRumor?.content ||
                                                    "Rumor details unavailable"}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Graph Visualization */}
                {graph && graph.nodes.length > 1 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                            Dependency Graph
                        </h4>
                        <div className="p-4 rounded-lg bg-secondary/20 border border-border/40">
                            <div className="space-y-3">
                                {graph.nodes.map((node) => {
                                    const isCurrentRumor = node.id === rumorId;
                                    const connectedEdges = graph.edges.filter(
                                        (e) =>
                                            e.source === node.id ||
                                            e.target === node.id,
                                    );

                                    return (
                                        <div
                                            key={node.id}
                                            className={`p-3 rounded border ${
                                                isCurrentRumor
                                                    ? "bg-primary/10 border-primary/40"
                                                    : "bg-background/50 border-border/30"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusIcon(node.status)}
                                                <span className="text-xs font-mono font-bold">
                                                    #{node.id}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {Math.round(
                                                        node.trustScore * 100,
                                                    )}
                                                    %
                                                </Badge>
                                                {isCurrentRumor && (
                                                    <Badge className="text-xs">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm line-clamp-2 text-muted-foreground">
                                                {node.content}
                                            </p>
                                            {connectedEdges.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {connectedEdges.map(
                                                        (edge, idx) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {edge.source ===
                                                                node.id
                                                                    ? "→"
                                                                    : "←"}{" "}
                                                                #
                                                                {edge.source ===
                                                                node.id
                                                                    ? edge.target
                                                                    : edge.source}
                                                            </Badge>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {(!relationships || relationships.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No relationships yet. Link this rumor to others to track
                        dependencies.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
