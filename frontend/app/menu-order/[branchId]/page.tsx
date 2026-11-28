"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getMenuTheme, type MenuDesignConfig } from "@/lib/menu-themes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BranchMenuData {
  branchId: string;
  branchName: string;
  restaurantName: string;
  tagline?: string | null;
  logoUrl: string | null;
  coverImageUrl?: string | null;
  currency: string;
  menuDesign?: MenuDesignConfig;
  tables: { id: string; number: string; name: string; status: string }[];
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      price: string;
      isVeg: boolean;
      imageUrl: string | null;
      modifierGroups: any[];
    }[];
  }[];
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

export default function CustomerQrMenuPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);

  const [orderType, setOrderType] = useState<"DINE_IN" | "DELIVERY">("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [orderPlaced, setOrderPlaced] = useState<any | null>(null);

  const menuQuery = useQuery({
    queryKey: ["public", "branch-menu", branchId],
    queryFn: () => api.get<BranchMenuData>(`/public/branch/${branchId}/menu`),
    retry: 2,
  });

  const branch = menuQuery.data;

  // Pre-select first table if dine in
  useEffect(() => {
    if (branch?.tables && branch.tables.length > 0 && !selectedTableId) {
      setSelectedTableId(branch.tables[0].id);
    }
  }, [branch, selectedTableId]);

  const updateQuantity = (
    item: { id: string; name: string; price: string; isVeg: boolean },
    delta: number,
  ) => {
    setCart((prev) => {
      const current = prev[item.id];
      const newQty = (current ? current.quantity : 0) + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: newQty,
          isVeg: item.isVeg,
        },
      };
    });
  };

  const cartList = Object.values(cart);
  const totalItems = cartList.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartList.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const placeOrderMutation = useMutation({
    mutationFn: (payload: any) =>
      api.post(`/public/branch/${branchId}/order`, payload),
    onSuccess: (data) => {
      setOrderPlaced(data);
      setCart({});
    },
  });

  const handlePlaceOrder = () => {
    if (cartList.length === 0 || placeOrderMutation.isPending) return;

    const items = cartList.map((c) => ({
      menuItemId: c.menuItemId,
      quantity: Math.max(1, Math.floor(Number(c.quantity) || 1)),
      modifierIds: [],
    }));

    if (orderType === "DINE_IN") {
      placeOrderMutation.mutate({
        orderType: "DINE_IN",
        tableId: selectedTableId || undefined,
        guestName: guestName.trim() || "Guest (QR)",
        items,
      });
    } else {
      const cleanPhone = customerPhone.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 8) {
        toast.error("Please enter a valid phone number (at least 8-10 digits) for delivery.");
        return;
      }
      if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
        toast.error("Please enter your complete delivery address.");
        return;
      }
      placeOrderMutation.mutate({
        orderType: "DELIVERY",
        customerName: customerName.trim() || "Delivery Guest",
        customerPhone: cleanPhone,
        deliveryAddress: deliveryAddress.trim(),
        pincode: pincode.trim(),
        items,
      });
    }
  };

  if (menuQuery.isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
        <Skeleton className="h-16 w-full rounded-2xl mb-4" />
        <Skeleton className="h-12 w-full rounded-2xl mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (menuQuery.isError || !branch) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <Store className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Restaurant Menu Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1">
            Could not find menu for this QR code. Please verify the link or ask staff for assistance.
          </p>
        </div>
      </main>
    );
  }

  // Order Success Screen
  if (orderPlaced) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto flex flex-col justify-between py-10">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Order Sent to Kitchen
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-3">
            Thank you, your order is placed!
          </h1>
          <p className="text-sm font-semibold text-teal-600 mt-1">
            Order #{orderPlaced.orderNumber}
          </p>

          <div className="w-full mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Service Mode</span>
                <p className="text-sm font-bold text-slate-800">
                  {orderPlaced.type === "QR_ORDER" ? "On-Table Dining" : "Direct Home Delivery"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</span>
                <p className="text-sm font-bold text-emerald-600">Active</p>
              </div>
            </div>

            <div className="py-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Kitchen order ticket (KOT) generated in real time</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Live tracking active on staff terminals</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setOrderPlaced(null)}
          className="w-full h-12 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700 mt-6"
        >
          Order Additional Items
        </Button>
      </main>
    );
  }

  // Filter Categories
  const categoriesToRender = branch.categories.filter((c) =>
    activeCategory === "ALL" ? true : c.id === activeCategory,
  );
  const design = branch.menuDesign;
  const theme = getMenuTheme(design?.themeId);
  const announcement = design?.announcement?.trim();

  return (
    <main
      className="min-h-screen max-w-lg mx-auto pb-28 transition-colors"
      style={{ backgroundColor: theme.background, color: theme.text }}
    >
      {/* Restaurant Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b px-4 py-3 shadow-2xs"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {design?.showLogo !== false && branch.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branch.logoUrl}
                alt={branch.restaurantName}
                className="h-10 w-10 rounded-xl object-cover shadow-xs"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xs"
                style={{ backgroundColor: theme.primary }}
              >
                {branch.restaurantName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold leading-tight">{branch.restaurantName}</h1>
              <p className="text-xs" style={{ color: theme.muted }}>
                {branch.tagline || branch.branchName}
              </p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: `${theme.primary}18`,
              color: theme.primary,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: theme.primary }}
            />
            Ordering Open
          </span>
        </div>

        {announcement && (
          <div
            className="mt-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: `${theme.primary}18`,
              color: theme.primary,
            }}
          >
            {announcement}
          </div>
        )}

        {/* Order Type Selector: Dine-in vs Delivery */}
        <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setOrderType("DINE_IN")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all",
              orderType === "DINE_IN"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            On Table Dining
          </button>
          <button
            type="button"
            onClick={() => setOrderType("DELIVERY")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all",
              orderType === "DELIVERY"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            Home Delivery
          </button>
        </div>
      </header>

      {/* Dine In / Delivery Configuration Box */}
      <section className="p-4">
        {orderType === "DINE_IN" ? (
          <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3.5 shadow-2xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-teal-950">Select Table</Label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-teal-200 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  {branch.tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-teal-950">Your Name (Optional)</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 h-10 rounded-xl border-teal-200 bg-white text-xs text-slate-800 shadow-xs"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 shadow-2xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-blue-950">Full Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                  className="mt-1 h-9 rounded-xl border-blue-200 bg-white text-xs text-slate-800 shadow-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-blue-950">Phone Number</Label>
                <Input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit Mobile"
                  className="mt-1 h-9 rounded-xl border-blue-200 bg-white text-xs text-slate-800 shadow-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-blue-950">Delivery Address</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Flat, Building, Street"
                  className="mt-1 h-9 rounded-xl border-blue-200 bg-white text-xs text-slate-800 shadow-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-blue-950">Pincode</Label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pin"
                  className="mt-1 h-9 rounded-xl border-blue-200 bg-white text-xs text-slate-800 shadow-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes, drinks, desserts…"
            className="h-10 rounded-xl border-slate-300 bg-white pl-9 text-xs shadow-xs"
          />
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeCategory === "ALL"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100",
            )}
          >
            All Items
          </button>
          {branch.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeCategory === c.id
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Food Items Feed */}
        <div className="space-y-6 mt-2">
          {categoriesToRender.map((category) => {
            const filteredItems = category.items.filter((item) =>
              item.name.toLowerCase().includes(search.toLowerCase()),
            );
            if (filteredItems.length === 0) return null;

            return (
              <section key={category.id}>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  {category.name}
                </h2>
                <div className="space-y-2.5">
                  {filteredItems.map((item) => {
                    const currentQty = cart[item.id]?.quantity ?? 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                          <div
                            className={cn(
                              "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border p-0.5",
                              item.isVeg ? "border-emerald-600" : "border-rose-600",
                            )}
                          >
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                item.isVeg ? "bg-emerald-600" : "bg-rose-600",
                              )}
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                            <p className="text-xs font-extrabold text-teal-700 mt-1 tabular-nums">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>

                        {/* Add / Stepper Button */}
                        <div className="shrink-0">
                          {currentQty > 0 ? (
                            <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 p-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item, -1)}
                                className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-teal-700 shadow-2xs hover:bg-teal-100"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold tabular-nums text-teal-900">
                                {currentQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item, 1)}
                                className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-teal-700 shadow-2xs hover:bg-teal-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => updateQuantity(item, 1)}
                              className="h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xs hover:bg-teal-600 hover:text-white"
                            >
                              Add +
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {/* Floating Sticky Cart Footer */}
      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between rounded-2xl bg-teal-900 text-white p-3.5 shadow-xl border border-teal-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-teal-200">
                  {totalItems} {totalItems === 1 ? "item" : "items"} selected
                </p>
                <p className="text-base font-extrabold tabular-nums">
                  {formatCurrency(subtotal)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              disabled={placeOrderMutation.isPending}
              onClick={handlePlaceOrder}
              className="h-11 rounded-xl bg-white px-5 font-bold text-xs text-teal-900 hover:bg-teal-50 shadow-md"
            >
              {placeOrderMutation.isPending ? "Placing Order…" : "Place Order →"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
