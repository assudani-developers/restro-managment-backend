"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  Copy,
  CreditCard,
  DollarSign,
  Edit2,
  ExternalLink,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Store,
  Table,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
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
  upiVpa?: string | null;
  upiPayeeName?: string | null;
  isActive: boolean;
  plan: string;
  createdAt: string;
  branchesCount: number;
  usersCount: number;
  branches: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    gstNumber?: string | null;
    isActive: boolean;
    _count: { orders: number };
  }[];
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    isActive: boolean;
    createdAt: string;
  } | null;
}

interface CrmTenant {
  restaurantId: string;
  restaurantName: string;
  legalName?: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  currency: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    isActive: boolean;
  } | null;
  branchesCount: number;
  totalOrders: number;
  totalGmv: number;
}

interface SubscriptionOverview {
  totalMrr: number;
  totalArr: number;
  activeSubscribers: number;
  planBreakdown: {
    STARTER: number;
    GROWTH: number;
    ENTERPRISE: number;
  };
  subscriptions: {
    id: string;
    restaurantName: string;
    plan: string;
    monthlyFee: number;
    currency: string;
    status: string;
    billingCycle: string;
    nextBillingDate: string;
    owner: { name: string; email: string; phone?: string | null } | null;
    branchesCount: number;
    createdAt: string;
  }[];
}

interface PlatformConfig {
  platformName: string;
  maintenanceMode: boolean;
  announcement: string;
  supportEmail: string;
  supportPhone: string;
  allowRegistration: boolean;
  planPrices: {
    STARTER: number;
    GROWTH: number;
    ENTERPRISE: number;
  };
}

const CUISINE_CATEGORIES = [
  "Fine Dining Restaurant",
  "Casual Dining & Bistro",
  "Cafe & Artisan Bakery",
  "Fast Food & QSR",
  "Cloud / Ghost Kitchen",
  "Pub, Brewery & Bar",
  "Buffet & Banquet Hall",
  "Food Truck & Pop-up",
];

const CURRENCIES = [
  { code: "INR", label: "INR (₹) - Indian Rupee" },
  { code: "USD", label: "USD ($) - US Dollar" },
  { code: "EUR", label: "EUR (€) - Euro" },
  { code: "AED", label: "AED (د.إ) - UAE Dirham" },
  { code: "GBP", label: "GBP (£) - British Pound" },
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
];

