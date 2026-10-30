"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Key,
  Lock,
  LogOut,
  Mail,
  Plus,
  Power,
  Search,
  Shield,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlatformStats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalBranches: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  systemHealth: string;
  version: string;
}

interface RestaurantItem {
  id: string;
  name: string;
  legalName: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  isActive: boolean;
  plan: string;
  createdAt: string;
  branchesCount: number;
  usersCount: number;
  branches: { id: string; name: string; isActive: boolean; _count: { orders: number } }[];
  owner: { id: string; name: string; email: string; isActive: boolean; createdAt: string } | null;
}

export default function SuperAdminPortalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: userResp, isLoading: userLoading } = useCurrentUser();
  const logout = useLogout();

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Form states for new restaurant
  const [restaurantName, setRestaurantName] = useState("");
  const [branchName, setBranchName] = useState("Main Outlet");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("Password123!");
  const [plan, setPlan] = useState("ENTERPRISE");

  // Success modal for created credentials
  const [createdSuccessData, setCreatedSuccessData] = useState<{
    restaurantName: string;
    ownerEmail: string;
    ownerPassword: string;
    restaurantId: string;
    plan: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const statsQuery = useQuery({
    queryKey: ["superadmin", "overview"],
    queryFn: () => api.get<PlatformStats>("/superadmin/overview"),
  });

  const restaurantsQuery = useQuery({
    queryKey: ["superadmin", "restaurants"],
    queryFn: () => api.get<RestaurantItem[]>("/superadmin/restaurants"),
  });

  const switchRestaurantMutation = useMutation({
    mutationFn: (restaurantId: string) =>
      api.post<{ token: string; restaurant: { id: string; name: string }; branchId: string | null }>(
        `/superadmin/restaurants/${restaurantId}/switch`,
      ),
    onSuccess: (data) => {
      queryClient.clear();
      toast.success(`Switched into ${data.restaurant.name}!`);
      router.push("/dashboard");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to switch restaurant");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/superadmin/restaurants/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      toast.success("Hotel status updated!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: (payload: any) =>
      api.post<{ restaurantId: string; restaurantName: string; ownerEmail: string }>("/superadmin/restaurants", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      setOnboardOpen(false);
      setCreatedSuccessData({
        restaurantName: data.restaurantName,
        ownerEmail: data.ownerEmail,
        ownerPassword,
        restaurantId: data.restaurantId,
        plan,
      });
      setRestaurantName("");
      setOwnerName("");
      setOwnerEmail("");
      toast.success("New hotel & owner onboarded successfully!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to onboard hotel");
    },
  });

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || !ownerEmail || !ownerPassword) {
      toast.error("Please fill all required fields");
      return;
    }
    createRestaurantMutation.mutate({
      restaurantName,
      branchName,
      ownerName: ownerName || "Hotel Owner",
      ownerEmail,
      ownerPassword,
      plan,
    });
  };

  const stats = statsQuery.data;
  const restaurants = restaurantsQuery.data ?? [];

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* SuperAdmin Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg">RestroCore</span>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                  SaaS Malik • SuperAdmin
                </span>
              </div>
              <p className="text-xs text-slate-500">Multi-Tenant Hotel & Platform Management Control</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Store className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
              Switch to Restaurant App
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/login") })}
              className="rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-slate-200/90 bg-white shadow-xs rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Hotels</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {stats?.totalRestaurants ?? <Skeleton className="h-8 w-12" />}
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {stats?.activeRestaurants ?? 0} Active on Platform
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="h-6 w-6" />
            </div>
          </Card>

          <Card className="p-5 border-slate-200/90 bg-white shadow-xs rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Outlets</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {stats?.totalBranches ?? <Skeleton className="h-8 w-12" />}
              </p>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                Across all registered franchises
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="h-6 w-6" />
            </div>
          </Card>

          <Card className="p-5 border-slate-200/90 bg-white shadow-xs rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform GMV</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
                {stats ? formatCurrency(stats.totalRevenue) : <Skeleton className="h-8 w-20" />}
              </p>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                Total paid sales processed
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
          </Card>

          <Card className="p-5 border-slate-200/90 bg-white shadow-xs rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Health</span>
              <p className="text-xl font-bold text-slate-900 mt-1">100% Operational</p>
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Multi-Tenant Active
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
          </Card>
        </div>

        {/* Action Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hotel & Restaurant Directory</h2>
            <p className="text-xs text-slate-500">Manage client accounts, subscription plans & activation status</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hotel or owner…"
                className="h-10 w-64 rounded-xl border-slate-300 bg-white pl-9 text-xs shadow-xs"
              />
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>

            <Button
              onClick={() => setOnboardOpen(true)}
              className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Onboard New Hotel
            </Button>
          </div>
        </div>

        {/* Hotels Table */}
        <Card className="border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Hotel / Restaurant</th>
                  <th className="px-5 py-3.5">Owner Credentials</th>
                  <th className="px-5 py-3.5">Outlets</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restaurantsQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                      Loading hotel directory…
                    </td>
                  </tr>
                )}
                {filteredRestaurants.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                          {hotel.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{hotel.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {hotel.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {hotel.owner ? (
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">{hotel.owner.name}</p>
                          <p className="text-xs text-indigo-600">{hotel.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No owner assigned</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {hotel.branchesCount} Outlets
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                        {hotel.plan}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                          hotel.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            hotel.isActive ? "bg-emerald-500" : "bg-rose-500",
                          )}
                        />
                        {hotel.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatusMutation.mutate(hotel.id)}
                          className={cn(
                            "h-8 rounded-lg text-xs font-semibold",
                            hotel.isActive
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                          )}
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />
                          {hotel.isActive ? "Suspend" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          disabled={switchRestaurantMutation.isPending}
                          onClick={() => switchRestaurantMutation.mutate(hotel.id)}
                          className="h-8 rounded-lg bg-indigo-600 border border-indigo-700 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Launch & Manage
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Onboard Hotel Modal */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              Onboard New Hotel / Restaurant
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOnboardSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Restaurant Name</Label>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. Royal Grand Palace"
                className="mt-1 h-10 rounded-xl border-slate-300"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Initial Branch / City</Label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Connaught Place Branch"
                className="mt-1 h-10 rounded-xl border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Owner Name</Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Vikram Seth"
                  className="mt-1 h-10 rounded-xl border-slate-300"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Plan</Label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800"
                >
                  <option value="STARTER">Starter Tier</option>
                  <option value="PRO">Pro Tier</option>
                  <option value="ENTERPRISE">Enterprise (Full)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Owner Email Address</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@hotel.com"
                className="mt-1 h-10 rounded-xl border-slate-300"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Initial Password</Label>
              <Input
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Password123!"
                className="mt-1 h-10 rounded-xl border-slate-300"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={createRestaurantMutation.isPending}
              className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 mt-2"
            >
              {createRestaurantMutation.isPending ? "Setting up Hotel…" : "Complete Onboarding & Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Onboard Success Credentials Modal */}
      <Dialog open={!!createdSuccessData} onOpenChange={() => setCreatedSuccessData(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-emerald-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Hotel Setup Complete!
            </DialogTitle>
          </DialogHeader>

          {createdSuccessData && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-600">
                The restaurant & owner admin account have been provisioned on RestroCore SaaS. Share these credentials with the hotel owner:
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Hotel Name:</span>
                  <span className="font-bold text-slate-900">{createdSuccessData.restaurantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Hotel ID:</span>
                  <span className="text-slate-700">{createdSuccessData.restaurantId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">SaaS Plan:</span>
                  <span className="text-purple-700 font-bold">{createdSuccessData.plan}</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Admin Email:</span>
                  <span className="font-bold text-indigo-700">{createdSuccessData.ownerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Password:</span>
                  <span className="font-bold text-emerald-700">{createdSuccessData.ownerPassword}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const text = `RestroCore Hotel Admin Login:\nURL: http://localhost:3000/login\nEmail: ${createdSuccessData.ownerEmail}\nPassword: ${createdSuccessData.ownerPassword}\nHotel: ${createdSuccessData.restaurantName}`;
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    toast.success("Credentials copied to clipboard!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 h-11 rounded-xl border-slate-300 text-xs font-bold text-slate-800"
                >
                  {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1.5 text-slate-500" />}
                  {copied ? "Copied!" : "Copy Credentials"}
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    const id = createdSuccessData.restaurantId;
                    setCreatedSuccessData(null);
                    switchRestaurantMutation.mutate(id);
                  }}
                  className="flex-1 h-11 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Launch & Manage Now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

