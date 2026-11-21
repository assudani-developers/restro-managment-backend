import {
  BarChart3,
  BedDouble,
  BellRing,
  BookMarked,
  CalendarClock,
  ChefHat,
  ClipboardList,
  Clock,
  ConciergeBell,
  Gem,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Package,
  QrCode,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  UsersRound,
  UtensilsCrossed,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { BusinessModule } from "@restrocore/types";

export interface NavItem {
  labelKey: string;
  /** Plain label; when set it wins over the i18n key. */
  label?: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  module?: BusinessModule;
  group: NavGroup;
}

export type NavGroup = "Overview" | "Front office" | "Restaurant" | "Resort" | "Admin";
export const NAV_GROUPS: NavGroup[] = ["Overview", "Front office", "Restaurant", "Resort", "Admin"];

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.sales.view", group: "Overview" },
  { labelKey: "nav.frontDesk", label: "Rooms", href: "/front-desk", icon: BedDouble, permission: "hotel.frontdesk", module: "rooms", group: "Front office" },
  { labelKey: "nav.bookings", label: "Bookings", href: "/bookings", icon: BookMarked, permission: "hotel.frontdesk", module: "bookings", group: "Front office" },
  { labelKey: "nav.housekeeping", label: "Housekeeping", href: "/housekeeping", icon: Sparkles, permission: "hotel.housekeeping", module: "housekeeping", group: "Front office" },
  { labelKey: "nav.guestMessages", label: "Guest messages", href: "/guest-messages", icon: BellRing, permission: "hotel.frontdesk", group: "Front office" },
  { labelKey: "nav.customers", label: "Guests", href: "/customers", icon: UsersRound, permission: "customers.manage", group: "Front office" },

  { labelKey: "nav.restaurantSales", label: "Restaurant sales", href: "/restaurant-sales", icon: BarChart3, permission: "dashboard.sales.view", group: "Restaurant" },
  { labelKey: "nav.pos", label: "POS", href: "/pos", icon: ShoppingCart, permission: "orders.create", module: "pos", group: "Restaurant" },
  { labelKey: "nav.roomService", label: "Room service", href: "/room-service", icon: ConciergeBell, permission: "orders.create", module: "roomService", group: "Restaurant" },
  { labelKey: "nav.orders", label: "Orders", href: "/orders", icon: ClipboardList, permission: "orders.create", group: "Restaurant" },
  { labelKey: "nav.tables", label: "Tables", href: "/tables", icon: LayoutGrid, permission: "tables.view", module: "tables", group: "Restaurant" },
  { labelKey: "nav.kds", label: "Kitchen display", href: "/kds", icon: ChefHat, permission: "kds.manage", module: "kds", group: "Restaurant" },
  { labelKey: "nav.menu", label: "Menu", href: "/menu", icon: UtensilsCrossed, permission: "menu.view", group: "Restaurant" },
  { labelKey: "nav.qrStudio", label: "QR codes", href: "/qr-studio", icon: QrCode, permission: "menu.view", module: "qrMenu", group: "Restaurant" },
  { labelKey: "nav.qrMenu", label: "Online menu", href: "/qr-menu", icon: QrCode, permission: "menu.view", module: "qrMenu", group: "Restaurant" },
  { labelKey: "nav.reservations", label: "Table bookings", href: "/reservations", icon: CalendarClock, permission: "reservations.manage", module: "reservations", group: "Restaurant" },
  { labelKey: "nav.delivery", label: "Delivery", href: "/delivery", icon: Truck, permission: "delivery.manage", module: "delivery", group: "Restaurant" },

  { labelKey: "nav.events", label: "Events", href: "/events", icon: Gem, permission: "hotel.events", module: "events", group: "Resort" },
  { labelKey: "nav.pool", label: "Pool", href: "/pool", icon: Waves, permission: "hotel.pool", module: "pool", group: "Resort" },

  { labelKey: "nav.accounting", label: "Accounting", href: "/accounting", icon: Landmark, permission: "accounting.manage", module: "accounting", group: "Admin" },
  { labelKey: "nav.reports", label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.access", group: "Admin" },
  { labelKey: "nav.inventory", label: "Inventory", href: "/inventory", icon: Package, permission: "inventory.manage", module: "inventory", group: "Admin" },
  { labelKey: "nav.team", label: "Staff", href: "/team", icon: Users, permission: "staff.manage", group: "Admin" },
  { labelKey: "nav.attendance", label: "Attendance", href: "/attendance", icon: Clock, group: "Admin" },
  { labelKey: "nav.marketing", label: "Marketing", href: "/marketing", icon: Megaphone, permission: "marketing.manage", group: "Admin" },
  { labelKey: "nav.operations", label: "Maintenance", href: "/operations", icon: Wrench, permission: "operations.manage", group: "Admin" },
  { labelKey: "nav.hotelSetup", label: "Hotel setup", href: "/hotel-setup", icon: Gem, permission: "hotel.setup", group: "Admin" },
  { labelKey: "nav.settings", label: "Settings", href: "/settings", icon: Settings, permission: "settings.manage", group: "Admin" },
];
