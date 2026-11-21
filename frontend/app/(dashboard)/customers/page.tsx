"use client";

import {
  Calendar,
  Gift,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Search,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import { useCustomers, useDeleteCustomer, type Customer } from "@/hooks/use-customers";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type FilterTab = "all" | "vip" | "wallet" | "loyalty";

export default function CustomersPage() {
  const { branchId } = useBranch();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { data: customers, isLoading } = useCustomers(branchId, search || undefined);
  const deleteCustomer = useDeleteCustomer(branchId);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // CRM Analytics
  const metrics = useMemo(() => {
    if (!customers || customers.length === 0) {
      return { total: 0, vipCount: 0, totalPoints: 0, totalWallet: 0 };
    }
    const total = customers.length;
    const vipCount = customers.filter((c) => (c.loyaltyPoints ?? 0) >= 200 || Number(c.walletBalance) > 500).length;
    const totalPoints = customers.reduce((acc, c) => acc + (c.loyaltyPoints ?? 0), 0);
    const totalWallet = customers.reduce((acc, c) => acc + Number(c.walletBalance || 0), 0);
    return { total, vipCount, totalPoints, totalWallet };
  }, [customers]);

  // Tab Filtering
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    switch (activeTab) {
      case "vip":
        return customers.filter((c) => (c.loyaltyPoints ?? 0) >= 200 || Number(c.walletBalance) > 500);
      case "wallet":
        return customers.filter((c) => Number(c.walletBalance) > 0);
      case "loyalty":
        return customers.filter((c) => (c.loyaltyPoints ?? 0) > 0);
      default:
        return customers;
    }
  }, [customers, activeTab]);

  const onDelete = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete ${customer.name ?? "this customer"}? This cannot be undone.`)) return;
    deleteCustomer.mutate(customer.id, {
      onSuccess: () => toast.success(`${customer.name ?? "Customer"} deleted`),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not delete customer"),
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "G";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const cleanPhoneForWhatsApp = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground font-display">
            Guest CRM &amp; Loyalty
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage guest profiles, VIP memberships, loyalty points, and direct messaging
          </p>
        </div>
        <AddCustomerDialog branchId={branchId} />
      </div>

      {/* CRM Overview Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Guests</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.total}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">VIP Members</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.vipCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Points</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.totalPoints.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(metrics.totalWallet)}</p>
          </div>
        </Card>
      </div>

      {/* Search & Segmentation Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Guests ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vip")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "vip" ? "bg-background text-amber-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3 w-3" /> VIP ({metrics.vipCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("loyalty")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "loyalty" ? "bg-background text-emerald-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="h-3 w-3" /> Loyalty Active
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "wallet" ? "bg-background text-indigo-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="h-3 w-3" /> With Balance
          </button>
        </div>
      </div>

      {/* Guest Directory List */}
      <Card className="flex flex-col divide-y divide-border/60 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          filteredCustomers.map((c) => {
            const isVip = (c.loyaltyPoints ?? 0) >= 200 || Number(c.walletBalance) > 500;
            const waPhone = cleanPhoneForWhatsApp(c.phone);

            return (
              <div
                key={c.id}
                className="group flex flex-col gap-3 p-4 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ring-1 ring-border shadow-xs ${
                      isVip
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 ring-amber-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getInitials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {c.name ?? "Unnamed Guest"}
                      </Link>
                      {isVip && (
                        <Badge variant="outline" className="border-amber-400/80 bg-amber-500/10 text-amber-700 text-[10px] font-semibold gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> VIP
                        </Badge>
                      )}
                      {c.allergies && (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 text-[10px]">
                          Allergy: {c.allergies}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {c.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {c.email}
                        </span>
                      )}
                      {c.address && (
                        <span className="text-[11px] truncate max-w-xs text-slate-500">
                          {c.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick CRM Actions + Loyalty Info */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {/* Points & Balance */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                      <Star className="h-3 w-3 text-emerald-600" />
                      {c.loyaltyPoints} pts
                    </span>
                    {Number(c.walletBalance) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200/80">
                        <Wallet className="h-3 w-3 text-indigo-600" />
                        {formatCurrency(c.walletBalance)}
                      </span>
                    )}
                  </div>

                  {/* Direct Contact & Management Actions */}
                  <div className="flex items-center gap-1">
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                          `Hello ${c.name ?? "Sir/Ma'am"}, greetings from Hotel Thar Heritage Resort!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">WhatsApp</span>
                      </a>
                    )}

                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Call guest"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Edit customer"
                      onClick={() => setEditingCustomer(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete customer"
                      onClick={(e) => onDelete(e, c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">No guests found</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {search ? "No profiles match your search criteria. Try a different query." : "Add guest profiles to track repeat visits, VIP perks, and room service folios."}
              </p>
            </div>
          </div>
        )}
      </Card>

      {editingCustomer && (
        <EditCustomerDialog
          branchId={branchId}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </div>
  );
}
