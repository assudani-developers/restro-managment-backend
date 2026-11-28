export interface MenuThemePreset {
  id: string;
  tier: "starter" | "growth" | "ultra";
  name: string;
  blurb: string;
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  font: "serif" | "sans" | "rounded" | "display" | "elegant";
  radius: number;
  layout: "list" | "cards" | "grid";
  header: "hero" | "centered" | "band";
  dark: boolean;
}

export interface QrCardThemePreset {
  id: string;
  tier: "starter" | "growth" | "ultra";
  name: string;
  blurb: string;
  fg: string;
  bg: string;
  bg2: string;
  ink: string;
  frame: string;
  dots: boolean;
}

export interface MenuDesignConfig {
  themeId: string;
  qrThemeId: string;
  layout?: "list" | "cards" | "grid";
  header?: "hero" | "centered" | "band";
  announcement?: string;
  showLogo?: boolean;
  showCover?: boolean;
  showPrices?: boolean;
  instagramUrl?: string;
  whatsappNumber?: string;
  googleMapsUrl?: string;
  googleReviewUrl?: string;
}

export const MENU_THEMES: MenuThemePreset[] = [
  {
    id: "haveli",
    tier: "starter",
    name: "Haveli",
    blurb: "Warm ivory & saffron, timeless",
    primary: "#C2410C",
    accent: "#3B1D0F",
    background: "#FFF8EE",
    surface: "#FFFFFF",
    text: "#2B160A",
    muted: "#7A5B48",
    font: "serif",
    radius: 18,
    layout: "list",
    header: "hero",
    dark: false,
  },
  {
    id: "minimal",
    tier: "starter",
    name: "Minimal",
    blurb: "Clean, calm and very fast",
    primary: "#111827",
    accent: "#111827",
    background: "#FFFFFF",
    surface: "#F7F7F8",
    text: "#111827",
    muted: "#6B7280",
    font: "sans",
    radius: 12,
    layout: "list",
    header: "centered",
    dark: false,
  },
  {
    id: "cafe",
    tier: "starter",
    name: "Café Latte",
    blurb: "Cosy browns, rounded cards",
    primary: "#8A5A2B",
    accent: "#3B2417",
    background: "#F7EFE5",
    surface: "#FFFBF6",
    text: "#3B2417",
    muted: "#8C6E58",
    font: "rounded",
    radius: 22,
    layout: "cards",
    header: "centered",
    dark: false,
  },
  {
    id: "chaat",
    tier: "growth",
    name: "Chaat Street",
    blurb: "Loud, hungry, appetising",
    primary: "#E11D48",
    accent: "#7C2D12",
    background: "#FFF7E6",
    surface: "#FFFFFF",
    text: "#431407",
    muted: "#9A5B3C",
    font: "display",
    radius: 16,
    layout: "grid",
    header: "band",
    dark: false,
  },
  {
    id: "garden",
    tier: "growth",
    name: "Garden Fresh",
    blurb: "Leafy greens for healthy kitchens",
    primary: "#15803D",
    accent: "#14532D",
    background: "#F3F8F1",
    surface: "#FFFFFF",
    text: "#14301F",
    muted: "#5B7564",
    font: "sans",
    radius: 20,
    layout: "cards",
    header: "hero",
    dark: false,
  },
  {
    id: "indigo",
    tier: "growth",
    name: "Indigo Modern",
    blurb: "Bold cards, crisp and fresh",
    primary: "#4F46E5",
    accent: "#1E1B4B",
    background: "#F6F7FB",
    surface: "#FFFFFF",
    text: "#111132",
    muted: "#63647E",
    font: "sans",
    radius: 24,
    layout: "grid",
    header: "band",
    dark: false,
  },
  {
    id: "luxe",
    tier: "ultra",
    name: "Luxe Noir",
    blurb: "Black & gold fine dining",
    primary: "#D4AF37",
    accent: "#F5E6B3",
    background: "#0C0B0A",
    surface: "#171512",
    text: "#F5F0E6",
    muted: "#A69C88",
    font: "elegant",
    radius: 14,
    layout: "list",
    header: "hero",
    dark: true,
  },
  {
    id: "maharaja",
    tier: "ultra",
    name: "Maharaja",
    blurb: "Royal plum with gold leaf",
    primary: "#E0B65A",
    accent: "#FCE7B2",
    background: "#1E0E24",
    surface: "#2A1532",
    text: "#FBF4FF",
    muted: "#C3A9CC",
    font: "elegant",
    radius: 18,
    layout: "cards",
    header: "hero",
    dark: true,
  },
  {
    id: "coastal",
    tier: "ultra",
    name: "Konkan Coast",
    blurb: "Sea teal & coral, breezy",
    primary: "#F97366",
    accent: "#0F4C5C",
    background: "#F1F8F8",
    surface: "#FFFFFF",
    text: "#0B2E36",
    muted: "#4F7179",
    font: "rounded",
    radius: 22,
    layout: "grid",
    header: "hero",
    dark: false,
  },
  {
    id: "neon",
    tier: "ultra",
    name: "Midnight Neon",
    blurb: "Night-out glow for bars & lounges",
    primary: "#22D3EE",
    accent: "#C084FC",
    background: "#0A0A14",
    surface: "#13131F",
    text: "#EEF2FF",
    muted: "#9CA3C4",
    font: "display",
    radius: 20,
    layout: "cards",
    header: "band",
    dark: true,
  },
];

