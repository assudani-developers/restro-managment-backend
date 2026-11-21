"use client";

import {
  BellRing,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  CreditCard,
  KeyRound,
  Leaf,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  Wifi,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModifierPickerDialog } from "@/components/pos/modifier-picker-dialog";
import { applyBrand } from "@/components/hotel/brand-theme";
import { playSuccessChime, vibrateSuccess } from "@/lib/celebrate";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- types

export interface GuestBrand {
  hotelName: string;
  tagline: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandColor: string;
  accentColor: string;
}

export interface GuestItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  price: string;
  isVeg: boolean;
  isSoldOut?: boolean;
  prepTimeMinutes?: number | null;
  spiceLevel?: string;
  modifierGroups: {
    modifierGroup: {
      id: string;
      name: string;
      minSelect: number;
      maxSelect: number;
      isRequired: boolean;
      modifiers: { id: string; name: string; priceAdjustment: string; isDefault: boolean }[];
    };
  }[];
}

export interface GuestCategory {
  id: string;
  name: string;
  items: GuestItem[];
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  stage: "RECEIVED" | "PREPARING" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";
  totalAmount?: number;
  onFolio?: boolean;
  items: { id: string; nameSnapshot: string; quantity: number }[];
}

interface CartLine {
  key: string;
  menuItemId: string;
  modifierIds: string[];
  name: string;
  label: string;
  unitPrice: number;
  quantity: number;
  isVeg: boolean;
}

export interface PlaceArgs {
  items: { menuItemId: string; quantity: number; modifierIds: string[] }[];
  guestName: string;
  chargeToRoom: boolean;
  stayPin?: string;
  notes?: string;
}

export interface GuestMenuProps {
  brand: GuestBrand;
  kicker: string;
  place: string;
  mode: "room" | "table";
  greeting?: string | null;
  categories: GuestCategory[];
  canChargeToRoom?: boolean;
  wifi?: { name: string | null; password: string | null } | null;
  serviceCharge?: number;
  orders: TrackedOrder[];
  requests: { key: string; label: string; done?: boolean; onRequest: () => Promise<unknown> }[];
  onPlace: (a: PlaceArgs) => Promise<{ orderNumber: string; chargedToRoom?: boolean }>;
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const ease = [0.22, 1, 0.36, 1] as const;

function VegMark({ veg, className }: { veg: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white", veg ? "border-emerald-600" : "border-rose-700", className)}>
      {veg ? <span className="h-2 w-2 rounded-full bg-emerald-600" /> : <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-rose-700" />}
    </span>
  );
}

/** A number that rolls to its new value. */
function Rolling({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.5, ease });
    return () => c.stop();
  }, [value, mv]);
  useMotionValueEvent(mv, "change", (v) => setShown(Math.round(v)));
  return <span className="tabular-nums">{inr(shown)}</span>;
}

// ---------------------------------------------------------------- main

