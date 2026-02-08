import React, { useState, useRef } from "react";
import { useCreateRumor } from "@/hooks/use-rumors";
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
import { Label } from "@/components/ui/label";
import { Plus, ImagePlus, X, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { insertRumorSchema } from "@/shared/schema";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertRumorSchema;
type FormData = z.infer<typeof formSchema>;

export function CreateRumorDialog() {
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createRumor = useCreateRumor();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: FormData) => {
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        if (isCloudinaryConfigured()) {
          setIsUploading(true);
          try {
            imageUrl = await uploadImage(imageFile);
          } catch {
            toast({ title: "Image upload failed", description: "Rumor will be submitted without the image.", variant: "destructive" });
          }
          setIsUploading(false);
        } else {
          toast({ title: "Image upload unavailable", description: "Cloudinary is not configured. Submitting without image.", variant: "destructive" });
        }
      }
      createRumor.mutate({ ...data, imageUrl } as any, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          removeImage();
        },
      });
    } catch {
      setIsUploading(false);
    }
  };

  const isPending = createRumor.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) removeImage(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
          <Plus className="h-4 w-4" />
          Submit Rumor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            Submit Anonymous Rumor
          </DialogTitle>
          <DialogDescription>
            Share news or claims about campus events. Your identity is cryptographically hashed — no one can trace this back to you.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">What did you hear?</Label>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. The library is closing early next week due to..."
                      className="min-h-[120px] resize-none text-sm bg-secondary/50 border-border focus:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage />
                    <span className={`text-xs ${(field.value?.length || 0) > 450 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {field.value?.length || 0}/500
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Attach Image <span className="normal-case font-normal">(optional)</span></Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative group rounded-lg overflow-hidden border border-border/50 bg-secondary/30">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs font-medium">Click to add an image</span>
                  <span className="text-[10px]">PNG, JPG, GIF up to 5MB</span>
                </button>
              )}
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full font-semibold"
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading Image...</>
                ) : createRumor.isPending ? (
                  "Encrypting & Submitting..."
                ) : (
                  "Submit to Protocol"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
