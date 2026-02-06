import { useState } from "react";
import { useCreateEvidence } from "@/hooks/use-rumors";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    FormLabel,
} from "@/components/ui/form";
import { insertEvidenceSchema } from "@shared/schema";

// Schema for the form - manually handling the boolean logic for UI
const formSchema = z.object({
    content: z.string().min(1, "Description is required"),
    url: z.string().url().optional().or(z.literal("")),
    type: z.enum(["supporting", "disputing"]),
});

type FormData = z.infer<typeof formSchema>;

interface AddEvidenceDialogProps {
    rumorId: string;
}

export function AddEvidenceDialog({ rumorId }: AddEvidenceDialogProps) {
    const [open, setOpen] = useState(false);
    const createEvidence = useCreateEvidence();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content: "",
            url: "",
            type: "supporting",
        },
    });

    const onSubmit = (data: FormData) => {
        createEvidence.mutate(
            {
                rumorId,
                content: data.content,
                url: data.url || undefined,
                isSupporting: data.type === "supporting",
            },
            {
                onSuccess: () => {
                    setOpen(false);
                    form.reset();
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Evidence
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-border/50 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>Verify or Dispute</DialogTitle>
                    <DialogDescription>
                        Contribute evidence to adjust the trust score of this
                        rumor.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 py-4"
                    >
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <Label>Stance</Label>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="grid grid-cols-2 gap-4"
                                        >
                                            <FormItem>
                                                <FormControl>
                                                    <RadioGroupItem
                                                        value="supporting"
                                                        className="peer sr-only"
                                                    />
                                                </FormControl>
                                                <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-[hsl(var(--status-verified))] peer-data-[state=checked]:bg-[hsl(var(--status-verified))]/10 [&:has([data-state=checked])]:border-[hsl(var(--status-verified))] cursor-pointer transition-all">
                                                    <ShieldCheck className="mb-2 h-6 w-6 text-[hsl(var(--status-verified))]" />
                                                    <span className="font-semibold text-[hsl(var(--status-verified))]">
                                                        Supporting
                                                    </span>
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem>
                                                <FormControl>
                                                    <RadioGroupItem
                                                        value="disputing"
                                                        className="peer sr-only"
                                                    />
                                                </FormControl>
                                                <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-destructive/5 hover:text-destructive-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/10 [&:has([data-state=checked])]:border-destructive cursor-pointer transition-all">
                                                    <ShieldAlert className="mb-2 h-6 w-6 text-destructive" />
                                                    <span className="font-semibold text-destructive">
                                                        Disputing
                                                    </span>
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Description</Label>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe your evidence or argument..."
                                            className="resize-none font-mono text-sm bg-secondary/50"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Link (Optional)</Label>
                                    <FormControl>
                                        <Input
                                            placeholder="https://..."
                                            className="bg-secondary/50 font-mono text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={createEvidence.isPending}
                                className="w-full"
                            >
                                {createEvidence.isPending
                                    ? "Submitting..."
                                    : "Submit Evidence"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
