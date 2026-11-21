"use client";

import { BedDouble, Coffee, Gem, ImageUp, LocateFixed, MapPin, Palette, Pencil, Plus, Save, Trash2, Waves } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { applyBrand } from "@/components/hotel/brand-theme";
import { Btn, Empty, Field, Input, Modal, PageHeader, Panel, Segmented, Select, Textarea, Toggle, inr } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import {
  useBoard,
  useCreateRooms,
  useDeleteCategory,
  useDeleteMealPlan,
  useDeleteRoom,
  useHotelSettings,
  useMealPlans,
  useRoomCategories,
  useSaveCategory,
  useSaveMealPlan,
  useSaveVenue,
  useUpdateHotelSettings,
  useUpdateRoom,
  useVenues,
  type HotelSettings,
  type MealPlan,
  type RoomCategory,
  type Venue,
} from "@/hooks/use-hotel";
import { api } from "@/lib/api";

type Tab = "brand" | "rooms" | "meals" | "venues" | "property";

const PALETTES = [
  { name: "Thar Terracotta", brand: "#8A3A1F", accent: "#D4A24C" },
  { name: "Royal Maroon", brand: "#6E1A2D", accent: "#D9B35B" },
  { name: "Lake Palace", brand: "#1E4E79", accent: "#E2C27A" },
  { name: "Aravalli Green", brand: "#1F5A44", accent: "#E8C36A" },
  { name: "Saffron Fort", brand: "#B4531A", accent: "#F2C46D" },
  { name: "Midnight Onyx", brand: "#23252B", accent: "#C9A35A" },
];

export default function HotelSetupPage() {
  const [tab, setTab] = useState<Tab>("brand");
  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Hotel setup"
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            className="flex-wrap"
            options={[
              { value: "brand", label: "Branding" },
              { value: "rooms", label: "Rooms & rates" },
              { value: "meals", label: "Meal plans" },
              { value: "venues", label: "Venues" },
              { value: "property", label: "Property & geo-fence" },
            ]}
          />
        }
      />
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "brand" && <Branding />}
        {tab === "rooms" && <RoomsAndRates />}
        {tab === "meals" && <MealPlans />}
        {tab === "venues" && <Venues />}
        {tab === "property" && <Property />}
      </motion.div>
    </div>
  );
}

function useDraft(settings?: HotelSettings) {
  const [d, setD] = useState<Partial<HotelSettings>>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings) setD(settings);
  }, [settings]);
  return [d, setD] as const;
}

