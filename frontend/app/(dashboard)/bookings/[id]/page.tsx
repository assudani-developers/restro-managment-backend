"use client";

import {
  ArrowLeft,
  BadgeIndianRupee,
  BedDouble,
  Ban,
  Check,
  Copy,
  DoorOpen,
  KeyRound,
  LogIn,
  MessageCircle,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Send,
  UtensilsCrossed,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use, useState } from "react";
import { toast } from "sonner";
import { Btn, Empty, Field, Input, Modal, Panel, Segmented, Select, Tag, fmtDate, inr, waLink } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import {
  useBooking,
  useBookingAction,
  useFreeRooms,
  useHotelSettings,
  useMarkLog,
  usePostOrderToFolio,
  type PayMethod,
} from "@/hooks/use-hotel";
import { buildUpiUri } from "@/lib/upi";
import { cn } from "@/lib/utils";

const CHARGE_LABEL: Record<string, string> = {
  ROOM: "Room", MEAL_PLAN: "Meal plan", RESTAURANT: "Restaurant", ROOM_SERVICE: "Room service", POOL: "Pool", EVENT: "Event",
  EXTRA: "Extra", TAX: "Tax", DISCOUNT: "Discount", PAYMENT: "Payment", REFUND: "Refund",
};
const TRIGGERS = ["BOOKING_CONFIRMED", "PRE_ARRIVAL", "CHECKED_IN", "FOLIO_UPDATED", "CHECKOUT_REMINDER", "PAYMENT_COMPLETED", "CHECKED_OUT"];

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { branchId } = useBranch();
  const { data: b, isLoading } = useBooking(branchId, id);
  const { data: hotel } = useHotelSettings(branchId);
  const action = useBookingAction(branchId, id);
  const markLog = useMarkLog(branchId);
  const postOrder = usePostOrderToFolio(branchId);
  const [modal, setModal] = useState<null | "checkin" | "pay" | "charge" | "cancel" | "qr" | "checkout">(null);

  if (isLoading || !b) return <div className="mx-auto h-96 max-w-6xl animate-pulse rounded-3xl bg-muted" />;

  const t = b.totals;
  const balance = Math.max(0, t.balance);
  const upi = hotel?.upiVpa ? buildUpiUri({ vpa: hotel.upiVpa, name: hotel.upiPayeeName ?? hotel.hotelName, amount: balance, note: `Folio ${b.code}`, ref: `${b.code}-${Math.round(balance)}`.slice(0, 35) }) : null;
  const active = b.status === "CONFIRMED" || b.status === "CHECKED_IN";
  const unposted = b.orders.filter((o) => !o.folioPostedAt && (o.status === "OPEN" || o.status === "BILLED"));

  const run = (a: string, body?: unknown, done?: () => void) => action.mutate({ action: a, body }, { onSuccess: () => { setModal(null); done?.(); } });

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5 flex items-center gap-2 print-hidden">
        <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Bookings
        </Link>
      </div>

      {/* hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-6 overflow-hidden rounded-3xl bg-ink p-6 text-[#F3E9DA] sm:p-8 print-hidden">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs tracking-wider text-brand-accent">{b.code}</span>
              <Tag value={b.status} />
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{b.source === "OTA" ? `${b.otaName ?? "OTA"} ${b.otaReference ?? ""}` : b.source.replace("_", " ").toLowerCase()}</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{b.guestName}</h1>
            <p className="mt-2 text-sm text-[#F3E9DA]/70">
              {b.category.name} {b.room ? `· Room ${b.room.number}` : "· room not assigned"} · {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {b.nights} night{b.nights > 1 ? "s" : ""} · {b.adults}A {b.children}C ·{" "}
              {b.mealPlan ? `${b.mealPlan.code} ${b.mealPlan.name}` : "Room only"}
            </p>
            <p className="mt-1 text-xs text-[#F3E9DA]/55">
              {b.guestPhone ?? "no phone"} {b.guestEmail ? `· ${b.guestEmail}` : ""} {b.status === "CHECKED_IN" ? `· Room-service PIN ${b.stayPin}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="text-left lg:text-right">
              <p className="text-[11px] text-[#F3E9DA]/55">Balance payable</p>
              <p className={cn("font-display text-4xl font-semibold", balance > 0 ? "text-[#FBE9C9]" : "text-emerald-300")}>{inr(balance)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {b.status === "CONFIRMED" && (
                <Btn onClick={() => setModal("checkin")}>
                  <LogIn /> Check in
                </Btn>
              )}
              {b.status === "CHECKED_IN" && (
                <Btn onClick={() => setModal("checkout")}>
                  <DoorOpen /> Check out
                </Btn>
              )}
              {active && balance > 0 && (
                <Btn variant="outline" className="border-white/15 bg-white/5 text-[#F3E9DA] hover:bg-white/10" onClick={() => setModal("pay")}>
                  <BadgeIndianRupee /> Record payment
                </Btn>
              )}
              {upi && balance > 0 && (
                <Btn variant="outline" className="border-white/15 bg-white/5 text-[#F3E9DA] hover:bg-white/10" onClick={() => setModal("qr")}>
                  <QrCode /> Payment QR
                </Btn>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Panel
            title="Digital guest folio"
            subtitle="Charges and payments for this stay"
            actions={
              <div className="flex gap-2 print-hidden">
                {active && (
                  <Btn size="sm" variant="soft" onClick={() => setModal("charge")}>
                    <Plus /> Add charge
                  </Btn>
                )}
                <Btn size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer /> Invoice
                </Btn>
              </div>
            }
            bodyClassName="p-0"
          >
            <div className="print-only px-6 pt-6">
              <h2 className="font-display text-2xl font-semibold">{hotel?.hotelName}</h2>
              <p className="text-xs">{hotel?.address} {hotel?.gstNumber ? `· GSTIN ${hotel.gstNumber}` : ""}</p>
              <p className="mt-3 text-sm">
                Tax invoice · {b.code} · {b.guestName} · {b.category.name} {b.room ? `Room ${b.room.number}` : ""} · {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
              </p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {b.folio.map((f) => {
                  const credit = f.type === "PAYMENT" || f.type === "DISCOUNT";
                  return (
                    <tr key={f.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium">{f.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {CHARGE_LABEL[f.type]} · {new Date(f.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {f.reference ? ` · ref ${f.reference}` : ""}
                        </p>
                      </td>
                      <td className={cn("px-5 py-3 text-right font-semibold tabular-nums", credit ? "text-emerald-700" : f.type === "REFUND" ? "text-rose-700" : "")}>
                        {credit ? "−" : ""}
                        {inr(f.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/40 text-sm">
                <tr>
                  <td className="px-5 py-2 text-muted-foreground">Total (incl. GST)</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(t.total)}</td>
                </tr>
                <tr>
                  <td className="px-5 py-2 text-muted-foreground">Paid {t.refunds > 0 ? `(net of ${inr(t.refunds)} refunds)` : ""}</td>
                  <td className="px-5 py-2 text-right text-emerald-700 tabular-nums">−{inr(t.paid)}</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-display text-base font-semibold">{t.balance < 0 ? "Refund due to guest" : "Balance payable"}</td>
                  <td className="px-5 py-3 text-right font-display text-xl font-semibold tabular-nums">{inr(Math.abs(t.balance))}</td>
                </tr>
              </tfoot>
            </table>
          </Panel>

          <Panel title="Food orders" className="print-hidden">
            {b.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders linked to this stay yet. The guest can order from the in-room QR.</p>
            ) : (
              <ul className="space-y-2">
                {b.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-4 py-3">
                    <UtensilsCrossed className="h-4 w-4 text-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {o.orderNumber} · {inr(o.totalAmount)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{o.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}</p>
                    </div>
                    {o.folioPostedAt ? <Tag value="SENT" label="On folio" /> : <Tag value={o.status === "PAID" ? "COMPLETED" : "QUEUED"} label={o.status.toLowerCase()} />}
                    {!o.folioPostedAt && (o.status === "OPEN" || o.status === "BILLED") && b.status === "CHECKED_IN" && (
                      <Btn size="sm" variant="soft" loading={postOrder.isPending} onClick={() => postOrder.mutate({ orderId: o.id, bookingId: b.id })}>
                        Charge to room
                      </Btn>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5 print-hidden">
          <Panel title="Guest link" subtitle="Booking details, bill and payment for the guest">
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 pl-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{b.guestLink}</span>
              <Btn size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(b.guestLink); toast.success("Link copied"); }}>
                <Copy />
              </Btn>
            </div>
            {b.guestPhone && (
              <a href={waLink(b.guestPhone, `Dear ${b.guestName}, your booking ${b.code} at ${hotel?.hotelName}: ${b.guestLink}`)} target="_blank" rel="noreferrer" className="mt-2 block">
                <Btn variant="soft" className="w-full">
                  <MessageCircle /> Send link on WhatsApp
                </Btn>
              </a>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                <div key={m} className="rounded-xl border border-border/70 py-2">
                  <p className="font-display text-xl font-semibold">{b.entitlement[m]}</p>
                  <p className="text-[10px] text-muted-foreground">{m} incl.</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Meals included in the {b.entitlement.plan} plan are already paid. Bill only extra orders.</p>
          </Panel>

          <Panel title="Messages" bodyClassName="p-0">
            <ul className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
              {b.notifications.length === 0 && <li className="px-5 py-5 text-sm text-muted-foreground">{b.guestPhone || b.guestEmail ? "No messages yet." : "Add a phone or email to send messages."}</li>}
              {b.notifications.map((n) => (
                <li key={n.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{n.trigger.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>
                    <Tag value={n.status} />
                  </div>
                  <p className="mt-1 line-clamp-3 text-[11.5px] whitespace-pre-line text-muted-foreground">{n.body}</p>
                  {n.status === "QUEUED" && n.channel === "WHATSAPP" && /\d{6,}/.test(n.recipient) && (
                    <a href={waLink(n.recipient, n.body)} target="_blank" rel="noreferrer" onClick={() => markLog.mutate({ id: n.id, status: "SENT" })} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                      <Send className="h-3 w-3" /> Send on WhatsApp
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5 border-t border-border/70 px-5 py-3">
              {TRIGGERS.map((tr) => (
                <button key={tr} type="button" onClick={() => action.mutate({ action: "notify", body: { trigger: tr } })} className="rounded-full border border-border px-2 py-1 text-[10.5px] font-medium hover:border-brand hover:text-brand">
                  {tr.replace(/_/g, " ").toLowerCase()}
                </button>
              ))}
            </div>
          </Panel>

          {b.status === "CONFIRMED" && (
            <div className="flex gap-2">
              <Btn variant="outline" className="flex-1" onClick={() => setModal("cancel")}>
                <Ban /> Cancel booking
              </Btn>
              <Btn variant="ghost" onClick={() => run("no-show")}>
                No-show
              </Btn>
            </div>
          )}
          {t.balance < 0 && (
            <Btn variant="outline" className="w-full" onClick={() => setModal("pay")}>
              <RotateCcw /> Refund {inr(-t.balance)}
            </Btn>
          )}
        </div>
      </div>

      <CheckInModal open={modal === "checkin"} onClose={() => setModal(null)} booking={b} loading={action.isPending} onSubmit={(body) => run("check-in", body)} />
      <PaymentModal open={modal === "pay"} onClose={() => setModal(null)} balance={t.balance} paid={t.paid} loading={action.isPending} onSubmit={(body) => run("payments", body)} />
      <ChargeModal open={modal === "charge"} onClose={() => setModal(null)} loading={action.isPending} onSubmit={(body) => run("charges", body)} />
      <Modal open={modal === "cancel"} onClose={() => setModal(null)} title="Cancel booking" size="sm">
        <CancelForm loading={action.isPending} onSubmit={(reason) => run("cancel", { reason })} paid={t.paid} />
      </Modal>
      <Modal
        open={modal === "checkout"}
        onClose={() => setModal(null)}
        title={`Check out ${b.guestName}`}
        size="sm"
        footer={
          <>
            {(balance > 0 || unposted.length > 0) && (
              <Btn variant="ghost" loading={action.isPending} onClick={() => run("check-out", { allowDue: true })}>
                Checkout with dues
              </Btn>
            )}
            <Btn disabled={balance > 0 || unposted.length > 0} loading={action.isPending} onClick={() => run("check-out", { allowDue: false })}>
              <Check /> Complete checkout
            </Btn>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <Line ok={unposted.length === 0} text={unposted.length ? `${unposted.length} open food order(s). Charge them to the room first` : "All food orders settled"} />
          <Line ok={balance <= 0} text={balance > 0 ? `${inr(balance)} still payable` : "Folio fully paid"} />
          <p className="text-muted-foreground">Room {b.room?.number} will turn orange (Dirty) for housekeeping and the guest gets a thank-you with the feedback link.</p>
        </div>
      </Modal>
      <Modal open={modal === "qr"} onClose={() => setModal(null)} title="Scan to pay exact amount" subtitle={`${b.code} · ${inr(balance)}`} size="sm">
        {upi && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <QRCodeSVG value={upi} size={220} level="M" fgColor="#17110D" />
            </div>
            <p className="font-display text-3xl font-semibold">{inr(balance)}</p>
            <p className="text-xs text-muted-foreground">
              UPI to {hotel?.upiVpa}. After the guest pays, check your bank/UPI app and record it with the UTR.
            </p>
            <Btn onClick={() => setModal("pay")}>
              <Receipt /> Record this payment
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Line({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={cn("flex items-center gap-2 font-medium", ok ? "text-emerald-700" : "text-rose-700")}>
      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-white", ok ? "bg-emerald-600" : "bg-rose-600")}>{ok ? <Check className="h-3 w-3" /> : "!"}</span>
      {text}
    </p>
  );
}

function CheckInModal({ open, onClose, booking, onSubmit, loading }: { open: boolean; onClose: () => void; booking: NonNullable<ReturnType<typeof useBooking>["data"]>; onSubmit: (b: unknown) => void; loading: boolean }) {
  const { branchId } = useBranch();
  const [anyType, setAnyType] = useState(false);
  const free = useFreeRooms(branchId, anyType ? null : booking.category.id, booking.checkIn, booking.checkOut, booking.id);
  const [roomId, setRoomId] = useState(booking.room?.id ?? "");
  const [idType, setIdType] = useState("AADHAAR");
  const [idNumber, setIdNumber] = useState("");
  const list = free.data ?? [];
  return (
    <Modal open={open} onClose={onClose} title="Check in" subtitle={`${booking.guestName} · ${booking.category.name}`} footer={<Btn disabled={!roomId} loading={loading} onClick={() => onSubmit({ roomId, guestIdType: idType, guestIdNumber: idNumber || null })}><KeyRound /> Check in & hand keys</Btn>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">Pick a room</p>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={anyType} onChange={(e) => setAnyType(e.target.checked)} /> Show upgrades
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={r.status !== "AVAILABLE"}
              onClick={() => setRoomId(r.id)}
              className={cn("rounded-xl border p-2.5 text-center transition", roomId === r.id ? "border-brand bg-brand/10 ring-2 ring-brand/30" : "border-border", r.status !== "AVAILABLE" && "opacity-40")}
              title={r.status !== "AVAILABLE" ? `Room is ${r.status.toLowerCase()}` : r.category.name}
            >
              <BedDouble className="mx-auto h-4 w-4 text-brand" />
              <p className="font-display text-lg font-semibold">{r.number}</p>
              <p className="truncate text-[10px] text-muted-foreground">{r.status === "AVAILABLE" ? r.category.name : r.status.toLowerCase()}</p>
            </button>
          ))}
        </div>
        {list.length === 0 && <Empty title="No free room for this stay" body="Clear a dirty room in Housekeeping or allow upgrades." />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID type">
            <Select value={idType} onChange={(e) => setIdType(e.target.value)} options={["AADHAAR", "PASSPORT", "DRIVING_LICENCE", "VOTER_ID", "OTHER"].map((x) => ({ value: x, label: x.replace("_", " ") }))} />
          </Field>
          <Field label="ID number" hint="Stored with the booking; visible to front desk only">
            <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function PaymentModal({ open, onClose, balance, paid, onSubmit, loading }: { open: boolean; onClose: () => void; balance: number; paid: number; onSubmit: (b: unknown) => void; loading: boolean }) {
  const [mode, setMode] = useState<"pay" | "refund">(balance < 0 ? "refund" : "pay");
  const [amount, setAmount] = useState(Math.abs(balance));
  const [method, setMethod] = useState<PayMethod>("UPI");
  const [reference, setReference] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "pay" ? "Record payment" : "Record refund"}
      size="sm"
      footer={<Btn disabled={amount <= 0} loading={loading} onClick={() => onSubmit({ amount, method, reference: reference || null, refund: mode === "refund", idempotencyKey: key })}><Check /> Save {mode}</Btn>}
    >
      <div className="space-y-4">
        <Segmented value={mode} onChange={(m) => { setMode(m); setAmount(m === "pay" ? Math.max(0, balance) : Math.max(0, Math.min(paid, -balance || paid))); }} options={[{ value: "pay", label: "Payment" }, { value: "refund", label: "Refund" }]} />
        <Field label="Amount (₹)" hint={mode === "pay" ? `Outstanding ${inr(Math.max(0, balance))} · partial and split payments allowed` : `Paid so far ${inr(paid)}`}>
          <Input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="h-12 font-display text-xl" />
        </Field>
        <Field label="Method">
          <div className="grid grid-cols-3 gap-2">
            {(["UPI", "CASH", "CARD", "BANK_TRANSFER", "PAYMENT_LINK", "OTA"] as PayMethod[]).map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)} className={cn("rounded-xl border px-2 py-2 text-xs font-semibold", method === m ? "border-brand bg-brand/10 text-brand" : "border-border")}>
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Reference / UTR">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Verify before saving" />
        </Field>
      </div>
    </Modal>
  );
}

function ChargeModal({ open, onClose, onSubmit, loading }: { open: boolean; onClose: () => void; onSubmit: (b: unknown) => void; loading: boolean }) {
  const [type, setType] = useState("EXTRA");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const presets = [
    ["EXTRA", "Extra bed"], ["EXTRA", "Laundry"], ["ROOM_SERVICE", "Minibar"], ["EXTRA", "Late checkout"], ["EXTRA", "Airport transfer"], ["DISCOUNT", "Goodwill discount"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Add to folio" size="sm" footer={<Btn disabled={!description || amount <= 0} loading={loading} onClick={() => onSubmit({ type, description, amount, quantity })}><Plus /> Post to folio</Btn>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([t, d]) => (
            <button key={d} type="button" onClick={() => { setType(t); setDescription(d); }} className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-brand hover:text-brand">
              {d}
            </button>
          ))}
        </div>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)} options={["EXTRA", "ROOM_SERVICE", "RESTAURANT", "POOL", "EVENT", "DISCOUNT"].map((x) => ({ value: x, label: x.replace("_", " ").toLowerCase() }))} />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rate (₹)">
            <Input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Qty">
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function CancelForm({ onSubmit, loading, paid }: { onSubmit: (r: string) => void; loading: boolean; paid: number }) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-4">
      <Field label="Reason">
        <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Guest request, plans changed…" />
      </Field>
      <p className="text-xs text-muted-foreground">Stay charges are reversed on the folio. {paid > 0 ? `${inr(paid)} was paid. Record the refund after cancelling.` : ""} The guest gets a cancellation message.</p>
      <Btn variant="danger" className="w-full" disabled={!reason.trim()} loading={loading} onClick={() => onSubmit(reason)}>
        Cancel booking
      </Btn>
    </div>
  );
}