export function GuestMenu(props: GuestMenuProps) {
  const { brand, categories, mode } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [vegOnly, setVegOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const [detail, setDetail] = useState<GuestItem | null>(null);
  const [picker, setPicker] = useState<GuestItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: string; chargedToRoom?: boolean } | null>(null);
  const [flyers, setFlyers] = useState<{ id: number; x: number; y: number }[]>([]);
  const [bump, setBump] = useState(0);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const flyId = useRef(0);

  useEffect(() => {
    if (rootRef.current) applyBrand(rootRef.current, brand.brandColor, brand.accentColor);
  }, [brand.brandColor, brand.accentColor]);

  // Parallax hero + compact header on scroll.
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 300], [1, 1.18]);
  const heroY = useTransform(scrollY, [0, 300], [0, 90]);
  const heroFade = useTransform(scrollY, [0, 220], [1, 0]);
  const [compact, setCompact] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 230));

  const visible = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          items: c.items.filter((i) => (!vegOnly || i.isVeg) && (!query || i.name.toLowerCase().includes(query.toLowerCase()) || i.description?.toLowerCase().includes(query.toLowerCase()))),
        }))
        .filter((c) => c.items.length > 0),
    [categories, vegOnly, query],
  );

  // Scroll-spy: highlight the category in view.
  useEffect(() => {
    const els = visible.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveCat(top.target.id.replace("cat-", ""));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [visible]);

  const count = cart.reduce((a, l) => a + l.quantity, 0);
  const subtotal = cart.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  const qtyOf = (id: string) => cart.filter((l) => l.menuItemId === id).reduce((a, l) => a + l.quantity, 0);

  const fly = (from?: DOMRect) => {
    setBump((b) => b + 1);
    if (!from) return;
    const id = ++flyId.current;
    setFlyers((f) => [...f, { id, x: from.left + from.width / 2, y: from.top + from.height / 2 }]);
    setTimeout(() => setFlyers((f) => f.filter((x) => x.id !== id)), 800);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  const addLine = (item: GuestItem, modifierIds: string[], label: string, extra: number, from?: DOMRect) => {
    const key = `${item.id}:${[...modifierIds].sort().join(",")}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { key, menuItemId: item.id, modifierIds, name: item.name, label, unitPrice: Number(item.price) + extra, quantity: 1, isVeg: item.isVeg }];
    });
    fly(from);
  };
  const add = (item: GuestItem, from?: DOMRect) => {
    if (item.isSoldOut) return;
    if (item.modifierGroups.length > 0) setPicker(item);
    else addLine(item, [], "", 0, from);
  };
  const removeOne = (itemId: string) =>
    setCart((prev) => {
      const idx = [...prev].reverse().findIndex((l) => l.menuItemId === itemId);
      if (idx < 0) return prev;
      const at = prev.length - 1 - idx;
      return prev.map((l, i) => (i === at ? { ...l, quantity: l.quantity - 1 } : l)).filter((l) => l.quantity > 0);
    });
  const changeLine = (key: string, d: number) => setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + d } : l)).filter((l) => l.quantity > 0));

  const scrollToCat = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 112, behavior: "smooth" });
  };

  const liveOrders = props.orders.filter((o) => o.stage !== "DELIVERED" && o.stage !== "CANCELLED");

  return (
    <div ref={rootRef} className="relative min-h-dvh bg-[#FBF7F1] pb-36 text-[#1E1712] antialiased">
      {/* ---------- compact sticky header ---------- */}
      <motion.header
        initial={false}
        animate={{ y: compact ? 0 : -80, opacity: compact ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className="fixed inset-x-0 top-0 z-30 border-b border-black/5 bg-[#FBF7F1]/85 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <BrandBadge brand={brand} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold leading-tight">{brand.hotelName}</p>
            <p className="truncate text-[11px] text-[#7A6A59]">{props.place}</p>
          </div>
          <button type="button" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </motion.header>

      {/* ---------- hero ---------- */}
      <div className="relative h-[46vh] min-h-[320px] overflow-hidden">
        <motion.div style={{ scale: heroScale, y: heroY }} className="absolute inset-0">
          {brand.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `radial-gradient(120% 90% at 80% 0%, ${brand.accentColor}66, transparent 55%), linear-gradient(155deg, ${brand.brandColor}, #17110D 78%)` }}>
            </div>
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#17110D]/90 via-[#17110D]/25 to-transparent" />
        <motion.div style={{ opacity: heroFade }} className="absolute inset-x-0 bottom-0 mx-auto max-w-xl px-5 pb-14 text-[#FFF8F0]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
            <BrandBadge brand={brand} size={52} />
            <p className="mt-4 text-[13px] font-medium" style={{ color: brand.accentColor }}>
              {props.kicker} · {props.place}
            </p>
            <h1 className="mt-1.5 font-display text-[2.1rem] leading-[1.02] font-semibold tracking-tight">{props.greeting ?? brand.hotelName}</h1>
            {brand.tagline && <p className="mt-1.5 text-sm text-white/75">{brand.tagline}</p>}
          </motion.div>
        </motion.div>
      </div>

      {/* ---------- body card ---------- */}
      <div className="relative z-10 -mt-8 rounded-t-[2rem] bg-[#FBF7F1]">
        <div className="mx-auto max-w-xl">
          {/* quick actions */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-5 pb-1">
            {props.wifi?.name && (
              <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => navigator.clipboard?.writeText(props.wifi?.password ?? "")} className="flex shrink-0 items-center gap-2 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 text-left shadow-sm">
                <Wifi className="h-4 w-4 text-brand" />
                <span>
                  <span className="block text-[11px] font-semibold">{props.wifi.name}</span>
                  <span className="block text-[10px] text-[#7A6A59]">{props.wifi.password ? `Tap to copy · ${props.wifi.password}` : "Open network"}</span>
                </span>
              </motion.button>
            )}
            {props.requests.map((r) => (
              <RequestChip key={r.key} label={r.label} done={r.done} onRequest={r.onRequest} />
            ))}
          </div>

          {/* live order tracker pill */}
          <AnimatePresence>
            {liveOrders.length > 0 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => setTrackerOpen(true)}
                className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-2xl bg-[#17110D] px-4 py-3 text-left text-[#FFF8F0]"
              >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand">
                  <ChefHat className="h-4 w-4" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{STAGE_LABEL[liveOrders[0].stage]}</span>
                  <span className="block text-[11px] text-white/60">Order {liveOrders[0].orderNumber}{liveOrders.length > 1 ? ` +${liveOrders.length - 1} more` : ""}</span>
                </span>
                <span className="text-xs font-semibold" style={{ color: brand.accentColor }}>Track</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* sticky category rail */}
          <div className="sticky top-14 z-20 mt-3 bg-[#FBF7F1]/90 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <button type="button" onClick={() => setVegOnly((v) => !v)} className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition", vegOnly ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-black/10 bg-white")}>
                <Leaf className="h-3.5 w-3.5" /> Veg
              </button>
              <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
                <LayoutGroup id="cats">
                  {visible.map((c) => (
                    <button key={c.id} type="button" onClick={() => scrollToCat(c.id)} className={cn("relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", activeCat === c.id ? "text-[#FFF8F0]" : "text-[#5C4C3E]")}>
                      {activeCat === c.id && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-[#17110D]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                      <span className="relative">{c.name}</span>
                    </button>
                  ))}
                </LayoutGroup>
              </div>
              <button type="button" onClick={() => setSearchOpen(true)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white" aria-label="Search menu">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* menu */}
          <div className="px-4">
            {visible.length === 0 && (
              <div className="py-20 text-center text-sm text-[#7A6A59]">{query || vegOnly ? "Nothing matches. Try clearing the filters." : "The menu is being updated. Please call reception."}</div>
            )}
            {visible.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} className="pt-6">
                <h2 className="mb-3 flex items-baseline gap-2 font-display text-2xl font-semibold tracking-tight">
                  {c.name}
                  <span className="text-xs font-normal text-[#7A6A59]">{c.items.length}</span>
                </h2>
                <div className="space-y-3">
                  {c.items.map((item, i) => (
                    <ItemCard key={item.id} item={item} index={i} qty={qtyOf(item.id)} onOpen={() => setDetail(item)} onAdd={(r) => add(item, r)} onRemove={() => removeOne(item.id)} />
                  ))}
                </div>
              </section>
            ))}
            <p className="py-10 text-center text-[11px] text-[#A8957D]">
              Prices include applicable taxes{props.serviceCharge ? ` · room service ${inr(props.serviceCharge)}` : ""}. Please tell us about allergies.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- floating cart bar ---------- */}
      <AnimatePresence>
        {count > 0 && !cartOpen && (
          <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 140 }} transition={{ type: "spring", stiffness: 380, damping: 30 }} className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <motion.button
              ref={cartBtnRef}
              key={bump}
              type="button"
              onClick={() => setCartOpen(true)}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 0.35 }}
              className="relative mx-auto flex h-16 w-full max-w-xl items-center gap-3 overflow-hidden rounded-[1.4rem] px-5 text-left text-[#FFF8F0] shadow-[0_18px_40px_-12px_rgb(23_17_13/0.6)]"
              style={{ background: `linear-gradient(120deg, ${brand.brandColor}, #17110D)` }}
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                <ShoppingBag className="h-5 w-5" />
                <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#17110D]" style={{ background: brand.accentColor }}>
                  {count}
                </motion.span>
              </span>
              <span className="relative flex-1">
                <span className="block text-[11px] text-white/70">{count} item{count > 1 ? "s" : ""}</span>
                <span className="block font-display text-lg font-semibold leading-tight">
                  <Rolling value={subtotal} />
                </span>
              </span>
              <span className="relative text-sm font-semibold">View cart →</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- fly-to-cart particles ---------- */}
      {flyers.map((f) => (
        <Flyer key={f.id} from={f} target={cartBtnRef} color={brand.accentColor} />
      ))}

      {/* ---------- dish detail (shared element) ---------- */}
      <AnimatePresence>
        {detail && <DishSheet item={detail} qty={qtyOf(detail.id)} onClose={() => setDetail(null)} onAdd={(r) => add(detail, r)} onRemove={() => removeOne(detail.id)} />}
      </AnimatePresence>

      {/* ---------- search ---------- */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-[#FBF7F1]">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto flex max-w-xl items-center gap-2 p-4">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#7A6A59]" />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes, drinks…" className="h-12 w-full rounded-2xl border border-black/10 bg-white pr-4 pl-10 text-[15px] outline-none focus:border-brand" />
              </div>
              <button type="button" onClick={() => setSearchOpen(false)} className="h-12 rounded-2xl px-3 text-sm font-semibold">
                Done
              </button>
            </motion.div>
            <div className="mx-auto max-w-xl space-y-3 overflow-y-auto px-4 pb-24" style={{ maxHeight: "calc(100dvh - 80px)" }}>
              {visible.flatMap((c) => c.items).slice(0, 40).map((item, i) => (
                <ItemCard key={item.id} item={item} index={i} qty={qtyOf(item.id)} onOpen={() => setDetail(item)} onAdd={(r) => add(item, r)} onRemove={() => removeOne(item.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- cart & checkout ---------- */}
      <AnimatePresence>
        {cartOpen && (
          <CartSheet
            {...props}
            cart={cart}
            subtotal={subtotal}
            onChange={changeLine}
            onClose={() => setCartOpen(false)}
            onPlaced={(r) => {
              setCart([]);
              setCartOpen(false);
              setSuccess(r);
              vibrateSuccess();
              playSuccessChime();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{success && <SuccessScreen brand={brand} result={success} mode={mode} onDone={() => { setSuccess(null); setTrackerOpen(true); }} />}</AnimatePresence>

      <AnimatePresence>{trackerOpen && <Tracker orders={props.orders} onClose={() => setTrackerOpen(false)} />}</AnimatePresence>

      <ModifierPickerDialog
        item={picker ?? { id: "", name: "", modifierGroups: [] }}
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        onConfirm={(ids, label) => {
          if (!picker) return;
          const extra = ids.reduce((s, id) => s + Number(picker.modifierGroups.flatMap((g) => g.modifierGroup.modifiers).find((m) => m.id === id)?.priceAdjustment ?? 0), 0);
          addLine(picker, ids, label, extra);
          setPicker(null);
        }}
      />
    </div>
  );
}

const STAGE_LABEL: Record<TrackedOrder["stage"], string> = {
  RECEIVED: "Order received",
  PREPARING: "Chef is preparing your food",
  ON_THE_WAY: "Ready · on its way",
  DELIVERED: "Delivered · enjoy!",
  CANCELLED: "Cancelled",
};

function BrandBadge({ brand, size }: { brand: GuestBrand; size: number }) {
  if (brand.logoUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logoUrl} alt={brand.hotelName} style={{ width: size, height: size }} className="rounded-2xl bg-white object-contain p-1 shadow-lg" />;
  const initials = brand.hotelName.split(/\s+/).filter((w) => !/^(the|and|of)$/i.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(140deg, ${brand.brandColor}, #17110D)` }} className="relative inline-flex items-center justify-center rounded-2xl font-display font-semibold text-[#FFF8F0] shadow-lg ring-1 ring-white/20">
      {initials}
    </span>
  );
}

function RequestChip({ label, done, onRequest }: { label: string; done?: boolean; onRequest: () => Promise<unknown> }) {
  const [state, setState] = useState<"idle" | "busy" | "done">(done ? "done" : "idle");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (done) setState("done");
  }, [done]);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      type="button"
      disabled={state !== "idle"}
      onClick={async () => {
        setState("busy");
        try {
          await onRequest();
          setState("done");
        } catch {
          setState("idle");
        }
      }}
      className={cn("flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold shadow-sm transition", state === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-black/5 bg-white")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={state} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
          {state === "done" ? <Check className="h-3.5 w-3.5" /> : state === "busy" ? <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <BellRing className="h-3.5 w-3.5 text-brand" />}
        </motion.span>
      </AnimatePresence>
      {state === "done" ? `${label} · requested` : label}
    </motion.button>
  );
}

function ItemCard({ item, index, qty, onOpen, onAdd, onRemove }: { item: GuestItem; index: number; qty: number; onOpen: () => void; onAdd: (r?: DOMRect) => void; onRemove: () => void }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease, delay: Math.min(index * 0.04, 0.2) }}
      className={cn("flex gap-3 rounded-[1.4rem] border border-black/[0.05] bg-white p-3 shadow-[0_2px_10px_-6px_rgb(60_35_20/0.25)]", item.isSoldOut && "opacity-55")}
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <VegMark veg={item.isVeg} />
          {item.prepTimeMinutes ? (
            <span className="flex items-center gap-0.5 text-[10px] text-[#7A6A59]">
              <Clock className="h-3 w-3" /> {item.prepTimeMinutes}m
            </span>
          ) : null}
        </div>
        <motion.h3 layoutId={`name-${item.id}`} className="mt-1 font-display text-[17px] leading-snug font-semibold">
          {item.name}
        </motion.h3>
        <p className="mt-0.5 text-[15px] font-semibold">{inr(Number(item.price))}</p>
        {item.description && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#7A6A59]">{item.description}</p>}
      </button>
      <div className={cn("relative flex w-[112px] shrink-0 flex-col items-center", !item.imageUrl && "justify-center")}>
        {item.imageUrl && (
          <motion.button type="button" onClick={onOpen} layoutId={`img-${item.id}`} className="h-[104px] w-[112px] overflow-hidden rounded-2xl">
            <DishImage item={item} />
          </motion.button>
        )}
        <div className={cn("relative z-10", item.imageUrl && "-mt-5")}>
          {item.isSoldOut ? (
            <span className="rounded-xl bg-stone-200 px-3 py-2 text-[11px] font-bold text-stone-600">SOLD OUT</span>
          ) : (
            <AddStepper qty={qty} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      </div>
    </motion.article>
  );
}

function DishImage({ item }: { item: GuestItem }) {
  // eslint-disable-next-line @next/next/no-img-element
  return item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : null;
}

function AddStepper({ qty, onAdd, onRemove, large }: { qty: number; onAdd: (r?: DOMRect) => void; onRemove: () => void; large?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      layout
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      className={cn("flex items-center overflow-hidden rounded-xl border bg-white font-bold shadow-[0_6px_14px_-8px_rgb(0_0_0/0.4)]", large ? "h-12 text-base" : "h-9 text-sm", qty ? "border-transparent text-[#FFF8F0] [background-image:var(--gradient-primary)]" : "border-brand/40 text-brand")}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {qty === 0 ? (
          <motion.button key="add" type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onAdd(ref.current?.getBoundingClientRect())} className={cn("flex items-center gap-1", large ? "px-8" : "px-6")}>
            ADD <Plus className="h-3.5 w-3.5" />
          </motion.button>
        ) : (
          <motion.div key="step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center">
            <button type="button" onClick={onRemove} aria-label="Remove one" className={cn("flex h-full items-center", large ? "px-4" : "px-2.5")}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="relative w-6 overflow-hidden text-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={qty} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} className="block">
                  {qty}
                </motion.span>
              </AnimatePresence>
            </span>
            <button type="button" onClick={() => onAdd(ref.current?.getBoundingClientRect())} aria-label="Add one" className={cn("flex h-full items-center", large ? "px-4" : "px-2.5")}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Flyer({ from, target, color }: { from: { x: number; y: number }; target: React.RefObject<HTMLButtonElement | null>; color: string }) {
  const rect = target.current?.getBoundingClientRect();
  const tx = rect ? rect.left + 36 : window.innerWidth / 2;
  const ty = rect ? rect.top + rect.height / 2 : window.innerHeight - 40;
  return (
    <motion.span
      initial={{ x: from.x - 9, y: from.y - 9, scale: 1, opacity: 1 }}
      animate={{ x: [from.x - 9, (from.x + tx) / 2, tx - 9], y: [from.y - 9, Math.min(from.y, ty) - 120, ty - 9], scale: [1, 1.2, 0.4], opacity: [1, 1, 0.2] }}
      transition={{ duration: 0.75, ease: "easeInOut" }}
      className="pointer-events-none fixed top-0 left-0 z-50 h-[18px] w-[18px] rounded-full shadow-lg"
      style={{ background: color }}
    />
  );
}

function DishSheet({ item, qty, onClose, onAdd, onRemove }: { item: GuestItem; qty: number; onClose: () => void; onAdd: (r?: DOMRect) => void; onRemove: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
        className="relative w-full max-w-xl overflow-hidden rounded-t-[2rem] bg-[#FBF7F1] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {item.imageUrl ? (
          <motion.div layoutId={`img-${item.id}`} className="h-72 w-full overflow-hidden">
            <DishImage item={item} />
          </motion.div>
        ) : (
          <div className="h-10" />
        )}
        <span className={cn("absolute top-2.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full", item.imageUrl ? "bg-white/80" : "bg-black/15")} />
        <button type="button" onClick={onClose} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <VegMark veg={item.isVeg} />
            {item.spiceLevel && item.spiceLevel !== "NONE" && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{item.spiceLevel.toLowerCase()} spice</span>}
            {item.prepTimeMinutes ? <span className="text-[11px] text-[#7A6A59]">~{item.prepTimeMinutes} min</span> : null}
          </div>
          <motion.h3 layoutId={`name-${item.id}`} className="mt-2 font-display text-[1.75rem] leading-tight font-semibold">
            {item.name}
          </motion.h3>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-2 text-sm leading-relaxed text-[#5C4C3E]">
            {item.description || "Freshly prepared in our kitchen."}
          </motion.p>
          {item.modifierGroups.length > 0 && <p className="mt-2 text-[11px] text-[#7A6A59]">Customisable · choose options when adding</p>}
          <div className="mt-5 flex items-center justify-between">
            <span className="font-display text-2xl font-semibold">{inr(Number(item.price))}</span>
            {item.isSoldOut ? <span className="rounded-xl bg-stone-200 px-4 py-3 text-sm font-bold text-stone-600">Sold out</span> : <AddStepper large qty={qty} onAdd={onAdd} onRemove={onRemove} />}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CartSheet(
  props: GuestMenuProps & {
    cart: CartLine[];
    subtotal: number;
    onChange: (key: string, d: number) => void;
    onClose: () => void;
    onPlaced: (r: { orderNumber: string; chargedToRoom?: boolean }) => void;
  },
) {
  const { cart, subtotal, mode, canChargeToRoom } = props;
  const [pay, setPay] = useState<"room" | "now">(canChargeToRoom ? "room" : "now");
  const [pin, setPin] = useState("");
  const [name, setName] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("guest-name") ?? "" : ""));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useSpring(0, { stiffness: 900, damping: 12 });
  const total = subtotal + (props.serviceCharge ?? 0);
  const needName = mode === "table" && !name.trim();

  const submit = async () => {
    setError(null);
    if (pay === "room" && pin.length < 4) {
      setError("Enter the 4-digit room PIN from your check-in message");
      shake.set(14);
      setTimeout(() => shake.set(0), 60);
      return;
    }
    setBusy(true);
    try {
      if (name.trim()) sessionStorage.setItem("guest-name", name.trim());
      const r = await props.onPlace({
        items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, modifierIds: l.modifierIds })),
        guestName: name.trim(),
        chargeToRoom: pay === "room",
        stayPin: pay === "room" ? pin : undefined,
        notes: notes || undefined,
      });
      props.onPlaced(r);
    } catch (e) {
      setError((e as Error).message);
      shake.set(14);
      setTimeout(() => shake.set(0), 60);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={props.onClose} />
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, i) => i.offset.y > 140 && props.onClose()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[2rem] bg-[#FBF7F1]"
      >
        <span className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-black/15" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="font-display text-2xl font-semibold">Your order</h3>
          <button type="button" onClick={props.onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Close cart">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <motion.ul layout className="divide-y divide-black/5 rounded-2xl bg-white px-4 shadow-sm">
            <AnimatePresence initial={false}>
              {cart.map((l) => (
                <motion.li key={l.key} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, x: -40 }} className="flex items-center gap-3 py-3">
                  <VegMark veg={l.isVeg} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug font-semibold">{l.name}</p>
                    {l.label && <p className="truncate text-[11px] text-[#7A6A59]">{l.label}</p>}
                  </div>
                  <div className="flex h-8 items-center rounded-lg border border-brand/30 text-brand">
                    <button type="button" className="px-2" onClick={() => props.onChange(l.key, -1)} aria-label="Less"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm font-bold">{l.quantity}</span>
                    <button type="button" className="px-2" onClick={() => props.onChange(l.key, 1)} aria-label="More"><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums">{inr(l.unitPrice * l.quantity)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cooking notes: less spicy, Jain, no onion/garlic" className="mt-3 min-h-16 w-full rounded-2xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-brand" />

          {mode === "table" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-3 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-brand" />
          )}

          {mode === "room" && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Payment</p>
              <div className="grid grid-cols-2 gap-2">
                <PayOption active={pay === "room"} disabled={!canChargeToRoom} onClick={() => setPay("room")} icon={KeyRound} title="Charge to room" sub={canChargeToRoom ? "Pay at checkout" : "Available to in-house guests"} />
                <PayOption active={pay === "now"} onClick={() => setPay("now")} icon={CreditCard} title="Pay on delivery" sub="UPI · card · cash" />
              </div>
              <AnimatePresence>
                {pay === "room" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <motion.div style={{ x: shake }} className="pt-3">
                      <PinInput value={pin} onChange={setPin} />
                      <p className="mt-1.5 text-center text-[11px] text-[#7A6A59]">Your 4-digit room PIN is in your check-in message.</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 space-y-1.5 rounded-2xl bg-white p-4 text-sm shadow-sm">
            <div className="flex justify-between text-[#7A6A59]"><span>Item total</span><span className="tabular-nums">{inr(subtotal)}</span></div>
            {!!props.serviceCharge && <div className="flex justify-between text-[#7A6A59]"><span>Room service</span><span>{inr(props.serviceCharge)}</span></div>}
            <div className="flex justify-between pt-1 font-display text-lg font-semibold"><span>To pay</span><Rolling value={total} /></div>
            {!!props.serviceCharge && <p className="text-[10.5px] text-[#A8957D]">Room-service charge is added by staff when billing.</p>}
          </div>

          <AnimatePresence>{error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</motion.p>}</AnimatePresence>
        </div>
        <div className="border-t border-black/5 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            disabled={busy || cart.length === 0 || needName}
            onClick={submit}
            className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[15px] font-semibold text-[#FFF8F0] disabled:opacity-60 [background-image:var(--gradient-primary)]"
          >
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" /> : <>{needName ? "Enter your name" : pay === "room" && mode === "room" ? "Place order · charge to room" : "Place order"} · {inr(subtotal)}</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PayOption({ active, disabled, onClick, icon: Icon, title, sub }: { active: boolean; disabled?: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn("relative rounded-2xl border-2 bg-white p-3 text-left transition", active ? "border-brand" : "border-transparent", disabled && "opacity-45")}>
      <Icon className="h-5 w-5 text-brand" />
      <p className="mt-1.5 text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-[#7A6A59]">{sub}</p>
      {active && (
        <motion.span layoutId="pay-check" className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
          <Check className="h-3 w-3" />
        </motion.span>
      )}
    </button>
  );
}

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative mx-auto flex w-fit cursor-text justify-center gap-2.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
        aria-label="Room PIN"
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.span key={i} animate={{ scale: value.length === i ? 1.06 : 1, borderColor: value.length === i ? "var(--primary)" : "rgba(0,0,0,0.1)" }} className="flex h-14 w-12 items-center justify-center rounded-2xl border-2 bg-white font-display text-2xl font-semibold">
          <AnimatePresence>{value[i] && <motion.span initial={{ scale: 0, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}>•</motion.span>}</AnimatePresence>
        </motion.span>
      ))}
    </label>
  );
}

function SuccessScreen({ brand, result, mode, onDone }: { brand: GuestBrand; result: { orderNumber: string; chargedToRoom?: boolean }; mode: "room" | "table"; onDone: () => void }) {
  const confetti = useMemo(() => Array.from({ length: 26 }, (_, i) => { const rnd = (k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); }; return { i, x: (rnd(1) - 0.5) * 340, y: -rnd(2) * 380 - 80, r: rnd(3) * 540, c: [brand.brandColor, brand.accentColor, "#FFF8F0", "#2E9E5F"][i % 4] }; }), [brand]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center text-[#FFF8F0]" style={{ background: `radial-gradient(90% 60% at 50% 30%, ${brand.brandColor}, #17110D)` }}>
      <div className="relative">
        {confetti.map((p) => (
          <motion.span key={p.i} initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.r }} transition={{ duration: 2.2, ease: "easeOut", delay: 0.25 }} className="absolute top-1/2 left-1/2 h-2.5 w-1.5 rounded-sm" style={{ background: p.c }} />
        ))}
        <motion.svg viewBox="0 0 100 100" className="h-32 w-32" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
          <motion.circle cx="50" cy="50" r="44" fill="none" stroke={brand.accentColor} strokeWidth="5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease }} />
          <motion.path d="M30 52 L45 66 L71 37" fill="none" stroke="#FFF8F0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.5, ease }} />
        </motion.svg>
      </div>
      <motion.h2 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 font-display text-3xl font-semibold">
        Order placed
      </motion.h2>
      <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="mt-2 text-sm text-white/75">
        {result.orderNumber} is in the kitchen.{" "}
        {mode === "room" ? (result.chargedToRoom ? "Added to your room bill." : "Pay when it arrives at your door.") : "We'll bring it to your table."}
      </motion.p>
      <motion.button initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} type="button" onClick={onDone} className="mt-8 flex h-12 items-center gap-2 rounded-2xl bg-white/12 px-6 text-sm font-semibold ring-1 ring-white/25 backdrop-blur">
        {mode === "room" ? <Truck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} Track my order
      </motion.button>
    </motion.div>
  );
}

const STAGES: TrackedOrder["stage"][] = ["RECEIVED", "PREPARING", "ON_THE_WAY", "DELIVERED"];

function Tracker({ orders, onClose }: { orders: TrackedOrder[]; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 340, damping: 34 }} className="relative max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[#FBF7F1] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold">Your orders</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {orders.length === 0 && <p className="py-10 text-center text-sm text-[#7A6A59]">No orders yet.</p>}
        <div className="space-y-4">
          {orders.map((o) => {
            const at = Math.max(0, STAGES.indexOf(o.stage));
            return (
              <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{o.orderNumber}</p>
                  <span className="text-xs text-[#7A6A59]">
                    {o.totalAmount != null ? inr(o.totalAmount) : ""} {o.onFolio ? "· on room bill" : ""}
                  </span>
                </div>
                {o.stage === "CANCELLED" ? (
                  <p className="mt-2 text-sm font-semibold text-rose-700">Cancelled</p>
                ) : (
                  <div className="relative mt-4 flex justify-between">
                    <div className="absolute top-3 right-3 left-3 h-1 rounded-full bg-black/8" />
                    <motion.div className="absolute top-3 left-3 h-1 rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `calc(${(at / 3) * 100}% - ${(at / 3) * 24}px)` }} transition={{ duration: 0.8, ease }} />
                    {STAGES.map((s, i) => (
                      <div key={s} className="relative flex w-16 flex-col items-center text-center">
                        <motion.span animate={{ scale: i === at ? [1, 1.15, 1] : 1 }} transition={{ repeat: i === at && o.stage !== "DELIVERED" ? Infinity : 0, duration: 1.6 }} className={cn("flex h-7 w-7 items-center justify-center rounded-full text-white", i <= at ? "bg-brand" : "bg-stone-300")}>
                          {i < at || o.stage === "DELIVERED" ? <Check className="h-3.5 w-3.5" /> : i === 0 ? <Receipt className="h-3.5 w-3.5" /> : i === 1 ? <ChefHat className="h-3.5 w-3.5" /> : i === 2 ? <Truck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </motion.span>
                        <span className={cn("mt-1.5 text-[10px] leading-tight font-semibold", i <= at ? "text-[#1E1712]" : "text-[#A8957D]")}>{["Received", "Preparing", "On the way", "Delivered"][i]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 truncate text-[12px] text-[#7A6A59]">{o.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#17110D]">
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#D4A24C] border-r-transparent" />
    </div>
  );
}