function Branding() {
  const { branchId } = useBranch();
  const { data } = useHotelSettings(branchId);
  const save = useUpdateHotelSettings(branchId);
  const [d, setD] = useDraft(data);
  const [uploading, setUploading] = useState(false);

  // Live preview: repaint the whole panel while picking colours.
  useEffect(() => {
    applyBrand(document.documentElement, d.brandColor, d.accentColor);
    // Leaving without saving restores the saved brand.
    return () => applyBrand(document.documentElement, data?.brandColor, data?.accentColor);
  }, [d.brandColor, d.accentColor, data?.brandColor, data?.accentColor]);

  const upload = async (file: File, key: "logoUrl" | "coverImageUrl") => {
    setUploading(true);
    try {
      const r = await api.upload<{ url: string }>("/settings/restaurant/logo", file);
      setD((x) => ({ ...x, [key]: r.url }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Panel title="Identity">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hotel name">
              <Input value={d.hotelName ?? ""} onChange={(e) => setD({ ...d, hotelName: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={d.tagline ?? ""} onChange={(e) => setD({ ...d, tagline: e.target.value })} placeholder="Royal stays in the Golden City" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["logoUrl", "coverImageUrl"] as const).map((k) => (
              <Field key={k} label={k === "logoUrl" ? "Logo" : "Guest-menu cover photo"}>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
                    {d[k] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d[k]!} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageUp className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <span className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted">{uploading ? "Uploading…" : "Upload"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], k)} />
                  </label>
                  {d[k] && <button type="button" className="text-xs text-muted-foreground hover:text-rose-600" onClick={() => setD({ ...d, [k]: null })}>Remove</button>}
                </div>
              </Field>
            ))}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> Brand palette
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PALETTES.map((p) => (
                <button key={p.name} type="button" onClick={() => setD({ ...d, brandColor: p.brand, accentColor: p.accent })} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-xs font-semibold hover:border-brand">
                  <span className="flex">
                    <span className="h-6 w-6 rounded-full ring-2 ring-white" style={{ background: p.brand }} />
                    <span className="-ml-2 h-6 w-6 rounded-full ring-2 ring-white" style={{ background: p.accent }} />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Brand colour">
                <div className="flex gap-2">
                  <input type="color" value={d.brandColor ?? "#8A3A1F"} onChange={(e) => setD({ ...d, brandColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-border" />
                  <Input value={d.brandColor ?? ""} onChange={(e) => setD({ ...d, brandColor: e.target.value })} />
                </div>
              </Field>
              <Field label="Accent colour">
                <div className="flex gap-2">
                  <input type="color" value={d.accentColor ?? "#C9973F"} onChange={(e) => setD({ ...d, accentColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-border" />
                  <Input value={d.accentColor ?? ""} onChange={(e) => setD({ ...d, accentColor: e.target.value })} />
                </div>
              </Field>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UPI ID (payment QR)">
              <Input value={d.upiVpa ?? ""} onChange={(e) => setD({ ...d, upiVpa: e.target.value })} placeholder="hotel@okaxis" />
            </Field>
            <Field label="UPI payee name">
              <Input value={d.upiPayeeName ?? ""} onChange={(e) => setD({ ...d, upiPayeeName: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Btn
              loading={save.isPending}
              onClick={() =>
                save.mutate({
                  hotelName: d.hotelName, tagline: d.tagline || null, logoUrl: d.logoUrl ?? null, coverImageUrl: d.coverImageUrl ?? null,
                  brandColor: d.brandColor, accentColor: d.accentColor, upiVpa: d.upiVpa || null, upiPayeeName: d.upiPayeeName || null,
                })
              }
            >
              <Save /> Save branding
            </Btn>
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        <p className="text-[13px] font-medium text-muted-foreground">Guest preview</p>
        <div className="mx-auto w-[300px] overflow-hidden rounded-[2.2rem] border-[7px] border-ink bg-[#FFFDF9] shadow-2xl">
          <div className="relative h-44 overflow-hidden" style={{ background: d.coverImageUrl ? undefined : `linear-gradient(150deg, ${d.brandColor}, #17110D)` }}>
            {d.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <p className="text-[9px]" style={{ color: d.accentColor }}>In-room dining · Room 104</p>
              <p className="font-display text-xl font-semibold">{d.hotelName}</p>
              <p className="text-[10px] opacity-80">{d.tagline}</p>
            </div>
          </div>
          <div className="space-y-2 p-3">
            {["Paneer Butter Masala", "Masala Chai"].map((n, i) => (
              <div key={n} className="flex items-center justify-between rounded-2xl border border-[#EFE6D8] p-3">
                <div>
                  <p className="text-xs font-semibold">{n}</p>
                  <p className="text-[11px] text-[#7A6A59]">{i ? "₹50" : "₹280"}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-[10px] font-bold text-white" style={{ background: d.brandColor }}>ADD</span>
              </div>
            ))}
            <div className="rounded-2xl p-3 text-center text-xs font-semibold text-white" style={{ background: `linear-gradient(135deg, ${d.brandColor}, #17110D)` }}>
              View cart · <span style={{ color: d.accentColor }}>₹330</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomsAndRates() {
  const { branchId } = useBranch();
  const { data: cats } = useRoomCategories(branchId);
  const { data: board } = useBoard(branchId);
  const del = useDeleteCategory(branchId);
  const delRoom = useDeleteRoom(branchId);
  const [editCat, setEditCat] = useState<RoomCategory | "new" | null>(null);
  const [addRooms, setAddRooms] = useState(false);
  const [editRoom, setEditRoom] = useState<{ id: string; number: string; categoryId: string; floorLabel: string } | null>(null);

  return (
    <div className="space-y-5">
      <Panel title="Room types & rates" subtitle="Rates are per night, before GST" actions={<Btn size="sm" onClick={() => setEditCat("new")}><Plus /> Room type</Btn>}>
        {!cats?.length ? (
          <Empty icon={BedDouble} title="No room types yet" action={<Btn onClick={() => setEditCat("new")}><Plus /> Add room type</Btn>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <div key={c.id} className={`rounded-2xl border border-border p-4 ${c.isActive ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.code} · {c.bedType.toLowerCase()} · up to {c.maxAdults}A {c.maxChildren}C · {c._count?.rooms ?? 0} rooms</p>
                  </div>
                  <div className="flex">
                    <Btn size="sm" variant="ghost" onClick={() => setEditCat(c)} aria-label="Edit"><Pencil /></Btn>
                    <Btn size="sm" variant="ghost" onClick={() => confirm(`Remove ${c.name}? Types with rooms or bookings are archived instead.`) && del.mutate(c.id)} aria-label="Delete"><Trash2 /></Btn>
                  </div>
                </div>
                <p className="mt-3 font-display text-2xl font-semibold">{inr(c.baseRate)}<span className="text-xs font-normal text-muted-foreground"> /night · GST {Number(c.taxRatePercent)}%</span></p>
                {Number(c.extraGuestRate) > 0 && <p className="text-[11px] text-muted-foreground">Extra adult {inr(c.extraGuestRate)}/night</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title={`Rooms · ${board?.rooms.length ?? 0}`} actions={<Btn size="sm" onClick={() => setAddRooms(true)} disabled={!cats?.length}><Plus /> Add rooms</Btn>}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {board?.rooms.map((r) => (
            <button key={r.id} type="button" onClick={() => setEditRoom({ id: r.id, number: r.number, categoryId: r.category.id, floorLabel: r.floorLabel ?? "" })} className="rounded-xl border border-border p-2 text-center hover:border-brand">
              <p className="font-display text-lg font-semibold">{r.number}</p>
              <p className="truncate text-[10px] text-muted-foreground">{r.category.code}</p>
            </button>
          ))}
        </div>
      </Panel>
      {editCat && <CategoryModal cat={editCat === "new" ? null : editCat} onClose={() => setEditCat(null)} />}
      {addRooms && <AddRoomsModal cats={cats ?? []} onClose={() => setAddRooms(false)} />}
      {editRoom && <EditRoomModal room={editRoom} cats={cats ?? []} onClose={() => setEditRoom(null)} onDelete={() => { if (confirm(`Remove room ${editRoom.number}? Rooms with booking history are archived.`)) { delRoom.mutate(editRoom.id); setEditRoom(null); } }} />}
    </div>
  );
}

function CategoryModal({ cat, onClose }: { cat: RoomCategory | null; onClose: () => void }) {
  const { branchId } = useBranch();
  const save = useSaveCategory(branchId);
  const [f, setF] = useState({
    name: cat?.name ?? "", code: cat?.code ?? "", bedType: cat?.bedType ?? "DOUBLE", baseRate: Number(cat?.baseRate ?? 0), extraGuestRate: Number(cat?.extraGuestRate ?? 0),
    maxAdults: cat?.maxAdults ?? 2, maxChildren: cat?.maxChildren ?? 1, taxRatePercent: Number(cat?.taxRatePercent ?? 12), amenities: (cat?.amenities ?? []).join(", "), description: cat?.description ?? "", isActive: cat?.isActive ?? true,
  });
  return (
    <Modal open onClose={onClose} title={cat ? `Edit ${cat.name}` : "New room type"} footer={<Btn loading={save.isPending} disabled={!f.name || !f.code} onClick={() => save.mutate({ ...(cat ? { id: cat.id } : {}), ...f, amenities: f.amenities.split(",").map((s) => s.trim()).filter(Boolean) }, { onSuccess: onClose })}><Save /> Save</Btn>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Deluxe Room" /></Field>
        <Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="DLX" /></Field>
        <Field label="Bed"><Select value={f.bedType} onChange={(e) => setF({ ...f, bedType: e.target.value })} options={["SINGLE", "DOUBLE", "TWIN", "KING", "SUITE"].map((v) => ({ value: v, label: v.toLowerCase() }))} /></Field>
        <Field label="Base rate / night (₹)"><Input type="number" min={0} value={f.baseRate} onChange={(e) => setF({ ...f, baseRate: Number(e.target.value) })} /></Field>
        <Field label="Extra adult / night (₹)"><Input type="number" min={0} value={f.extraGuestRate} onChange={(e) => setF({ ...f, extraGuestRate: Number(e.target.value) })} /></Field>
        <Field label="GST %"><Input type="number" min={0} value={f.taxRatePercent} onChange={(e) => setF({ ...f, taxRatePercent: Number(e.target.value) })} /></Field>
        <Field label="Max adults"><Input type="number" min={1} value={f.maxAdults} onChange={(e) => setF({ ...f, maxAdults: Number(e.target.value) })} /></Field>
        <Field label="Max children"><Input type="number" min={0} value={f.maxChildren} onChange={(e) => setF({ ...f, maxChildren: Number(e.target.value) })} /></Field>
        <Field label="Amenities (comma separated)" className="sm:col-span-2"><Input value={f.amenities} onChange={(e) => setF({ ...f, amenities: e.target.value })} placeholder="AC, Wi-Fi, Balcony, Desert view" /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} /> Bookable</label>
      </div>
    </Modal>
  );
}

function AddRoomsModal({ cats, onClose }: { cats: RoomCategory[]; onClose: () => void }) {
  const { branchId } = useBranch();
  const create = useCreateRooms(branchId);
  const [categoryId, setCategoryId] = useState(cats[0]?.id ?? "");
  const [floorLabel, setFloorLabel] = useState("");
  const [from, setFrom] = useState(101);
  const [to, setTo] = useState(105);
  const [list, setList] = useState("");
  const numbers = list.trim() ? list.split(/[\s,]+/).filter(Boolean) : Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => String(from + i));
  return (
    <Modal open onClose={onClose} title="Add rooms" footer={<Btn loading={create.isPending} disabled={!numbers.length || numbers.length > 200} onClick={() => create.mutate({ categoryId, floorLabel: floorLabel || undefined, numbers }, { onSuccess: onClose })}><Plus /> Add {numbers.length} rooms</Btn>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Room type"><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={cats.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Floor / wing"><Input value={floorLabel} onChange={(e) => setFloorLabel(e.target.value)} placeholder="First" /></Field>
        <Field label="From number"><Input type="number" value={from} onChange={(e) => setFrom(Number(e.target.value))} /></Field>
        <Field label="To number"><Input type="number" value={to} onChange={(e) => setTo(Number(e.target.value))} /></Field>
        <Field label="…or list numbers" hint="e.g. 201, 202, 205A" className="sm:col-span-2"><Input value={list} onChange={(e) => setList(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function EditRoomModal({ room, cats, onClose, onDelete }: { room: { id: string; number: string; categoryId: string; floorLabel: string }; cats: RoomCategory[]; onClose: () => void; onDelete: () => void }) {
  const { branchId } = useBranch();
  const update = useUpdateRoom(branchId);
  const [f, setF] = useState(room);
  return (
    <Modal open onClose={onClose} title={`Room ${room.number}`} size="sm" footer={<><Btn variant="ghost" onClick={onDelete}><Trash2 /> Remove</Btn><Btn loading={update.isPending} onClick={() => update.mutate({ id: room.id, number: f.number, categoryId: f.categoryId, floorLabel: f.floorLabel || null }, { onSuccess: onClose })}><Save /> Save</Btn></>}>
      <div className="space-y-3">
        <Field label="Number"><Input value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
        <Field label="Room type"><Select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })} options={cats.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Floor / wing"><Input value={f.floorLabel} onChange={(e) => setF({ ...f, floorLabel: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function MealPlans() {
  const { branchId } = useBranch();
  const { data } = useMealPlans(branchId);
  const del = useDeleteMealPlan(branchId);
  const [edit, setEdit] = useState<MealPlan | "new" | null>(null);
  return (
    <Panel title="Meal plans" subtitle="Price per guest, per night" actions={<Btn size="sm" onClick={() => setEdit("new")}><Plus /> Meal plan</Btn>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data?.map((p) => (
          <div key={p.id} className={`rounded-2xl border border-border p-4 ${p.isActive ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between">
              <p className="flex items-center gap-2 font-display text-xl font-semibold"><Coffee className="h-4 w-4 text-brand" />{p.code}</p>
              <div className="flex">
                <Btn size="sm" variant="ghost" onClick={() => setEdit(p)} aria-label="Edit"><Pencil /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => confirm(`Remove ${p.code}?`) && del.mutate(p.id)} aria-label="Delete"><Trash2 /></Btn>
              </div>
            </div>
            <p className="text-sm">{p.name}</p>
            <p className="mt-2 font-display text-lg font-semibold">{Number(p.pricePerNight) ? `${inr(p.pricePerNight)}/guest/night` : "No extra charge"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{[p.includesBreakfast && "Breakfast", p.includesLunch && "Lunch", p.includesDinner && "Dinner"].filter(Boolean).join(" · ") || "Room only"}</p>
          </div>
        ))}
      </div>
      {edit && <MealModal plan={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </Panel>
  );
}

function MealModal({ plan, onClose }: { plan: MealPlan | null; onClose: () => void }) {
  const { branchId } = useBranch();
  const save = useSaveMealPlan(branchId);
  const [f, setF] = useState({ code: plan?.code ?? "", name: plan?.name ?? "", pricePerNight: Number(plan?.pricePerNight ?? 0), includesBreakfast: plan?.includesBreakfast ?? false, includesLunch: plan?.includesLunch ?? false, includesDinner: plan?.includesDinner ?? false, isActive: plan?.isActive ?? true });
  return (
    <Modal open onClose={onClose} title={plan ? `Edit ${plan.code}` : "New meal plan"} size="sm" footer={<Btn loading={save.isPending} disabled={!f.code || !f.name} onClick={() => save.mutate({ ...(plan ? { id: plan.id } : {}), ...f }, { onSuccess: onClose })}><Save /> Save</Btn>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="₹ / guest / night"><Input type="number" min={0} value={f.pricePerNight} onChange={(e) => setF({ ...f, pricePerNight: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        {(["includesBreakfast", "includesLunch", "includesDinner"] as const).map((k) => (
          <label key={k} className="flex items-center justify-between text-sm">{k.replace("includes", "Includes ")}<Toggle checked={f[k]} onChange={(v) => setF({ ...f, [k]: v })} /></label>
        ))}
        <label className="flex items-center justify-between text-sm">Active<Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} /></label>
      </div>
    </Modal>
  );
}

function Venues() {
  const { branchId } = useBranch();
  const { data } = useVenues(branchId);
  const save = useSaveVenue(branchId);
  const [edit, setEdit] = useState<Venue | "new" | null>(null);
  const [f, setF] = useState({ name: "", kind: "BANQUET", capacity: 100, baseRate: 0, perPlateRate: 0, description: "", isActive: true });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (edit) setF(edit === "new" ? { name: "", kind: "BANQUET", capacity: 100, baseRate: 0, perPlateRate: 0, description: "", isActive: true } : { name: edit.name, kind: edit.kind, capacity: edit.capacity, baseRate: Number(edit.baseRate), perPlateRate: Number(edit.perPlateRate), description: edit.description ?? "", isActive: edit.isActive });
  }, [edit]);
  return (
    <Panel title="Venues" actions={<Btn size="sm" onClick={() => setEdit("new")}><Plus /> Venue</Btn>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((v) => (
          <button key={v.id} type="button" onClick={() => setEdit(v)} className="rounded-2xl border border-border p-4 text-left hover:border-brand">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><Gem className="h-4 w-4 text-brand" />{v.name}</p>
            <p className="text-[11px] text-muted-foreground">{v.kind.replace("_", " ").toLowerCase()} · up to {v.capacity} guests</p>
            <p className="mt-2 text-sm">{inr(v.baseRate)} venue · {inr(v.perPlateRate)}/plate</p>
          </button>
        ))}
      </div>
      {!data?.length && <Empty icon={Gem} title="No venues" />}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "New venue" : "Edit venue"} size="sm" footer={<Btn loading={save.isPending} disabled={!f.name} onClick={() => save.mutate({ ...(edit && edit !== "new" ? { id: edit.id } : {}), ...f }, { onSuccess: () => setEdit(null) })}><Save /> Save</Btn>}>
        <div className="space-y-3">
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Kind"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} options={["MARRIAGE_GARDEN", "LAWN", "BANQUET", "MEETING_HALL"].map((k) => ({ value: k, label: k.replace("_", " ").toLowerCase() }))} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Capacity"><Input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></Field>
            <Field label="Venue ₹"><Input type="number" value={f.baseRate} onChange={(e) => setF({ ...f, baseRate: Number(e.target.value) })} /></Field>
            <Field label="₹/plate"><Input type="number" value={f.perPlateRate} onChange={(e) => setF({ ...f, perPlateRate: Number(e.target.value) })} /></Field>
          </div>
          <label className="flex items-center justify-between text-sm">Active<Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} /></label>
        </div>
      </Modal>
    </Panel>
  );
}

function Property() {
  const { branchId } = useBranch();
  const { data } = useHotelSettings(branchId);
  const save = useUpdateHotelSettings(branchId);
  const [d, setD] = useDraft(data);
  const [locating, setLocating] = useState(false);
  const useMine = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setD((x) => ({ ...x, latitude: Number(p.coords.latitude.toFixed(6)), longitude: Number(p.coords.longitude.toFixed(6)) }));
        setLocating(false);
        toast.success(`Location captured (±${Math.round(p.coords.accuracy)} m)`);
      },
      () => {
        setLocating(false);
        toast.error("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Geo-fence" subtitle="Staff can open the panel only inside this radius. Guest menus and online bookings work from anywhere.">
        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-border p-3 text-sm font-semibold">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" /> Enforce geo-fence</span>
            <Toggle checked={!!d.geofenceEnabled} onChange={(v) => setD({ ...d, geofenceEnabled: v })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><Input value={d.latitude ?? ""} onChange={(e) => setD({ ...d, latitude: num(e.target.value) })} /></Field>
            <Field label="Longitude"><Input value={d.longitude ?? ""} onChange={(e) => setD({ ...d, longitude: num(e.target.value) })} /></Field>
          </div>
          <Btn variant="soft" loading={locating} onClick={useMine}><LocateFixed /> Use this device&apos;s location (stand at reception)</Btn>
          <Field label={`Radius · ${d.geofenceRadiusM ?? 200} m`}>
            <input type="range" min={50} max={1000} step={10} value={d.geofenceRadiusM ?? 200} onChange={(e) => setD({ ...d, geofenceRadiusM: Number(e.target.value) })} className="accent-[var(--primary)]" />
          </Field>
          <p className="text-[11px] text-muted-foreground">Browser GPS can be inaccurate indoors and can be spoofed. Combine with hotel Wi-Fi or managed devices for stronger control.</p>
        </div>
      </Panel>
      <Panel title="Property rules & facilities">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Address" className="sm:col-span-2"><Input value={d.address ?? ""} onChange={(e) => setD({ ...d, address: e.target.value })} /></Field>
          <Field label="Reception phone"><Input value={d.phone ?? ""} onChange={(e) => setD({ ...d, phone: e.target.value })} /></Field>
          <Field label="Check-in time"><Input type="time" value={d.checkInTime ?? "12:00"} onChange={(e) => setD({ ...d, checkInTime: e.target.value })} /></Field>
          <Field label="Check-out time"><Input type="time" value={d.checkOutTime ?? "11:00"} onChange={(e) => setD({ ...d, checkOutTime: e.target.value })} /></Field>
          <Field label="'Checkout soon' (hours before)"><Input type="number" min={1} max={12} value={d.checkoutSoonHours ?? 3} onChange={(e) => setD({ ...d, checkoutSoonHours: Number(e.target.value) })} /></Field>
          <Field label="Wi-Fi name"><Input value={d.wifiName ?? ""} onChange={(e) => setD({ ...d, wifiName: e.target.value })} /></Field>
          <Field label="Wi-Fi password" hint="Shown to checked-in guests only"><Input value={d.wifiPassword ?? ""} onChange={(e) => setD({ ...d, wifiPassword: e.target.value })} /></Field>
          <Field label={<span className="flex items-center gap-1"><Waves className="h-3 w-3" /> Pool adult ₹</span>}><Input type="number" min={0} value={d.poolAdultRate ?? 0} onChange={(e) => setD({ ...d, poolAdultRate: Number(e.target.value) })} /></Field>
          <Field label="Pool child ₹"><Input type="number" min={0} value={d.poolChildRate ?? 0} onChange={(e) => setD({ ...d, poolChildRate: Number(e.target.value) })} /></Field>
          <Field label="Pool capacity / session"><Input type="number" min={1} value={d.poolSlotCapacity ?? 40} onChange={(e) => setD({ ...d, poolSlotCapacity: Number(e.target.value) })} /></Field>
        </div>
      </Panel>
      <div className="flex justify-end lg:col-span-2">
        <Btn
          loading={save.isPending}
          onClick={() =>
            save.mutate({
              geofenceEnabled: d.geofenceEnabled, latitude: d.latitude ?? null, longitude: d.longitude ?? null, geofenceRadiusM: d.geofenceRadiusM,
              address: d.address || null, phone: d.phone || null, checkInTime: d.checkInTime, checkOutTime: d.checkOutTime, checkoutSoonHours: d.checkoutSoonHours,
              wifiName: d.wifiName || null, wifiPassword: d.wifiPassword || null, poolAdultRate: d.poolAdultRate, poolChildRate: d.poolChildRate, poolSlotCapacity: d.poolSlotCapacity,
            })
          }
        >
          <Save /> Save property settings
        </Btn>
      </div>
    </div>
  );
}