export const QR_CARD_THEMES: QrCardThemePreset[] = [
  { id: "plain", tier: "starter", name: "Plain", blurb: "Just the code", fg: "#111111", bg: "#FFFFFF", bg2: "#FFFFFF", ink: "#111111", frame: "#E5E7EB", dots: false },
  { id: "classic", tier: "starter", name: "Saffron", blurb: "Warm saffron card", fg: "#2B160A", bg: "#F59E0B", bg2: "#C2410C", ink: "#FFFFFF", frame: "#FFFFFF", dots: true },
  { id: "mono", tier: "starter", name: "Mono", blurb: "Crisp black on white", fg: "#000000", bg: "#FFFFFF", bg2: "#F3F4F6", ink: "#000000", frame: "#000000", dots: false },
  { id: "sunset", tier: "growth", name: "Sunset", blurb: "Orange to pink glow", fg: "#3B0A1E", bg: "#FB923C", bg2: "#DB2777", ink: "#FFFFFF", frame: "#FFFFFF", dots: true },
  { id: "forest", tier: "growth", name: "Forest", blurb: "Deep green & cream", fg: "#0F2E1D", bg: "#166534", bg2: "#052E16", ink: "#FEF9E7", frame: "#FEF9E7", dots: true },
  { id: "ocean", tier: "growth", name: "Ocean", blurb: "Fresh blues", fg: "#0C2A44", bg: "#0EA5E9", bg2: "#1E3A8A", ink: "#FFFFFF", frame: "#FFFFFF", dots: true },
  { id: "noir", tier: "ultra", name: "Noir Gold", blurb: "Black card, gold code", fg: "#111111", bg: "#1A1712", bg2: "#050505", ink: "#E8C872", frame: "#D4AF37", dots: true },
  { id: "gold", tier: "ultra", name: "Gold Foil", blurb: "Cream with a gold border", fg: "#3A2A08", bg: "#FFF8E6", bg2: "#F3E3B5", ink: "#6B4E0E", frame: "#C9A23A", dots: false },
  { id: "royal", tier: "ultra", name: "Royal Plum", blurb: "Plum & gold, festive", fg: "#2A0F33", bg: "#5B2179", bg2: "#260A33", ink: "#F7D98B", frame: "#F7D98B", dots: true },
  { id: "tent", tier: "ultra", name: "Table Tent", blurb: "Print and fold for tables", fg: "#111111", bg: "#FFFFFF", bg2: "#FFF7ED", ink: "#7C2D12", frame: "#F59E0B", dots: true },
];

export function getMenuTheme(themeId?: string | null): MenuThemePreset {
  return MENU_THEMES.find((t) => t.id === themeId) ?? MENU_THEMES[0];
}

export function getQrCardTheme(qrThemeId?: string | null): QrCardThemePreset {
  return QR_CARD_THEMES.find((t) => t.id === qrThemeId) ?? QR_CARD_THEMES[1];
}