const SAAS_PLANS_MATRIX = [
  {
    key: "STARTER",
    name: "Starter Outlet",
    price: 49,
    priceInr: 3999,
    description: "Ideal for single-location cafes, food trucks, and small bistros.",
    badge: "Essential",
    features: [
      "1 Physical Outlet",
      "Up to 5 Staff User Accounts",
      "Cloud POS & Fast Billing",
      "Table & Order Management",
      "Standard End-of-Day Sales Reports",
      "Email Ticket Support",
    ],
  },
  {
    key: "GROWTH",
    name: "Growth Franchise",
    price: 99,
    priceInr: 7999,
    description: "For busy restaurants needing digital menus, kitchen routing, and stock.",
    badge: "Popular",
    features: [
      "Up to 3 Outlets",
      "Up to 15 Staff Accounts",
      "Cloud POS Terminal",
      "Table QR Digital Menu (Dine-in & Pay)",
      "Multi-Station Kitchen Display (KDS)",
      "Ingredient & Inventory Stock Control",
      "Customer Loyalty & Discounts",
      "Priority WhatsApp & Email Support",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise Multi-Chain",
    price: 199,
    priceInr: 15999,
    description: "Complete full-stack restaurant OS for luxury hotels, pubs, and franchises.",
    badge: "Full Suite",
    features: [
      "Unlimited Outlets & Franchises",
      "Unlimited Staff & Custom Roles",
      "Full Suite POS + QR Dining + KDS Live Sync",
      "Recipe Level Costing & Purchase Orders",
      "Direct Online Delivery & Takeaway",
      "Centralized Multi-Branch Reporting",
      "Custom Role-Based Permissions (RBAC)",
      "Dedicated 24/7 Account Manager & SLA",
    ],
  },
];

export default function SuperAdminHubPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: userResp } = useCurrentUser();
  const user = userResp?.user;

  // Active Hub Tab
  const [activeTab, setActiveTab] = useState<"hotels" | "crm" | "plans" | "billing" | "config">("hotels");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Onboarding Modal Stepper State (4 steps)
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardStep, setOnboardStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Brand & Entity
  const [restaurantName, setRestaurantName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [category, setCategory] = useState("Fine Dining Restaurant");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [gstNumber, setGstNumber] = useState("");

  // Step 2: Outlet & Kitchen Architecture
  const [branchName, setBranchName] = useState("Main Flagship Outlet");
  const [branchAddress, setBranchAddress] = useState("Connaught Place, Central Ring");
  const [branchPhone, setBranchPhone] = useState("+91 98765 43210");
  const [tableCount, setTableCount] = useState<number>(12);
  const [kitchenStations, setKitchenStations] = useState<string[]>([
    "Main Kitchen",
    "Bar Counter",
    "Tandoor & Grill",
  ]);

  // Step 3: Owner Credentials & Access
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("Owner@2026!");

  // Step 4: SaaS Plan & Entitlements
  const [plan, setPlan] = useState("ENTERPRISE");
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [enabledModules, setEnabledModules] = useState({
    qrMenu: true,
    kds: true,
    pos: true,
    inventory: true,
    delivery: true,
    loyalty: true,
  });

  // Success Confirmation State
  const [createdSuccessData, setCreatedSuccessData] = useState<{
    restaurantName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerPhone?: string;
    restaurantId: string;
    plan: string;
    tableCount: number;
    stationsCount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Inspector & Outlets Drawer
  const [inspectHotel, setInspectHotel] = useState<RestaurantItem | null>(null);

  // --- EDIT MODAL STATES ---
  // 1. Edit Hotel Modal
  const [editHotelModal, setEditHotelModal] = useState<RestaurantItem | null>(null);
  const [editHotelForm, setEditHotelForm] = useState({
    name: "",
    legalName: "",
    plan: "ENTERPRISE",
    currency: "INR",
    timezone: "Asia/Kolkata",
    upiVpa: "",
    upiPayeeName: "",
    isActive: true,
  });

  // 2. Edit Owner / Password Reset Modal
  const [editOwnerModal, setEditOwnerModal] = useState<{
    restaurantId: string;
    restaurantName: string;
    owner: RestaurantItem["owner"];
  } | null>(null);
  const [editOwnerForm, setEditOwnerForm] = useState({
    name: "",
    email: "",
    phone: "",
    newPassword: "",
  });

  // 3. Add Outlet Modal
  const [addBranchHotelId, setAddBranchHotelId] = useState<string | null>(null);
  const [addBranchForm, setAddBranchForm] = useState({
    name: "",
    address: "",
    phone: "",
    gstNumber: "",
  });

  // 4. Edit Branch Modal
  const [editBranchModal, setEditBranchModal] = useState<{
    branchId: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    gstNumber?: string | null;
    isActive: boolean;
  } | null>(null);

  // Queries
  const statsQuery = useQuery({
    queryKey: ["superadmin", "overview"],
    queryFn: () => api.get<PlatformStats>("/superadmin/overview"),
  });

  const restaurantsQuery = useQuery({
    queryKey: ["superadmin", "restaurants"],
    queryFn: () => api.get<RestaurantItem[]>("/superadmin/restaurants"),
  });

  const crmQuery = useQuery({
    queryKey: ["superadmin", "crm"],
    queryFn: () => api.get<CrmTenant[]>("/superadmin/crm"),
    enabled: activeTab === "crm",
  });

  const subscriptionsQuery = useQuery({
    queryKey: ["superadmin", "subscriptions"],
    queryFn: () => api.get<SubscriptionOverview>("/superadmin/subscriptions"),
    enabled: activeTab === "billing",
  });

  const configQuery = useQuery({
    queryKey: ["superadmin", "config"],
    queryFn: () => api.get<PlatformConfig>("/superadmin/config"),
    enabled: activeTab === "config",
  });

  // Config edit state
  const [configForm, setConfigForm] = useState<Partial<PlatformConfig>>({});

  // Mutations
  const switchRestaurantMutation = useMutation({
    mutationFn: (restaurantId: string) =>
      api.post<{ token: string; restaurant: { id: string; name: string }; branchId: string | null }>(
        `/superadmin/restaurants/${restaurantId}/switch`,
      ),
    onSuccess: (data) => {
      queryClient.clear();
      if (data.branchId && typeof window !== "undefined") {
        localStorage.setItem("restrocore_active_branch", data.branchId);
      }
      toast.success(`Instant Switch: Now viewing ${data.restaurant.name}!`);
      window.location.href = "/dashboard";
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to switch restaurant");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/superadmin/restaurants/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      toast.success("Hotel real-time status updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/superadmin/restaurants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      setEditHotelModal(null);
      toast.success("Hotel details updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update hotel");
    },
  });

  const updateOwnerMutation = useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: any }) =>
      api.patch(`/superadmin/restaurants/${restaurantId}/owner`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      setEditOwnerModal(null);
      toast.success("Owner credentials updated & password reset successfully!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update owner");
    },
  });

  const addBranchMutation = useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: any }) =>
      api.post(`/superadmin/restaurants/${restaurantId}/branches`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      setAddBranchHotelId(null);
      setInspectHotel(null);
      toast.success("New branch outlet added with tables successfully!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to add branch");
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: any }) =>
      api.patch(`/superadmin/branches/${branchId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      setEditBranchModal(null);
      setInspectHotel(null);
      toast.success("Branch outlet updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update branch");
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: any) => api.patch("/superadmin/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "config"] });
      toast.success("Platform system configuration saved!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to save configuration");
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/restaurants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      toast.success("Hotel account purged successfully");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete hotel");
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: (payload: any) =>
      api.post<{
        restaurantId: string;
        restaurantName: string;
        ownerEmail: string;
        ownerPhone?: string;
        tableCount: number;
        stationsCount: number;
      }>("/superadmin/restaurants", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin"] });
      setOnboardOpen(false);
      setCreatedSuccessData({
        restaurantName: data.restaurantName,
        ownerEmail: data.ownerEmail,
        ownerPassword,
        ownerPhone: data.ownerPhone,
        restaurantId: data.restaurantId,
        plan,
        tableCount: data.tableCount,
        stationsCount: data.stationsCount,
      });
      // Reset form
      setRestaurantName("");
      setLegalName("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPhone("");
      setOnboardStep(1);
      toast.success("Full hotel franchise onboarded with tables & stations ready!");
    },
    onError: (err: any) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to onboard hotel");
    },
  });

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      toast.error("Please fill in Restaurant Name, Owner Email, and Password");
      return;
    }
    createRestaurantMutation.mutate({
      restaurantName,
      legalName: legalName || `${restaurantName} Hospitality Pvt Ltd`,
      currency,
      timezone,
      branchName: branchName || "Main Outlet",
      branchAddress,
      branchPhone,
      gstNumber,
      country: currency === "INR" ? "IN" : currency === "USD" ? "US" : "ES",
      tableCount: Number(tableCount) || 12,
      kitchenStations,
      ownerName: ownerName || "Hotel Administrator",
      ownerEmail,
      ownerPassword,
      ownerPhone,
      plan,
    });
  };

  const copyCredentials = () => {
    if (!createdSuccessData) return;
    const text = `RestroCore Hotel Onboarded!\nHotel: ${createdSuccessData.restaurantName}\nPlan: ${createdSuccessData.plan}\nTables: ${createdSuccessData.tableCount}\nLogin URL: http://localhost:3000/login\nEmail: ${createdSuccessData.ownerEmail}\nPassword: ${createdSuccessData.ownerPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials & Onboarding Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const openEditHotel = (hotel: RestaurantItem) => {
    setEditHotelModal(hotel);
    setEditHotelForm({
      name: hotel.name,
      legalName: hotel.legalName || "",
      plan: hotel.plan || "ENTERPRISE",
      currency: hotel.currency || "INR",
      timezone: hotel.timezone || "Asia/Kolkata",
      upiVpa: hotel.upiVpa || "",
      upiPayeeName: hotel.upiPayeeName || "",
      isActive: hotel.isActive,
    });
  };

  const openEditOwner = (hotel: RestaurantItem) => {
    setEditOwnerModal({
      restaurantId: hotel.id,
      restaurantName: hotel.name,
      owner: hotel.owner,
    });
    setEditOwnerForm({
      name: hotel.owner?.name || "",
      email: hotel.owner?.email || "",
      phone: hotel.owner?.phone || "",
      newPassword: "",
    });
  };

  const stats = statsQuery.data;
  const restaurants = restaurantsQuery.data ?? [];

  // Filter restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      (r.owner?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.owner?.email ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesPlan = planFilter === "ALL" || r.plan?.toUpperCase() === planFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && r.isActive) ||
      (statusFilter === "SUSPENDED" && !r.isActive);

    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 min-h-full pb-8">
      {/* SuperAdmin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              SuperAdmin Command Hub
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
              <Sparkles className="h-3 w-3 text-amber-600" />
              SaaS Malik Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete platform management: live editing of hotels, branches, owner credentials, subscriptions & announcements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setOnboardStep(1);
              setOnboardOpen(true);
            }}
            className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 shadow-sm shadow-teal-600/25 gap-2"
          >
            <Plus className="h-4 w-4" />
            Onboard New Hotel
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200/90 bg-white shadow-xs rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Hotels</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {stats?.totalRestaurants ?? <Skeleton className="h-8 w-12" />}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {stats?.activeRestaurants ?? 0} Active on Platform
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Building className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-5 border-slate-200/90 bg-white shadow-xs rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Outlets</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {stats?.totalBranches ?? <Skeleton className="h-8 w-12" />}
            </div>
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
            <div className="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
              {stats ? formatCurrency(stats.totalRevenue) : <Skeleton className="h-8 w-20" />}
            </div>
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
            <div className="text-sm font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Operational
            </div>
            <span className="text-[11px] text-slate-400 font-mono mt-1 inline-block">
              PostgreSQL 18 &bull; Socket.IO
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Hub Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-px">
          {[
            { id: "hotels", label: "Hotels & Outlets", icon: Building, count: restaurants.length },
            { id: "crm", label: "Tenant CRM & Directory", icon: Users },
            { id: "plans", label: "SaaS Plans & Matrix", icon: Layers },
            { id: "billing", label: "Subscriptions & Billing", icon: CreditCard },
            { id: "config", label: "System Configuration", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                  isActive
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300",
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-teal-600" : "text-slate-400")} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums",
                      isActive ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: HOTELS & OUTLETS (EDITABLE) */}
      {activeTab === "hotels" && (
        <Card className="border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Hotels & Franchises</h2>
              <p className="text-xs text-slate-500">
                Live edit hotel parameters, add/edit outlets, reset owner passwords, and 1-click instant switch
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hotels, owners, emails…"
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50"
                />
              </div>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Plans</option>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Hotel / Restaurant</th>
                  <th className="px-5 py-3.5">Owner & Credentials</th>
                  <th className="px-5 py-3.5">Outlets</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Platform Status</th>
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
                {!restaurantsQuery.isLoading && filteredRestaurants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-xs text-slate-400">
                      No hotels match the current search filter.
                    </td>
                  </tr>
                )}
                {filteredRestaurants.map((hotel) => {
                  const isCurrent = hotel.id === user?.restaurantId;
                  return (
                    <tr key={hotel.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-extrabold text-sm shrink-0">
                            {hotel.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 leading-tight text-sm">{hotel.name}</p>
                              {isCurrent && (
                                <span className="rounded bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 uppercase">
                                  Current View
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {hotel.legalName || "Hospitality Entity"} &bull; {hotel.currency}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {hotel.owner ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-900 text-xs">{hotel.owner.name}</p>
                              <button
                                type="button"
                                onClick={() => openEditOwner(hotel)}
                                className="text-slate-400 hover:text-teal-600 transition-colors p-0.5"
                                title="Edit owner or reset password"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-teal-600 font-mono mt-0.5">{hotel.owner.email}</p>
                            {hotel.owner.phone && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{hotel.owner.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No owner assigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setInspectHotel(hotel)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors"
                          title="Click to manage all branches"
                        >
                          <Store className="h-3.5 w-3.5 text-slate-500" />
                          <span>{hotel.branchesCount} Outlets</span>
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openEditHotel(hotel)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-bold border transition-colors hover:ring-2 hover:ring-teal-200",
                            hotel.plan === "ENTERPRISE"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : hotel.plan === "GROWTH"
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-slate-100 text-slate-700 border-slate-200",
                          )}
                          title="Click to edit plan & tier"
                        >
                          {hotel.plan}
                        </button>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditHotel(hotel)}
                            className="h-8 rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
                            title="Edit Hotel Details"
                          >
                            <Pencil className="h-3 w-3 mr-1 text-slate-500" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleStatusMutation.mutate(hotel.id)}
                            className={cn(
                              "h-8 rounded-xl text-xs font-semibold",
                              hotel.isActive
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                            )}
                          >
                            <Power className="h-3 w-3 mr-1" />
                            {hotel.isActive ? "Suspend" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            disabled={switchRestaurantMutation.isPending}
                            onClick={() => switchRestaurantMutation.mutate(hotel.id)}
                            className={cn(
                              "h-8 rounded-xl text-xs font-bold transition-all shadow-2xs",
                              isCurrent
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-teal-600 border border-teal-700 text-white hover:bg-teal-700",
                            )}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {isCurrent ? "Active" : "1-Click"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: TENANT CRM & DIRECTORY */}
      {activeTab === "crm" && (
        <Card className="border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600" />
                Global Tenant CRM & Hotel Owners
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contact information, total sales processed, lifetime orders, direct WhatsApp & edit credentials
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {crmQuery.isLoading && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                Loading tenant CRM contacts…
              </div>
            )}
            {crmQuery.data?.map((client) => {
              const waUrl = client.owner?.phone
                ? `https://wa.me/${client.owner.phone.replace(/[^0-9]/g, "")}`
                : undefined;
              const matchingHotel = restaurants.find((r) => r.id === client.restaurantId);
              return (
                <Card
                  key={client.restaurantId}
                  className="p-4.5 rounded-2xl border-slate-200/90 bg-slate-50/50 shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {client.owner?.name?.charAt(0).toUpperCase() || "H"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {client.owner?.name || "Unassigned Admin"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">{client.restaurantName}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase",
                          client.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
                        )}
                      >
                        {client.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-teal-600 truncate">{client.owner?.email || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.owner?.phone || "No phone registered"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.branchesCount} Outlets &bull; {client.plan} Plan</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-white p-2 border border-slate-100 shadow-2xs">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Total Orders</p>
                        <p className="text-sm font-extrabold text-slate-800 tabular-nums">{client.totalOrders}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-slate-100 shadow-2xs">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Processed GMV</p>
                        <p className="text-sm font-extrabold text-emerald-600 tabular-nums">
                          {formatCurrency(client.totalGmv)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 transition-colors shadow-2xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                    {client.owner?.phone && (
                      <a
                        href={`tel:${client.owner.phone}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-8.5 px-3 text-xs font-semibold transition-colors"
                        title="Call Client"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {matchingHotel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditOwner(matchingHotel)}
                        className="rounded-xl border-slate-200 text-slate-700 h-8.5 px-3 text-xs font-semibold"
                        title="Edit Owner & Reset Password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => switchRestaurantMutation.mutate(client.restaurantId)}
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8.5 px-3"
                      title="Impersonate & Switch"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 3: SAAS PLANS & FEATURE MATRIX */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-600" />
              SaaS Subscription Plans & Feature Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tiers, feature limits, monthly billing pricing, and active platform subscriber allocation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SAAS_PLANS_MATRIX.map((tier) => {
              const activeCount = restaurants.filter((r) => r.plan?.toUpperCase() === tier.key).length;
              return (
                <Card
                  key={tier.key}
                  className={cn(
                    "p-6 rounded-3xl border bg-white shadow-xs flex flex-col justify-between gap-6 transition-all",
                    tier.key === "ENTERPRISE" ? "border-amber-300 ring-2 ring-amber-400/20" : "border-slate-200/90",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        {tier.badge}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                        {activeCount} Hotels Subscribed
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mt-2">{tier.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tier.description}</p>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">${tier.price}</span>
                      <span className="text-xs text-slate-500 font-medium">/ month (or ₹{tier.priceInr})</span>
                    </div>

                    <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-medium">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => {
                      setPlan(tier.key);
                      setOnboardStep(1);
                      setOnboardOpen(true);
                    }}
                    className={cn(
                      "w-full h-10 rounded-xl font-bold text-xs shadow-2xs",
                      tier.key === "ENTERPRISE"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-teal-600 hover:bg-teal-700 text-white",
                    )}
                  >
                    Onboard Hotel on {tier.name}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTIONS & BILLING */}
      {activeTab === "billing" && (
        <Card className="border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-teal-600" />
                SaaS Subscription Revenue & Invoicing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), and tenant billing status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated MRR</span>
              <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                ${subscriptionsQuery.data?.totalMrr ?? 0}
              </p>
              <span className="text-[11px] text-slate-400">Monthly Recurring Revenue</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Projected ARR</span>
              <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                ${subscriptionsQuery.data?.totalArr ?? 0}
              </p>
              <span className="text-[11px] text-slate-400">Annual Run-Rate</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paying Clients</span>
              <p className="text-2xl font-black text-teal-600 mt-1 tabular-nums">
                {subscriptionsQuery.data?.activeSubscribers ?? 0}
              </p>
              <span className="text-[11px] text-slate-400">Active platform tenants</span>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tenant Hotel</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Monthly Charge</th>
                  <th className="px-4 py-3">Billing Cycle</th>
                  <th className="px-4 py-3">Next Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Edit Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptionsQuery.isLoading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                      Loading subscription records…
                    </td>
                  </tr>
                )}
                {subscriptionsQuery.data?.subscriptions.map((sub) => {
                  const match = restaurants.find((r) => r.id === sub.id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{sub.restaurantName}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">${sub.monthlyFee}/mo</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{sub.billingCycle}</td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono">
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold",
                            sub.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200",
                          )}
                        >
                          {sub.status === "ACTIVE" ? "Paid & Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {match && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditHotel(match)}
                            className="h-7 text-xs rounded-lg px-2.5"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: SYSTEM CONFIGURATION & EDITABLE SETTINGS */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-teal-600" />
                Global Platform Settings (Editable)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Update platform branding, live broadcast announcement banner, and maintenance mode
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateConfigMutation.mutate(configForm);
              }}
              className="space-y-3.5 pt-2 text-xs"
            >
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">SaaS Platform Name</Label>
                <Input
                  defaultValue={configQuery.data?.platformName || "RestroCore SaaS Enterprise"}
                  onChange={(e) => setConfigForm({ ...configForm, platformName: e.target.value })}
                  className="mt-1 h-9.5 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Global Broadcast Announcement Banner
                </Label>
                <textarea
                  rows={2}
                  defaultValue={
                    configQuery.data?.announcement ||
                    "RestroCore Cloud 2.0 is live. All POS, KDS & QR systems are operational."
                  }
                  onChange={(e) => setConfigForm({ ...configForm, announcement: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800"
                  placeholder="Broadcast message to all hotel terminals & staff"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Support Email</Label>
                  <Input
                    defaultValue={configQuery.data?.supportEmail || "support@restrocore.com"}
                    onChange={(e) => setConfigForm({ ...configForm, supportEmail: e.target.value })}
                    className="mt-1 h-9.5 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Support Phone</Label>
                  <Input
                    defaultValue={configQuery.data?.supportPhone || "+91 80000 12345"}
                    onChange={(e) => setConfigForm({ ...configForm, supportPhone: e.target.value })}
                    className="mt-1 h-9.5 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Platform Maintenance Mode</p>
                  <p className="text-[11px] text-slate-500">Lock non-superadmin access during critical updates</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfigForm({
                      ...configForm,
                      maintenanceMode: !Boolean(configForm.maintenanceMode ?? configQuery.data?.maintenanceMode),
                    })
                  }
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold border transition-colors",
                    (configForm.maintenanceMode ?? configQuery.data?.maintenanceMode)
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100",
                  )}
                >
                  {(configForm.maintenanceMode ?? configQuery.data?.maintenanceMode) ? "Enabled (Locked)" : "Disabled (Live)"}
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  className="h-9.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 gap-1.5 shadow-2xs"
                >
                  <Save className="h-4 w-4" />
                  {updateConfigMutation.isPending ? "Saving…" : "Save Platform Config"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="h-5 w-5 text-teal-600" />
              Platform Infrastructure Health
            </h3>
            <p className="text-xs text-slate-500">
              Live database, WebSocket gateway, and backend services health monitors
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="font-bold text-slate-900">PostgreSQL 18 Database</p>
                    <p className="text-slate-500 text-[11px]">Port 5432 &bull; Connection pool healthy</p>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold">1ms latency</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="font-bold text-slate-900">Socket.IO Realtime Engine</p>
                    <p className="text-slate-500 text-[11px]">Live order ticket & status push active</p>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold">Connected</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="font-bold text-slate-900">RestroCore API Gateway</p>
                    <p className="text-slate-500 text-[11px]">Port 4001 &bull; NestJS Modular Engine</p>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold">v2.0-SaaS</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/60 border border-teal-200">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <div>
                    <p className="font-bold text-slate-900">Session Policy</p>
                    <p className="text-slate-500 text-[11px]">Auto-logout disabled &bull; 365 Days persistent login</p>
                  </div>
                </div>
                <span className="text-teal-700 font-bold">Active</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- EDIT HOTEL DETAILS DIALOG --- */}
      <Dialog open={Boolean(editHotelModal)} onOpenChange={(open) => !open && setEditHotelModal(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-teal-600" />
              Edit Hotel: {editHotelModal?.name}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editHotelModal) return;
              updateRestaurantMutation.mutate({
                id: editHotelModal.id,
                data: editHotelForm,
              });
            }}
            className="space-y-4 pt-3 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Restaurant Name *</Label>
                <Input
                  value={editHotelForm.name}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, name: e.target.value })}
                  className="mt-1 h-10 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Legal Entity Name</Label>
                <Input
                  value={editHotelForm.legalName}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, legalName: e.target.value })}
                  className="mt-1 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">SaaS Plan</Label>
                <select
                  value={editHotelForm.plan}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, plan: e.target.value })}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="STARTER">STARTER</option>
                  <option value="GROWTH">GROWTH</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Currency</Label>
                <select
                  value={editHotelForm.currency}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, currency: e.target.value })}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Timezone</Label>
                <select
                  value={editHotelForm.timezone}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, timezone: e.target.value })}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  UPI VPA (QR Payment)
                </Label>
                <Input
                  value={editHotelForm.upiVpa}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, upiVpa: e.target.value })}
                  placeholder="e.g. merchant@okhdfcbank"
                  className="mt-1 h-10 rounded-xl font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">UPI Payee Name</Label>
                <Input
                  value={editHotelForm.upiPayeeName}
                  onChange={(e) => setEditHotelForm({ ...editHotelForm, upiPayeeName: e.target.value })}
                  placeholder="e.g. Royal Palace Foods"
                  className="mt-1 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
              <div>
                <p className="font-bold text-slate-900">Platform Account Active</p>
                <p className="text-[11px] text-slate-500">Uncheck to instantly suspend terminal operations</p>
              </div>
              <input
                type="checkbox"
                checked={editHotelForm.isActive}
                onChange={(e) => setEditHotelForm({ ...editHotelForm, isActive: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-teal-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditHotelModal(null)}
                className="h-10 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateRestaurantMutation.isPending}
                className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 shadow-2xs"
              >
                {updateRestaurantMutation.isPending ? "Saving…" : "Save Hotel Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT OWNER & RESET PASSWORD DIALOG --- */}
      <Dialog open={Boolean(editOwnerModal)} onOpenChange={(open) => !open && setEditOwnerModal(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-teal-600" />
              Owner & Password: {editOwnerModal?.restaurantName}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editOwnerModal) return;
              updateOwnerMutation.mutate({
                restaurantId: editOwnerModal.restaurantId,
                data: {
                  name: editOwnerForm.name,
                  email: editOwnerForm.email,
                  phone: editOwnerForm.phone,
                  ...(editOwnerForm.newPassword ? { password: editOwnerForm.newPassword } : {}),
                },
              });
            }}
            className="space-y-3.5 pt-3 text-xs"
          >
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Owner Full Name *</Label>
              <Input
                value={editOwnerForm.name}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, name: e.target.value })}
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Login Email Address *</Label>
              <Input
                type="email"
                value={editOwnerForm.email}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, email: e.target.value })}
                className="mt-1 h-10 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Mobile / WhatsApp</Label>
              <Input
                value={editOwnerForm.phone}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, phone: e.target.value })}
                className="mt-1 h-10 rounded-xl font-mono"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <Label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Reset Password (Optional)
              </Label>
              <Input
                type="text"
                placeholder="Leave blank to keep unchanged"
                value={editOwnerForm.newPassword}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, newPassword: e.target.value })}
                className="h-10 rounded-xl font-mono bg-white border-amber-300"
              />
              <p className="text-[11px] text-amber-800">
                Entering a new password here will immediately overwrite the owner&apos;s credentials.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOwnerModal(null)}
                className="h-10 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateOwnerMutation.isPending}
                className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 shadow-2xs"
              >
                {updateOwnerMutation.isPending ? "Updating…" : "Update Owner & Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MULTI-BRANCH INSPECTOR & OUTLET MANAGER DIALOG --- */}
      <Dialog open={Boolean(inspectHotel)} onOpenChange={(open) => !open && setInspectHotel(null)}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-teal-600" />
                {inspectHotel?.name} &mdash; Outlets & Branches
              </DialogTitle>
              {inspectHotel && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAddBranchHotelId(inspectHotel.id);
                    setAddBranchForm({ name: "", address: "", phone: "", gstNumber: "" });
                  }}
                  className="h-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Outlet
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            {inspectHotel?.branches?.map((branch) => (
              <div
                key={branch.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">{branch.name}</p>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 text-[10px] font-bold uppercase",
                        branch.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
                      )}
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {branch.address && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" /> {branch.address}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> {branch.phone}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    {branch._count?.orders ?? 0} Orders
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditBranchModal({
                        branchId: branch.id,
                        name: branch.name,
                        address: branch.address,
                        phone: branch.phone,
                        gstNumber: branch.gstNumber,
                        isActive: branch.isActive,
                      })
                    }
                    className="h-8 rounded-xl text-xs font-semibold"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit Outlet
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- ADD NEW BRANCH MODAL --- */}
      <Dialog open={Boolean(addBranchHotelId)} onOpenChange={(open) => !open && setAddBranchHotelId(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              Add New Outlet / Branch
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!addBranchHotelId) return;
              addBranchMutation.mutate({
                restaurantId: addBranchHotelId,
                data: addBranchForm,
              });
            }}
            className="space-y-3.5 pt-3 text-xs"
          >
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Outlet Name *</Label>
              <Input
                value={addBranchForm.name}
                onChange={(e) => setAddBranchForm({ ...addBranchForm, name: e.target.value })}
                placeholder="e.g. South Extension Branch"
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Address</Label>
              <Input
                value={addBranchForm.address}
                onChange={(e) => setAddBranchForm({ ...addBranchForm, address: e.target.value })}
                placeholder="e.g. Ring Road, South Extension"
                className="mt-1 h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Phone</Label>
                <Input
                  value={addBranchForm.phone}
                  onChange={(e) => setAddBranchForm({ ...addBranchForm, phone: e.target.value })}
                  placeholder="e.g. +91 99999 33333"
                  className="mt-1 h-10 rounded-xl font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">GSTIN / Tax ID</Label>
                <Input
                  value={addBranchForm.gstNumber}
                  onChange={(e) => setAddBranchForm({ ...addBranchForm, gstNumber: e.target.value })}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="mt-1 h-10 rounded-xl font-mono uppercase"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddBranchHotelId(null)}
                className="h-10 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addBranchMutation.isPending}
                className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 shadow-2xs"
              >
                {addBranchMutation.isPending ? "Creating…" : "Create Outlet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT BRANCH MODAL --- */}
      <Dialog open={Boolean(editBranchModal)} onOpenChange={(open) => !open && setEditBranchModal(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-teal-600" />
              Edit Outlet: {editBranchModal?.name}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editBranchModal) return;
              updateBranchMutation.mutate({
                branchId: editBranchModal.branchId,
                data: editBranchModal,
              });
            }}
            className="space-y-3.5 pt-3 text-xs"
          >
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Outlet Name *</Label>
              <Input
                value={editBranchModal?.name || ""}
                onChange={(e) => setEditBranchModal({ ...editBranchModal!, name: e.target.value })}
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Street Address</Label>
              <Input
                value={editBranchModal?.address || ""}
                onChange={(e) => setEditBranchModal({ ...editBranchModal!, address: e.target.value })}
                className="mt-1 h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Phone</Label>
                <Input
                  value={editBranchModal?.phone || ""}
                  onChange={(e) => setEditBranchModal({ ...editBranchModal!, phone: e.target.value })}
                  className="mt-1 h-10 rounded-xl font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">GSTIN / Tax ID</Label>
                <Input
                  value={editBranchModal?.gstNumber || ""}
                  onChange={(e) => setEditBranchModal({ ...editBranchModal!, gstNumber: e.target.value })}
                  className="mt-1 h-10 rounded-xl font-mono uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
              <div>
                <p className="font-bold text-slate-900">Outlet Active</p>
                <p className="text-[11px] text-slate-500">Uncheck to pause operations at this location</p>
              </div>
              <input
                type="checkbox"
                checked={editBranchModal?.isActive ?? true}
                onChange={(e) => setEditBranchModal({ ...editBranchModal!, isActive: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-teal-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditBranchModal(null)}
                className="h-10 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateBranchMutation.isPending}
                className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 shadow-2xs"
              >
                {updateBranchMutation.isPending ? "Saving…" : "Save Outlet Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- COMPREHENSIVE MULTI-STEP HOTEL ONBOARDING MODAL --- */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2.5">
              <Building className="h-5 w-5 text-teal-600" />
              Onboard New Hotel / Restaurant
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure brand details, outlets, kitchen stations, tables, and owner root credentials
            </p>
          </DialogHeader>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-4 gap-2 pt-2 pb-1">
            {[
              { num: 1, label: "Brand" },
              { num: 2, label: "Outlets & KDS" },
              { num: 3, label: "Owner ID" },
              { num: 4, label: "SaaS Plan" },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setOnboardStep(s.num as any)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border",
                  onboardStep === s.num
                    ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                    : onboardStep > s.num
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-slate-200",
                )}
              >
                <span>{s.num}.</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-4 pt-3">
            {/* STEP 1: BRAND & BUSINESS ENTITY */}
            {onboardStep === 1 && (
              <div className="space-y-3.5">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Restaurant Brand Name *
                  </Label>
                  <Input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Royal Palace & Brewery"
                    className="mt-1 h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Legal Business Entity
                    </Label>
                    <Input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. Royal Hospitality Pvt Ltd"
                      className="mt-1 h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cuisine / Concept
                    </Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      {CUISINE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Currency</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Timezone</Label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">GSTIN / Tax ID</Label>
                    <Input
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="mt-1 h-10 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!restaurantName.trim()) {
                        toast.error("Please enter Restaurant Name");
                        return;
                      }
                      setOnboardStep(2);
                    }}
                    className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5"
                  >
                    Next: Outlets & Kitchen &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: OUTLET & KITCHEN ARCHITECTURE */}
            {onboardStep === 2 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Flagship Outlet Name *
                    </Label>
                    <Input
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Flagship - Connaught Place"
                      className="mt-1 h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Branch Contact Phone
                    </Label>
                    <Input
                      value={branchPhone}
                      onChange={(e) => setBranchPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="mt-1 h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Outlet Street Address</Label>
                  <Input
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="e.g. 14 Inner Circle, Connaught Place, New Delhi"
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tables to Auto-Generate (Pre-configured floor plan)
                  </Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={tableCount}
                      onChange={(e) => setTableCount(Number(e.target.value))}
                      className="h-10 w-28 rounded-xl font-bold tabular-nums"
                    />
                    <span className="text-xs text-slate-500">
                      Automatically creates Table 1 through Table {tableCount} with QR codes ready.
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Kitchen Display Stations (KDS Routing)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                    {["Main Kitchen", "Bar Counter", "Tandoor & Grill", "Bakery & Desserts", "Coffee Station"].map(
                      (st) => {
                        const isChecked = kitchenStations.includes(st);
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setKitchenStations(kitchenStations.filter((x) => x !== st));
                              } else {
                                setKitchenStations([...kitchenStations, st]);
                              }
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2",
                              isChecked
                                ? "border-teal-600 bg-teal-50/70 text-teal-900 font-bold"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            <span
                              className={cn(
                                "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                isChecked ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300",
                              )}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </span>
                            <span>{st}</span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnboardStep(1)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  >
                    &larr; Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOnboardStep(3)}
                    className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5"
                  >
                    Next: Owner ID &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: OWNER CREDENTIALS & ACCESS */}
            {onboardStep === 3 && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-xs text-amber-900 font-medium flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Root Hotel Administrator Account</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      This owner ID will be granted full administrative root privileges for this hotel, with all 33 system
                      permissions enabled.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Owner Full Name *
                    </Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="mt-1 h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Owner Mobile / WhatsApp *
                    </Label>
                    <Input
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g. +91 98111 22334"
                      className="mt-1 h-10 rounded-xl font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Official Login Email *
                  </Label>
                  <Input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. ramesh@royalpalace.com"
                    className="mt-1 h-10 rounded-xl font-mono"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Initial Password *</Label>
                  <Input
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Set temporary secure password"
                    className="mt-1 h-10 rounded-xl font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    SuperAdmin can reset or re-issue this password anytime.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnboardStep(2)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  >
                    &larr; Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
                        toast.error("Please fill in Owner Name, Email, and Password");
                        return;
                      }
                      setOnboardStep(4);
                    }}
                    className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5"
                  >
                    Next: SaaS Plan &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: SAAS PLAN & MODULE ENTITLEMENTS */}
            {onboardStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Select SaaS Tier</Label>
                  <div className="grid grid-cols-3 gap-2.5 mt-1.5">
                    {[
                      { key: "STARTER", name: "Starter", price: "$49/mo" },
                      { key: "GROWTH", name: "Growth", price: "$99/mo" },
                      { key: "ENTERPRISE", name: "Enterprise", price: "$199/mo" },
                    ].map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPlan(p.key)}
                        className={cn(
                          "p-3 rounded-2xl border text-center transition-all",
                          plan === p.key
                            ? "border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/20"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <p className="text-xs font-black">{p.name}</p>
                        <p className="text-[11px] text-slate-500 font-bold mt-0.5">{p.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Billing Frequency</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {[
                      { key: "MONTHLY", label: "Monthly Billing" },
                      { key: "ANNUAL", label: "Annual Billing (20% Off)" },
                    ].map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setBillingCycle(b.key)}
                        className={cn(
                          "py-2 rounded-xl border text-xs font-bold transition-all",
                          billingCycle === b.key
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Feature Modules Entitlement
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs">
                    {[
                      { key: "qrMenu", label: "Table QR Digital Menu" },
                      { key: "kds", label: "KDS Kitchen Routing" },
                      { key: "pos", label: "Cloud POS Terminal" },
                      { key: "inventory", label: "Inventory & Recipe Control" },
                      { key: "delivery", label: "Direct Online Delivery" },
                      { key: "loyalty", label: "Customer Loyalty Points" },
                    ].map((mod) => {
                      const enabled = (enabledModules as any)[mod.key];
                      return (
                        <div
                          key={mod.key}
                          onClick={() =>
                            setEnabledModules({ ...enabledModules, [mod.key]: !enabled })
                          }
                          className={cn(
                            "p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all",
                            enabled ? "border-emerald-300 bg-emerald-50/50 text-emerald-950 font-bold" : "border-slate-200 bg-slate-50 text-slate-500",
                          )}
                        >
                          <span>{mod.label}</span>
                          <CheckCircle2
                            className={cn("h-4 w-4", enabled ? "text-emerald-600" : "text-slate-300")}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnboardStep(3)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  >
                    &larr; Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRestaurantMutation.isPending}
                    className="h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-6 shadow-md shadow-teal-600/30"
                  >
                    {createRestaurantMutation.isPending ? "Generating Franchise…" : "Complete Onboarding & Deploy"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* SUCCESS CONFIRMATION DIALOG WITH 1-CLICK CREDENTIALS & SWITCH */}
      <Dialog open={Boolean(createdSuccessData)} onOpenChange={() => setCreatedSuccessData(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl bg-white p-6 shadow-2xl border border-emerald-200">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Hotel Onboarded Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {createdSuccessData?.restaurantName} is live with {createdSuccessData?.tableCount} tables and{" "}
                {createdSuccessData?.stationsCount} kitchen stations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-teal-600">{createdSuccessData?.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Owner Login:</span>
                <span className="font-bold text-slate-900 select-all">{createdSuccessData?.ownerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="font-bold text-slate-900 select-all">{createdSuccessData?.ownerPassword}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={copyCredentials}
                variant="outline"
                className="h-10 rounded-xl font-bold text-xs gap-1.5 border-slate-300"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied to Clipboard!" : "Copy Onboarding Credentials"}
              </Button>
              <Button
                onClick={() => {
                  if (createdSuccessData?.restaurantId) {
                    switchRestaurantMutation.mutate(createdSuccessData.restaurantId);
                  }
                }}
                className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                1-Click Launch into Hotel Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
