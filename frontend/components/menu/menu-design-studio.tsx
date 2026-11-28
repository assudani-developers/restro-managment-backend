"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Palette, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";
import {
  getMenuTheme,
  MENU_THEMES,
  type MenuDesignConfig,
} from "@/lib/menu-themes";
import { cn } from "@/lib/utils";

interface MenuDesignResponse extends MenuDesignConfig {
  restaurantName?: string;
  tagline?: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export function MenuDesignStudio({ previewUrl }: { previewUrl?: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["menu", "design"],
    queryFn: () => api.get<MenuDesignResponse>("/menu/design"),
  });

  const [themeId, setThemeId] = useState("haveli");
  const [layout, setLayout] = useState<"list" | "cards" | "grid">("list");
  const [header, setHeader] = useState<"hero" | "centered" | "band">("hero");
  const [announcement, setAnnouncement] = useState("");
  const [tagline, setTagline] = useState("");
  const [showLogo, setShowLogo] = useState(true);
  const [showCover, setShowCover] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  useEffect(() => {
    if (!data) return;
    const preset = getMenuTheme(data.themeId);
    setThemeId(preset.id);
    setLayout(data.layout ?? preset.layout);
    setHeader(data.header ?? preset.header);
    setAnnouncement(data.announcement ?? "");
    setTagline(data.tagline ?? "");
    setShowLogo(data.showLogo !== false);
    setShowCover(data.showCover !== false);
    setShowPrices(data.showPrices !== false);
    setInstagramUrl(data.instagramUrl ?? "");
    setWhatsappNumber(data.whatsappNumber ?? "");
    setGoogleMapsUrl(data.googleMapsUrl ?? "");
    setGoogleReviewUrl(data.googleReviewUrl ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch("/menu/design", {
        themeId,
        layout,
        header,
        announcement,
        tagline,
        showLogo,
        showCover,
        showPrices,
        instagramUrl,
        whatsappNumber,
        googleMapsUrl,
        googleReviewUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "design"] });
      toast.success("QR menu theme & design saved!");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not save design");
    },
  });

  const activeTheme = getMenuTheme(themeId);

  if (isLoading) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Loading menu design studio…
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Palette className="h-3.5 w-3.5" />
            QR Menu Themes &amp; Branding
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            Choose your live customer menu theme
          </h2>
          <p className="text-xs text-muted-foreground">
            10 designer themes with instant mobile preview, custom banners, and social links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open live menu
            </Button>
          )}
          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving…" : "Save theme"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div>
            <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              10 Curated Themes
            </Label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              {MENU_THEMES.map((t) => {
                const selected = themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setThemeId(t.id);
                      setLayout(t.layout);
                      setHeader(t.header);
                    }}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border text-left transition",
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div
                      className="flex h-14 items-end justify-between p-2"
                      style={{ background: t.background }}
                    >
                      <span
                        className="h-5 w-5 rounded-full border border-white/30 shadow-xs"
                        style={{ background: t.primary }}
                      />
                      {selected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="bg-card p-2">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {t.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {t.blurb}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dish layout</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["list", "cards", "grid"] as const).map((l) => (
                  <Button
                    key={l}
                    type="button"
                    size="sm"
                    variant={layout === l ? "default" : "outline"}
                    onClick={() => setLayout(l)}
                    className="capitalize"
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Header style</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["hero", "centered", "band"] as const).map((h) => (
                  <Button
                    key={h}
                    type="button"
                    size="sm"
                    variant={header === h ? "default" : "outline"}
                    onClick={() => setHeader(h)}
                    className="capitalize"
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Offer / announcement banner</Label>
              <Input
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Flat 15% off on dine-in today!"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Restaurant tagline</Label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Authentic Rajasthani & North Indian"
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp number</Label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 9876543210"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Google Review link</Label>
              <Input
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram URL</Label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Google Maps link</Label>
              <Input
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-muted/30 p-3.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              <Switch checked={showLogo} onCheckedChange={setShowLogo} />
              Show logo
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <Switch checked={showCover} onCheckedChange={setShowCover} />
              Show cover header
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <Switch checked={showPrices} onCheckedChange={setShowPrices} />
              Show prices
            </label>
          </div>
        </div>

        {/* Live Mobile Theme Preview */}
        <div className="flex flex-col items-center">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Live mobile preview
          </p>
          <div
            className="w-full max-w-[280px] overflow-hidden rounded-[28px] border-4 border-foreground/15 shadow-lg"
            style={{ background: activeTheme.background, color: activeTheme.text }}
          >
            <div
              className="px-4 py-4"
              style={{
                background:
                  header === "band" ? activeTheme.primary : activeTheme.surface,
                color: header === "band" ? "#FFFFFF" : activeTheme.text,
                textAlign: header === "centered" ? "center" : "left",
              }}
            >
              <p className="text-sm font-bold">
                {data?.restaurantName || "Your Restaurant"}
              </p>
              <p className="text-[11px] opacity-75">
                {tagline || "Freshly prepared for you"}
              </p>
            </div>
            {announcement && (
              <div
                className="mx-3 mt-2 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold"
                style={{
                  background: `${activeTheme.primary}20`,
                  color: activeTheme.primary,
                }}
              >
                {announcement}
              </div>
            )}
            <div className="space-y-2 p-3">
              <Badge
                className="text-[10px]"
                style={{ background: activeTheme.primary, color: "#FFFFFF" }}
              >
                Starters
              </Badge>
              {[
                { name: "Paneer Tikka", price: 280, veg: true },
                { name: "Butter Chicken", price: 360, veg: false },
              ].map((dish) => (
                <div
                  key={dish.name}
                  className="flex items-center justify-between p-2.5"
                  style={{
                    background: activeTheme.surface,
                    borderRadius: `${Math.min(activeTheme.radius, 14)}px`,
                  }}
                >
                  <div>
                    <p className="text-xs font-semibold">{dish.name}</p>
                    {showPrices && (
                      <p
                        className="text-[11px] font-bold"
                        style={{ color: activeTheme.primary }}
                      >
                        ₹{dish.price}
                      </p>
                    )}
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: activeTheme.primary }}
                  >
                    ADD
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
