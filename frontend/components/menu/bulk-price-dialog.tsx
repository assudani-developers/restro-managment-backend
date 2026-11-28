"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MenuCategory } from "@/hooks/use-menu";
import { api, ApiError } from "@/lib/api";

export function BulkPriceDialog({
  branchId,
  categories,
}: {
  branchId: string | null;
  categories: MenuCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [amount, setAmount] = useState("10");
  const [categoryId, setCategoryId] = useState<string>("ALL");
  const [roundTo, setRoundTo] = useState("5");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!branchId) throw new Error("Select a branch");
      return api.post<{ updated: number; total: number }>(
        `/menu/bulk-price?branchId=${branchId}`,
        {
          mode,
          amount: Number(amount),
          categoryId: categoryId === "ALL" ? undefined : categoryId,
          roundTo: Number(roundTo) || 1,
        },
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      toast.success(`Updated prices on ${res.updated} of ${res.total} dishes.`);
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update prices");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!branchId} />
        }
      >
        <Percent className="h-4 w-4 text-primary" />
        Bulk price
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Price Editor</DialogTitle>
          <DialogDescription>
            Increase or decrease prices across your entire menu or a single category in one click.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "ALL")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Adjustment type</Label>
              <Select value={mode} onValueChange={(v) => setMode((v as "PERCENT" | "FLAT") ?? "PERCENT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Flat amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (use - to discount)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10 or -5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Round prices to nearest</Label>
            <Select value={roundTo} onValueChange={(v) => setRoundTo(v ?? "1")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Nearest ₹1</SelectItem>
                <SelectItem value="5">Nearest ₹5</SelectItem>
                <SelectItem value="10">Nearest ₹10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending || !Number(amount)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Updating…" : "Apply price change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
