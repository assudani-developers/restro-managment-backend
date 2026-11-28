"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileScan, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

interface OcrVariant {
  name: string;
  price: number;
}

interface OcrItem {
  name: string;
  price: number;
  description: string;
  isVeg: boolean;
  spiceLevel: "NONE" | "MILD" | "MEDIUM" | "SPICY";
  variants: OcrVariant[];
  confidence: number;
}

interface OcrCategory {
  name: string;
  items: OcrItem[];
}

interface OcrScanResult {
  categories: OcrCategory[];
  totalItems: number;
  rawLinesCount: number;
}

export function MenuOcrDialog({
  branchId,
  triggerLabel = "Scan menu photo (OCR)",
}: {
  branchId: string | null;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<OcrCategory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: (file: File) => {
      if (!branchId) throw new Error("Select a branch first");
      return api.upload<OcrScanResult>(`/menu/ocr/scan?branchId=${branchId}`, file);
    },
    onSuccess: (data) => {
      setCategories(data.categories);
      if (data.totalItems === 0) {
        toast.warning("No dishes with prices were detected. Try a clearer, well-lit photo.");
      } else {
        toast.success(`Detected ${data.totalItems} dishes across ${data.categories.length} categories!`);
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to scan menu image");
    },
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!branchId) throw new Error("Select a branch first");
      return api.post<{ createdCategories: number; createdItems: number }>(
        `/menu/ocr/import?branchId=${branchId}`,
        { categories },
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "health", branchId] });
      toast.success(
        `Imported ${res.createdItems} dishes and ${res.createdCategories} new categories!`,
      );
      setOpen(false);
      setCategories([]);
      setPreviewUrl(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to import menu");
    },
  });

  const handleFile = (file?: File) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    scanMutation.mutate(file);
  };

  const updateItem = (
    catIdx: number,
    itemIdx: number,
    patch: Partial<OcrItem>,
  ) => {
    setCategories((prev) =>
      prev.map((c, ci) =>
        ci !== catIdx
          ? c
          : {
              ...c,
              items: c.items.map((it, ii) => (ii === itemIdx ? { ...it, ...patch } : it)),
            },
      ),
    );
  };

  const removeItem = (catIdx: number, itemIdx: number) => {
    setCategories((prev) =>
      prev
        .map((c, ci) =>
          ci !== catIdx
            ? c
            : { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) },
        )
        .filter((c) => c.items.length > 0),
    );
  };

  const totalDishes = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!branchId} />
        }
      >
        <FileScan className="h-4 w-4 text-primary" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Menu Photo Scanner (OCR)
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your existing printed menu. Our offline OCR extracts sections,
            dish names, prices, Half/Full variants, and veg/non-veg tags automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition hover:border-primary/60 hover:bg-muted/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {scanMutation.isPending ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Reading your menu photo…</p>
                <p className="text-xs text-muted-foreground">
                  Repairing dish names &amp; extracting prices
                </p>
              </>
            ) : (
              <>
                <Upload className="h-7 w-7 text-primary" />
                <p className="text-sm font-semibold">
                  {previewUrl ? "Upload a different menu photo" : "Click to upload menu photo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, WebP up to 15 MB
                </p>
              </>
            )}
          </div>

          {categories.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Preview &amp; Edit ({totalDishes} dishes in {categories.length} categories)
                </p>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Ready to import
                </Badge>
              </div>

              <div className="max-h-[42vh] space-y-4 overflow-y-auto pr-1">
                {categories.map((cat, ci) => (
                  <div key={`${cat.name}-${ci}`} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Input
                        value={cat.name}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c, idx) =>
                              idx === ci ? { ...c, name: e.target.value } : c,
                            ),
                          )
                        }
                        className="h-8 max-w-xs font-semibold"
                      />
                      <span className="text-xs text-muted-foreground">
                        {cat.items.length} items
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((item, ii) => (
                        <div
                          key={`${item.name}-${ii}`}
                          className="grid grid-cols-[auto_1fr_90px_auto] items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => updateItem(ci, ii, { isVeg: !item.isVeg })}
                            title={item.isVeg ? "Veg (click to toggle)" : "Non-Veg (click to toggle)"}
                            className={`flex h-6 w-6 items-center justify-center rounded border ${
                              item.isVeg
                                ? "border-emerald-600 text-emerald-600"
                                : "border-rose-600 text-rose-600"
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                item.isVeg ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                          </button>
                          <div className="min-w-0">
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                updateItem(ci, ii, { name: e.target.value })
                              }
                              className="h-8 text-sm"
                            />
                            {item.variants.length > 0 && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Variants:{" "}
                                {item.variants.map((v) => `${v.name} ₹${v.price}`).join(" · ")}
                              </p>
                            )}
                          </div>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(ci, ii, { price: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-right font-mono text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeItem(ci, ii)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={totalDishes === 0 || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              `Import ${totalDishes} dishes`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
