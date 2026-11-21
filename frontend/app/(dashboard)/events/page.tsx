"use client";

import { ChevronLeft, ChevronRight, Gem, IndianRupee, Plus, Printer, Trash2, Users } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Btn, Empty, Field, Input, Modal, PageHeader, Panel, Select, Stat, Tag, Textarea, fmtDate, inr, todayIso } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useEventPayment, useEvents, useHotelSettings, useSaveEvent, useVenues, type EventBooking } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";

const KIND: Record<string, string> = { MARRIAGE_GARDEN: "Marriage garden", LAWN: "Lawn", BANQUET: "Banquet hall", MEETING_HALL: "Meeting hall" };
const TYPES = ["WEDDING", "RECEPTION", "BIRTHDAY", "CORPORATE", "CONFERENCE", "OTHER"];
const STATUSES = ["ENQUIRY", "QUOTED", "CONFIRMED", "COMPLETED", "CANCELLED"];
const SERVICE_PRESETS = ["Stage decoration", "Flower decoration", "Lighting", "DJ & sound", "Mehendi setup", "Photography", "Valet parking"];

const monthKey = (d: string) => d.slice(0, 7);

export default function EventsPage() {
  const { branchId } = useBranch();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const from = `${month}-01`;
  const to = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const { data: events } = useEvents(branchId, from, to);
  const { data: upcoming } = useEvents(branchId, todayIso());
  const { data: venues } = useVenues(branchId);
  const [editing, setEditing] = useState<EventBooking | "new" | null>(null);
  const [preset, setPreset] = useState<{ date?: string; venueId?: string }>({});

  const days = useMemo(() => {
    const first = new Date(`${from}T00:00:00Z`);
    const pad = (first.getUTCDay() + 6) % 7;
    const n = Number(to.slice(8, 10));
    return [...Array(pad).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [from, to, month]);

  const live = (upcoming ?? []).filter((e) => e.status !== "CANCELLED");
  const pipeline = live.reduce((a, e) => a + e.totals.total, 0);
  const due = live.reduce((a, e) => a + Math.max(0, e.totals.balance), 0);
  const shift = (n: number) => {
    const d = new Date(`${month}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="mx-auto max-w-[1450px]">
      <PageHeader
        title="Events"
        actions={<Btn onClick={() => { setPreset({}); setEditing("new"); }} disabled={!venues?.length}><Plus /> New event</Btn>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Upcoming events" value={live.length} icon={Gem} />
        <Stat label="Guests expected" value={live.reduce((a, e) => a + e.guestCount, 0).toLocaleString("en-IN")} icon={Users} tone="blue" />
        <Stat label="Booked value" value={inr(pipeline)} icon={IndianRupee} tone="accent" />
        <Stat label="Balance to collect" value={inr(due)} icon={IndianRupee} tone="red" />
      </div>
      {!venues?.length && <Empty icon={Gem} title="No venues set up" body="Add your marriage garden, banquet hall or meeting room in Hotel Setup › Venues." />}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel
          title={new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          actions={
            <div className="flex gap-1">
              <Btn size="sm" variant="outline" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></Btn>
              <Btn size="sm" variant="outline" onClick={() => setMonth(todayIso().slice(0, 7))}>Today</Btn>
              <Btn size="sm" variant="outline" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></Btn>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10.5px] font-semibold text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, i) =>
              d ? (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setPreset({ date: d }); setEditing("new"); }}
                  className={cn("group flex min-h-24 flex-col rounded-xl border p-1.5 text-left transition hover:border-brand/50", d === todayIso() ? "border-brand bg-brand/5" : "border-border bg-card")}
                >
                  <span className="text-xs font-semibold">{Number(d.slice(8))}</span>
                  <div className="mt-1 space-y-1">
                    {(events ?? []).filter((e) => e.eventDate === d && monthKey(e.eventDate) === month).map((e) => (
                      <span
                        key={e.id}
                        role="button"
                        tabIndex={0}
                        onClick={(ev) => { ev.stopPropagation(); setEditing(e); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); setEditing(e); } }}
                        className={cn("block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold", e.status === "CONFIRMED" ? "bg-brand text-primary-foreground" : e.status === "CANCELLED" ? "bg-stone-100 text-stone-400 line-through" : "bg-brand-accent/20 text-foreground")}
                      >
                        {e.startTime} {e.customerName}
                      </span>
                    ))}
                  </div>
                </button>
              ) : (
                <div key={`pad-${i}`} />
              ),
            )}
          </div>
        </Panel>
        <Panel title="Upcoming" bodyClassName="p-0">
          <ul className="divide-y divide-border/60">
            {live.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">No upcoming events.</li>}
            {live.slice(0, 20).map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => setEditing(e)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/50">
                  <div className="flex w-12 flex-col items-center rounded-xl bg-brand/10 py-1.5 text-brand">
                    <span className="text-[10px] font-semibold uppercase">{fmtDate(e.eventDate, { month: "short" })}</span>
                    <span className="font-display text-lg leading-none font-semibold">{Number(e.eventDate.slice(8))}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.customerName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.eventType.toLowerCase()} · {e.venue.name} · {e.guestCount} pax</p>
                  </div>
                  <div className="text-right">
                    <Tag value={e.status} />
                    <p className="mt-1 text-[11px] text-muted-foreground">due {inr(Math.max(0, e.totals.balance))}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {editing && <EventEditor key={editing === "new" ? "new" : editing.id} event={editing === "new" ? null : editing} preset={preset} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EventEditor({ event, preset, onClose }: { event: EventBooking | null; preset: { date?: string; venueId?: string }; onClose: () => void }) {
  const { branchId } = useBranch();
  const { data: venues } = useVenues(branchId);
  const { data: hotel } = useHotelSettings(branchId);
  const save = useSaveEvent(branchId);
  const pay = useEventPayment(branchId);
  const firstVenue = venues?.[0];
  const [f, setF] = useState(() => ({
    venueId: event?.venueId ?? preset.venueId ?? firstVenue?.id ?? "",
    eventType: event?.eventType ?? "WEDDING",
    status: event?.status ?? "ENQUIRY",
    customerName: event?.customerName ?? "",
    customerPhone: event?.customerPhone ?? "",
    customerEmail: event?.customerEmail ?? "",
    eventDate: event?.eventDate ?? preset.date ?? todayIso(),
    startTime: event?.startTime ?? "18:00",
    endTime: event?.endTime ?? "23:00",
    guestCount: event?.guestCount ?? 200,
    packageName: event?.packageName ?? "",
    services: event?.services ?? [],
    venueCharge: Number(event?.venueCharge ?? firstVenue?.baseRate ?? 0),
    cateringPerPlate: Number(event?.cateringPerPlate ?? firstVenue?.perPlateRate ?? 0),
    taxRatePercent: Number(event?.taxRatePercent ?? 18),
    roomBlockCount: event?.roomBlockCount ?? 0,
    notes: event?.notes ?? "",
  }));
  const [payment, setPayment] = useState({ amount: 0, method: "UPI", reference: "" });
  const catering = f.cateringPerPlate * f.guestCount;
  const svc = f.services.reduce((a, s) => a + Number(s.amount || 0), 0);
  const subtotal = f.venueCharge + catering + svc;
  const tax = Math.round(subtotal * f.taxRatePercent) / 100;
  const total = subtotal + tax;
  const paid = event?.totals.paid ?? 0;

  const pickVenue = (id: string) => {
    const v = venues?.find((x) => x.id === id);
    setF({ ...f, venueId: id, venueCharge: event ? f.venueCharge : Number(v?.baseRate ?? 0), cateringPerPlate: event ? f.cateringPerPlate : Number(v?.perPlateRate ?? 0) });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={event ? `${event.code} · ${event.customerName}` : "New event"}
      footer={
        <>
          {event && <Btn variant="outline" onClick={() => window.print()}><Printer /> Print quotation</Btn>}
          <Btn loading={save.isPending} disabled={!f.customerName || !f.venueId} onClick={() => save.mutate({ ...(event ? { id: event.id } : {}), ...f, customerPhone: f.customerPhone || null, customerEmail: f.customerEmail || null }, { onSuccess: onClose })}>
            Save event
          </Btn>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Venue">
              <Select value={f.venueId} onChange={(e) => pickVenue(e.target.value)} options={(venues ?? []).map((v) => ({ value: v.id, label: `${v.name} (${v.capacity})` }))} />
            </Field>
            <Field label="Event type">
              <Select value={f.eventType} onChange={(e) => setF({ ...f, eventType: e.target.value })} options={TYPES.map((t) => ({ value: t, label: t.toLowerCase() }))} />
            </Field>
            <Field label="Status">
              <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={STATUSES.map((t) => ({ value: t, label: t.toLowerCase() }))} />
            </Field>
            <Field label="Customer">
              <Input value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={f.customerEmail} onChange={(e) => setF({ ...f, customerEmail: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={f.eventDate} onChange={(e) => setF({ ...f, eventDate: e.target.value })} />
            </Field>
            <Field label="From">
              <Input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} />
            </Field>
            <Field label="To">
              <Input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} />
            </Field>
            <Field label="Guests">
              <Input type="number" min={1} value={f.guestCount} onChange={(e) => setF({ ...f, guestCount: Number(e.target.value) })} />
            </Field>
            <Field label="Venue charge (₹)">
              <Input type="number" min={0} value={f.venueCharge} onChange={(e) => setF({ ...f, venueCharge: Number(e.target.value) })} />
            </Field>
            <Field label="Catering / plate (₹)">
              <Input type="number" min={0} value={f.cateringPerPlate} onChange={(e) => setF({ ...f, cateringPerPlate: Number(e.target.value) })} />
            </Field>
            <Field label="Package name">
              <Input value={f.packageName} onChange={(e) => setF({ ...f, packageName: e.target.value })} placeholder="Royal Wedding" />
            </Field>
            <Field label="GST %">
              <Input type="number" min={0} value={f.taxRatePercent} onChange={(e) => setF({ ...f, taxRatePercent: Number(e.target.value) })} />
            </Field>
            <Field label="Guest rooms blocked">
              <Input type="number" min={0} value={f.roomBlockCount} onChange={(e) => setF({ ...f, roomBlockCount: Number(e.target.value) })} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-muted-foreground">Services · decoration · extras</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SERVICE_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setF({ ...f, services: [...f.services, { name: p, amount: 0 }] })} className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-brand hover:text-brand">
                  + {p}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {f.services.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s.name} onChange={(e) => setF({ ...f, services: f.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <Input type="number" min={0} className="w-36" value={s.amount || ""} placeholder="₹" onChange={(e) => setF({ ...f, services: f.services.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} />
                  <Btn variant="ghost" onClick={() => setF({ ...f, services: f.services.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 /></Btn>
                </div>
              ))}
            </div>
          </div>
          <Field label="Notes">
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Menu choices, staff allocation, special requirements" />
          </Field>
        </div>

        <div className="space-y-4">
          <motion.div layout className="relative overflow-hidden rounded-2xl bg-ink p-5 text-[#F3E9DA]">
            <p className="relative text-[13px] font-medium text-brand-accent">Quotation</p>
            <div className="relative mt-3 space-y-1.5 text-sm">
              <Q k="Venue" v={inr(f.venueCharge)} />
              <Q k={`Catering ${f.guestCount} × ${inr(f.cateringPerPlate)}`} v={inr(catering)} />
              {f.services.map((s, i) => <Q key={i} k={s.name} v={inr(s.amount)} />)}
              <Q k={`GST ${f.taxRatePercent}%`} v={inr(tax)} />
              <div className="my-2 h-px bg-white/10" />
              <div className="flex items-end justify-between">
                <span className="text-xs text-[#F3E9DA]/70">Total</span>
                <span className="font-display text-3xl font-semibold">{inr(total)}</span>
              </div>
              {event && (
                <>
                  <Q k="Received" v={`−${inr(paid)}`} />
                  <Q k="Balance" v={inr(Math.max(0, total - paid))} />
                </>
              )}
            </div>
          </motion.div>
          {event && event.status !== "CANCELLED" && (
            <div className="rounded-2xl border border-border p-4">
              <p className="mb-2 text-[13px] font-medium text-muted-foreground">Advance / instalment</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={0} placeholder="₹" value={payment.amount || ""} onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })} />
                <Select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} options={["UPI", "CASH", "CARD", "BANK_TRANSFER", "PAYMENT_LINK"].map((m) => ({ value: m, label: m.replace("_", " ") }))} />
                <Input className="col-span-2" placeholder="Reference" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
              </div>
              <Btn className="mt-2 w-full" variant="soft" disabled={payment.amount <= 0} loading={pay.isPending} onClick={() => pay.mutate({ id: event.id, ...payment }, { onSuccess: () => setPayment({ amount: 0, method: "UPI", reference: "" }) })}>
                Record payment
              </Btn>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {event.payments.map((p, i) => <li key={i} className="flex justify-between"><span>{new Date(p.at).toLocaleDateString("en-IN")} · {p.method}</span><span>{inr(p.amount)}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Printable quotation */}
      <div className="print-only print-solo bg-white p-10 text-black">
        <h1 className="font-display text-3xl font-semibold">{hotel?.hotelName}</h1>
        <p className="text-xs">{hotel?.address} {hotel?.gstNumber ? `· GSTIN ${hotel.gstNumber}` : ""}</p>
        <h2 className="mt-6 text-xl font-semibold">Event Quotation {event?.code}</h2>
        <p className="mt-1 text-sm">{f.customerName} · {f.eventType.toLowerCase()} · {fmtDate(f.eventDate)} {f.startTime}–{f.endTime} · {venues?.find((v) => v.id === f.venueId)?.name} · {f.guestCount} guests</p>
        <table className="mt-4 w-full text-sm">
          <tbody>
            <tr><td className="py-1">Venue{f.packageName ? ` – ${f.packageName}` : ""}</td><td className="text-right">{inr(f.venueCharge)}</td></tr>
            <tr><td className="py-1">Catering {f.guestCount} × {inr(f.cateringPerPlate)}</td><td className="text-right">{inr(catering)}</td></tr>
            {f.services.map((s, i) => <tr key={i}><td className="py-1">{s.name}</td><td className="text-right">{inr(s.amount)}</td></tr>)}
            <tr><td className="py-1">GST {f.taxRatePercent}%</td><td className="text-right">{inr(tax)}</td></tr>
            <tr className="border-t font-semibold"><td className="py-2">Total</td><td className="text-right">{inr(total)}</td></tr>
            {paid > 0 && <tr><td>Advance received</td><td className="text-right">{inr(paid)}</td></tr>}
          </tbody>
        </table>
        {f.notes && <p className="mt-4 text-sm whitespace-pre-line">{f.notes}</p>}
      </div>
    </Modal>
  );
}

function Q({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="truncate text-[#F3E9DA]/70">{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}

