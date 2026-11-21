"use client";

import { useEffect } from "react";
import { useBranch } from "@/hooks/use-branch";
import { useHotelSettings } from "@/hooks/use-hotel";

/** Pick a readable foreground for a #RRGGBB background (WCAG relative luminance). */
export function readableOn(hex: string) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.42 ? "#1E1712" : "#FFF8F0";
}

export function applyBrand(el: HTMLElement, brand?: string | null, accent?: string | null) {
  if (brand && /^#[0-9a-f]{6}$/i.test(brand)) {
    el.style.setProperty("--primary", brand);
    el.style.setProperty("--primary-foreground", readableOn(brand));
    // Derived tokens are resolved where they're declared (:root), so a scoped
    // override (guest pages brand only their own subtree) must restate them.
    el.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, color-mix(in oklab, ${brand} 88%, white) 0%, ${brand} 50%, color-mix(in oklab, ${brand} 78%, black) 100%)`,
    );
    el.style.setProperty("--ring", brand);
  }
  if (accent && /^#[0-9a-f]{6}$/i.test(accent)) el.style.setProperty("--brand-accent", accent);
}

/**
 * White-label theming: paints the whole staff panel in the hotel's own brand
 * and accent colours from Hotel Setup → Branding. Every token (buttons, rings,
 * charts, the remapped legacy teal-* utilities) reads --primary, so one
 * variable switch rebrands the entire SaaS panel per tenant.
 */
export function BrandTheme() {
  const { branchId } = useBranch();
  const { data } = useHotelSettings(branchId);
  useEffect(() => {
    if (!data) return;
    applyBrand(document.documentElement, data.brandColor, data.accentColor);
    document.title = `${data.hotelName} · Hotel ERP`;
  }, [data]);
  return null;
}
