"use client";

import { Check, Plus, Printer, Ticket, Waves, X } from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Btn, Empty, Field, Input, Modal, PageHeader, Panel, Segmented, Select, Stat, Tag, addDays, inr, todayIso } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useCreatePass, usePassStatus, usePool } from "@/hooks/use-hotel";

const SLOT_LABEL: Record<string, string> = { MORNING: "Morning · 7–11", AFTERNOON: "Afternoon · 12–4", EVENING: "Evening · 5–9" };

export default function PoolPage() {
  const { branchId } = useBranch();
  const [date, setDate] = useState(todayIso());
  const { data } = usePool(branchId, date);
  const status = usePassStatus(branchId);
  const [open, setOpen] = useState(false);
  const [printPass, setPrintPass] = useState<null | { code: string; name: string; slot: string }>(null);
  const passes = data?.passes ?? [];
  const live = passes.filter((p) => p.status !== "CANCELLED");
  const revenue = live.filter((p) => p.paymentMethod !== "INCLUDED").reduce((a, p) => a + p.amount, 0);

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Swimming pool"
        actions={
          <>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            <Btn onClick={() => setOpen(true)}>
              <Plus /> Issue pass
            </Btn>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Swimmers booked" value={live.reduce((a, p) => a + p.adults + p.children, 0)} icon={Waves} tone="blue" />
        <Stat label="Checked in" value={live.filter((p) => p.status === "CHECKED_IN").length} icon={Check} tone="green" />
        <Stat label="Hotel guests" value={live.filter((p) => p.guestType === "HOTEL_GUEST").length} icon={Ticket} />
        <Stat label="Pool revenue" value={inr(revenue)} hint={`Adult ${inr(data?.rates.adult)} · Child ${inr(data?.rates.child)}`} icon={Waves} tone="accent" />
      </div>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {data?.slots.map((s) => {
          const pct = Math.min(100, Math.round((s.used / s.capacity) * 100));
          return (
            <div key={s.slot} className="lux-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-semibold">{SLOT_LABEL[s.slot]}</p>
                <span className="text-sm tabular-nums text-muted-foreground">{s.used}/{s.capacity}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ background: pct > 85 ? "#C9362C" : pct > 60 ? "#E2B13B" : "#2C6BD8" }} />
              </div>
            </div>
          );
        })}
      </div>
      <Panel title={`Passes · ${date}`} bodyClassName="p-0">
        {passes.length === 0 ? (
          <div className="p-6"><Empty icon={Waves} title="No passes for this day" action={<Btn onClick={() => setOpen(true)}><Plus /> Issue pass</Btn>} /></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {passes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="font-mono text-xs font-semibold text-brand">{p.code}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.guestType === "HOTEL_GUEST" ? `Guest · ${p.booking?.code} · Room ${p.booking?.room?.number ?? "—"}` : "Visitor"} · {p.adults}A {p.children}C · {SLOT_LABEL[p.slot]}
                  </p>
                </div>
                <span className="text-sm font-semibold">{p.paymentMethod === "INCLUDED" ? "Included" : inr(p.amount)}</span>
                <span className="text-[11px] text-muted-foreground">{p.paymentMethod}</span>
                <Tag value={p.status === "CHECKED_IN" ? "SENT" : p.status} label={p.status.replace("_", " ").toLowerCase()} />
                <Btn size="sm" variant="ghost" onClick={() => setPrintPass({ code: p.code, name: p.name, slot: p.slot })} aria-label="Print pass">
                  <Printer />
                </Btn>
                {p.status === "ISSUED" && (
                  <>
                    <Btn size="sm" variant="soft" onClick={() => status.mutate({ id: p.id, status: "CHECKED_IN" })}>Gate in</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => status.mutate({ id: p.id, status: "CANCELLED" })} aria-label="Cancel pass"><X /></Btn>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <IssueModal open={open} onClose={() => setOpen(false)} date={date} rates={data?.rates} />
      <Modal open={!!printPass} onClose={() => setPrintPass(null)} title="Pool pass" size="sm" footer={<Btn onClick={() => window.print()}><Printer /> Print</Btn>}>
        {printPass && (
          <div className="print-solo mx-auto w-64 rounded-3xl bg-[linear-gradient(160deg,#0E3B5C,#1F78A8)] p-6 text-center text-white [print-color-adjust:exact]">
            <Waves className="mx-auto h-6 w-6" />
            <p className="mt-1 text-[10px] text-sky-100">Pool pass</p>
            <div className="mx-auto mt-3 w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={printPass.code} size={140} /></div>
            <p className="mt-3 font-mono text-sm">{printPass.code}</p>
            <p className="font-display text-lg font-semibold">{printPass.name}</p>
            <p className="text-xs text-sky-100">{date} · {SLOT_LABEL[printPass.slot]}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function IssueModal({ open, onClose, date, rates }: { open: boolean; onClose: () => void; date: string; rates?: { adult: number; child: number } }) {
  const { branchId } = useBranch();
  const create = useCreatePass(branchId);
  const [f, setF] = useState({ guestType: "VISITOR", bookingCode: "", name: "", phone: "", adults: 1, children: 0, sessionDate: date, slot: "MORNING", paymentMethod: "CASH" });
  const amount = f.paymentMethod === "INCLUDED" ? 0 : f.adults * (rates?.adult ?? 0) + f.children * (rates?.child ?? 0);
  const guest = f.guestType === "HOTEL_GUEST";
  return (
    <Modal open={open} onClose={onClose} title="Issue pool pass" footer={<><span className="mr-auto font-display text-xl font-semibold">{inr(amount)}</span><Btn disabled={!f.name || (guest && !f.bookingCode)} loading={create.isPending} onClick={() => create.mutate({ ...f, sessionDate: f.sessionDate || date }, { onSuccess: onClose })}><Ticket /> Issue</Btn></>}>
      <div className="space-y-4">
        <Segmented value={f.guestType} onChange={(v) => setF({ ...f, guestType: v, paymentMethod: v === "HOTEL_GUEST" ? "FOLIO" : "CASH" })} options={[{ value: "VISITOR", label: "Outside visitor" }, { value: "HOTEL_GUEST", label: "Hotel guest" }]} />
        <div className="grid gap-3 sm:grid-cols-2">
          {guest && (
            <Field label="Booking ID" hint="Checked-in guests only">
              <Input value={f.bookingCode} onChange={(e) => setF({ ...f, bookingCode: e.target.value.toUpperCase() })} placeholder="HTH-2026-00001" />
            </Field>
          )}
          <Field label="Name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label="Adults">
            <Input type="number" min={0} value={f.adults} onChange={(e) => setF({ ...f, adults: Number(e.target.value) })} />
          </Field>
          <Field label="Children">
            <Input type="number" min={0} value={f.children} onChange={(e) => setF({ ...f, children: Number(e.target.value) })} />
          </Field>
          <Field label="Date">
            <Input type="date" min={todayIso()} max={addDays(todayIso(), 60)} value={f.sessionDate} onChange={(e) => setF({ ...f, sessionDate: e.target.value })} />
          </Field>
          <Field label="Session">
            <Select value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} options={Object.entries(SLOT_LABEL).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Payment" className="sm:col-span-2">
            <Select
              value={f.paymentMethod}
              onChange={(e) => setF({ ...f, paymentMethod: e.target.value })}
              options={(guest ? ["FOLIO", "INCLUDED", "CASH", "UPI", "CARD"] : ["CASH", "UPI", "CARD"]).map((m) => ({ value: m, label: m === "FOLIO" ? "Charge to room folio" : m === "INCLUDED" ? "Included in package" : m }))}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
