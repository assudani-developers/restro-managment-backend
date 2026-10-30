"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-auth";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RestaurantOption {
  id: string;
  name: string;
  isActive: boolean;
  plan: string;
  branchesCount: number;
  owner?: { name: string; email: string } | null;
}

export function SuperAdminRestaurantSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: userResp } = useCurrentUser();
  const user = userResp?.user;
  const isSuper = Boolean(user?.isSuperAdmin || user?.roleName === "SUPERADMIN");

  const restaurantsQuery = useQuery({
    queryKey: ["superadmin", "restaurants"],
    queryFn: () => api.get<RestaurantOption[]>("/superadmin/restaurants"),
    enabled: isSuper,
  });

  const switchMutation = useMutation({
    mutationFn: (restaurantId: string) =>
      api.post<{
        token: string;
        restaurant: { id: string; name: string };
        branchId: string | null;
      }>(`/superadmin/restaurants/${restaurantId}/switch`),
    onSuccess: (data) => {
      queryClient.clear();
      if (data.branchId && typeof window !== "undefined") {
        localStorage.setItem("restrocore_active_branch", data.branchId);
      }
      toast.success(`Instant Switch: Now viewing ${data.restaurant.name}!`);
      // Reload page to re-initialize layout & queries under the new restaurant
      window.location.href = "/dashboard";
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to switch restaurant");
    },
  });

  if (!isSuper) return null;

  const restaurants = restaurantsQuery.data ?? [];
  const currentRestaurant = restaurants.find((r) => r.id === user?.restaurantId);
  const activeName = currentRestaurant?.name ?? "Demo Restaurant";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-2xs hover:bg-amber-100 transition-all focus:outline-hidden">
        <Building2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
        <span className="max-w-[130px] truncate">{activeName}</span>
        <span className="rounded bg-amber-600 px-1 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
          SaaS
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-amber-700 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-1.5 rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="px-3 py-2 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Switch Hotel (SuperAdmin Direct)
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            1-Click switch without password to any franchise
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {restaurantsQuery.isLoading && (
            <div className="p-3 text-center text-xs text-slate-400">Loading restaurants…</div>
          )}

          {restaurants.map((hotel) => {
            const isCurrent = hotel.id === user?.restaurantId;
            return (
              <DropdownMenuItem
                key={hotel.id}
                disabled={switchMutation.isPending}
                onClick={() => {
                  if (!isCurrent) {
                    switchMutation.mutate(hotel.id);
                  }
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-colors my-0.5",
                  isCurrent
                    ? "bg-amber-50/80 font-bold text-amber-950"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      isCurrent
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {hotel.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="truncate text-xs font-bold leading-tight">{hotel.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {hotel.branchesCount} outlet(s) • {hotel.plan}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      hotel.isActive ? "bg-emerald-500" : "bg-rose-500",
                    )}
                    title={hotel.isActive ? "Active" : "Suspended"}
                  />
                  {isCurrent && <Check className="h-4 w-4 text-amber-600 ml-1" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-1 bg-slate-100" />

        <div className="p-1">
          <Link
            href="/superadmin"
            className="flex items-center justify-between w-full rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Manage All Hotels Hub
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
