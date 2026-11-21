"use client";

import { BedDouble, Check, Coffee, Minus, Plus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useBranch } from "@/hooks/use-branch";
import { useAvailability, useCreateBooking, useFreeRooms, useMealPlans, useQuote, type BookingSource, type PayMethod } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";
import { Btn, Field, Input, Modal, Segmented, Select, Textarea, addDays, inr, todayIso } from "./ui";

const STEPS = ["Stay", "Room & meals", "Guest", "Confirm"] as const;
const BED_LABEL: Record<string, string> = { SINGLE: "Single bed", DOUBLE: "Double bed", TWIN: "Twin beds", KING: "King bed", SUITE: "Suite" };

function Counter({ value, onChange, min = 0, max = 12, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-input bg-card px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted hover:bg-muted/70">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-6 text-center font-display text-lg font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted hover:bg-muted/70">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function BookingWizard({
  open,
  onClose,
  presetCategoryId,
  presetRoomId,
}: {
  open: boolean;
  onClose: () => void;
  presetCategoryId?: string;
  presetRoomId?: string;
}) {
  const router = useRouter();
  const { branchId } = useBranch();
  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(todayIso());
  const [checkOut, setCheckOut] = useState(addDays(todayIso(), 1));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(presetCategoryId ?? null);
  const [roomId, setRoomId] = useState<string>(presetRoomId ?? "");
  const [mealPlanId, setMealPlanId] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [source, setSource] = useState<BookingSource>("RECEPTION");
  const [ota, setOta] = useState({ otaName: "", otaReference: "", otaCommissionPercent: 15 });
  const [guest, setGuest] = useState({ guestName: "", guestPhone: "", guestEmail: "", guestAddress: "", arrivalTime: "", specialRequests: "", consentMessages: true });
  const [advance, setAdvance] = useState<{ amount: number; method: PayMethod; reference: string }>({ amount: 0, method: "UPI", reference: "" });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(0);
    setCategoryId(presetCategoryId ?? null);
    setRoomId(presetRoomId ?? "");
  }, [open, presetCategoryId, presetRoomId]);

  const avail = useAvailability(branchId, checkIn, checkOut);
  const plans = useMealPlans(branchId);
  const free = useFreeRooms(branchId, categoryId, checkIn, checkOut);
  const quoteDto = useMemo(
    () => (categoryId && checkOut > checkIn ? { categoryId, mealPlanId: mealPlanId || null, checkIn, checkOut, adults, children, discountAmount: discount } : null),
    [categoryId, mealPlanId, checkIn, checkOut, adults, children, discount],
  );
  const quote = useQuote(branchId, quoteDto);
  const create = useCreateBooking(branchId);
  const nights = Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));

  const canNext = [checkOut > checkIn && adults > 0, !!categoryId && !!quote.data, guest.guestName.trim().length > 1, true][step];

  const submit = () =>
    create.mutate(
      {
        ...quoteDto,
        roomId: roomId || null,
        source,
        ...(source === "OTA" ? ota : {}),
        ...guest,
        guestEmail: guest.guestEmail || null,
        advance: advance.amount > 0 ? advance : null,
      },
      {
        onSuccess: (b) => {
          onClose();
          router.push(`/bookings/${b.id}`);
        },
      },
    );

  const q = quote.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="New booking"
      footer={
        <>
          <div className="mr-auto hidden items-center gap-3 sm:flex">
            {q && (
              <span className="text-sm">
                <span className="text-muted-foreground">Estimated total </span>
                <span className="font-display text-xl font-semibold">{inr(q.grandTotal)}</span>
              </span>
            )}
          </div>
          {step > 0 && (
            <Btn variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Btn>
          )}
          {step < 3 ? (
            <Btn disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continue
            </Btn>
          ) : (
            <Btn loading={create.isPending} onClick={submit}>
              <Check /> Confirm booking
            </Btn>
          )}
        </>
      }
    >
      {/* stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                i < step ? "bg-brand text-primary-foreground" : i === step ? "bg-ink text-[#FFF8F0]" : "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span className={cn("hidden text-xs font-semibold sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-brand" : "bg-border")} />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Check-in">
                    <Input type="date" value={checkIn} min={todayIso()} onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1));
                    }} />
                  </Field>
                  <Field label="Check-out">
                    <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} />
                  </Field>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-display text-2xl font-semibold text-foreground">{nights}</span> night{nights === 1 ? "" : "s"}
                </p>
                <Counter label="Adults" value={adults} min={1} onChange={setAdults} />
                <Counter label="Children" value={children} onChange={setChildren} />
              </div>
              <div className="space-y-4">
                <Field label="Booking source">
                  <Segmented
                    value={source}
                    onChange={setSource}
                    options={[
                      { value: "RECEPTION", label: "Reception" },
                      { value: "PHONE", label: "Phone" },
                      { value: "WALK_IN", label: "Walk-in" },
                      { value: "WEBSITE", label: "Website" },
                      { value: "OTA", label: "OTA" },
                    ]}
                    className="flex-wrap"
                  />
                </Field>
                {source === "OTA" && (
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                    <Field label="OTA">
                      <Select value={ota.otaName} onChange={(e) => setOta({ ...ota, otaName: e.target.value })} options={[{ value: "", label: "Select" }, ...["Booking.com", "Agoda", "MakeMyTrip", "Goibibo", "Expedia", "Airbnb", "Other"].map((x) => ({ value: x, label: x }))]} />
                    </Field>
                    <Field label="Commission %">
                      <Input type="number" value={ota.otaCommissionPercent} onChange={(e) => setOta({ ...ota, otaCommissionPercent: Number(e.target.value) })} />
                    </Field>
                    <Field label="OTA reference" className="col-span-2">
                      <Input value={ota.otaReference} onChange={(e) => setOta({ ...ota, otaReference: e.target.value })} placeholder="Channel confirmation no." />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-muted-foreground">Room type · live availability</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {avail.data?.map((c) => {
                      const active = categoryId === c.categoryId;
                      const soldOut = c.available === 0;
                      return (
                        <button
                          key={c.categoryId}
                          type="button"
                          disabled={soldOut}
                          onClick={() => {
                            setCategoryId(c.categoryId);
                            setRoomId("");
                          }}
                          className={cn(
                            "relative rounded-2xl border p-4 text-left transition",
                            active ? "border-brand bg-brand/5 ring-2 ring-brand/30" : "border-border bg-card hover:border-brand/40",
                            soldOut && "opacity-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display text-base font-semibold">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                <BedDouble className="mr-1 inline h-3 w-3" />
                                {BED_LABEL[c.bedType] ?? c.bedType} · <Users className="mx-0.5 inline h-3 w-3" /> {c.maxAdults}
                              </p>
                            </div>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", soldOut ? "bg-rose-50 text-rose-700" : c.available <= 2 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>
                              {soldOut ? "Sold out" : `${c.available} left`}
                            </span>
                          </div>
                          <p className="mt-3 font-display text-xl font-semibold">
                            {inr(c.baseRate)}
                            <span className="text-xs font-normal text-muted-foreground"> /night</span>
                          </p>
                          {active && <motion.span layoutId="cat-check" className="absolute right-3 bottom-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-primary-foreground"><Check className="h-3.5 w-3.5" /></motion.span>}
                        </button>
                      );
                    })}
                    {avail.data?.length === 0 && <p className="text-sm text-muted-foreground">No room types yet. Add them in Hotel setup.</p>}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium text-muted-foreground">Meal plan</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[{ id: "", code: "EP", name: "Room only", pricePerNight: "0" }, ...(plans.data ?? []).filter((p) => p.isActive && Number(p.pricePerNight) > 0)].map((p) => (
                      <button
                        key={p.id || "none"}
                        type="button"
                        onClick={() => setMealPlanId(p.id)}
                        className={cn("rounded-xl border px-3 py-2.5 text-left transition", mealPlanId === p.id ? "border-brand bg-brand/5 ring-2 ring-brand/25" : "border-border hover:border-brand/40")}
                      >
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          <Coffee className="h-3.5 w-3.5 text-brand" />
                          {p.code}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{p.name}</p>
                        <p className="mt-1 text-xs font-semibold">{Number(p.pricePerNight) ? `+${inr(p.pricePerNight)}/guest/night` : "Included"}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {categoryId && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Assign room (optional)" hint="Leave blank to assign at check-in">
                      <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} options={[{ value: "", label: "Assign later" }, ...(free.data ?? []).map((r) => ({ value: r.id, label: `Room ${r.number}${r.status !== "AVAILABLE" ? ` (${r.status.toLowerCase()})` : ""}` }))]} />
                    </Field>
                    <Field label="Discount (₹)">
                      <Input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} placeholder="0" />
                    </Field>
                  </div>
                )}
              </div>
              <PriceCard q={q} loading={quote.isFetching} error={quote.error?.message} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Guest name">
                <Input autoFocus value={guest.guestName} onChange={(e) => setGuest({ ...guest, guestName: e.target.value })} placeholder="Full name as on ID" />
              </Field>
              <Field label="Mobile (WhatsApp)">
                <Input value={guest.guestPhone} inputMode="tel" onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })} placeholder="10-digit mobile" />
              </Field>
              <Field label="Email">
                <Input type="email" value={guest.guestEmail} onChange={(e) => setGuest({ ...guest, guestEmail: e.target.value })} />
              </Field>
              <Field label="Expected arrival">
                <Input type="time" value={guest.arrivalTime} onChange={(e) => setGuest({ ...guest, arrivalTime: e.target.value })} />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <Input value={guest.guestAddress} onChange={(e) => setGuest({ ...guest, guestAddress: e.target.value })} />
              </Field>
              <Field label="Special requests" className="md:col-span-2">
                <Textarea value={guest.specialRequests} onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })} placeholder="Early check-in, extra bed, anniversary decoration…" />
              </Field>
              <label className="flex items-center gap-2.5 text-sm md:col-span-2">
                <input type="checkbox" checked={guest.consentMessages} onChange={(e) => setGuest({ ...guest, consentMessages: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                Guest agrees to receive booking messages on WhatsApp / SMS / email
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4">
                <div className="lux-card p-4">
                  <p className="font-display text-xl font-semibold">{guest.guestName}</p>
                  <p className="text-sm text-muted-foreground">
                    {q?.category.name} · {checkIn} → {checkOut} · {adults} adult{adults > 1 ? "s" : ""}
                    {children ? `, ${children} child` : ""} · {q?.mealPlan?.code ?? "EP"} · {source.replace("_", " ").toLowerCase()}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="mb-3 text-[13px] font-medium text-muted-foreground">Advance / guarantee</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Amount (₹)">
                      <Input type="number" min={0} value={advance.amount || ""} onChange={(e) => setAdvance({ ...advance, amount: Number(e.target.value) || 0 })} placeholder="0" />
                    </Field>
                    <Field label="Method">
                      <Select value={advance.method} onChange={(e) => setAdvance({ ...advance, method: e.target.value as PayMethod })} options={["UPI", "CASH", "CARD", "BANK_TRANSFER", "PAYMENT_LINK", "OTA"].map((m) => ({ value: m, label: m.replace("_", " ") }))} />
                    </Field>
                    <Field label="Reference">
                      <Input value={advance.reference} onChange={(e) => setAdvance({ ...advance, reference: e.target.value })} placeholder="UTR / txn id" />
                    </Field>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Record only payments you have verified. A confirmation message is queued for the guest automatically.</p>
                </div>
              </div>
              <PriceCard q={q} advance={advance.amount} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}

function PriceCard({ q, loading, error, advance = 0 }: { q?: ReturnType<typeof useQuote>["data"]; loading?: boolean; error?: string; advance?: number }) {
  return (
    <div className="relative h-fit overflow-hidden rounded-2xl bg-ink p-5 text-[#F3E9DA]">
      <p className="relative text-[13px] font-medium text-brand-accent">Price calculator</p>
      {error ? (
        <p className="relative mt-3 text-sm text-rose-300">{error}</p>
      ) : !q ? (
        <p className="relative mt-3 text-sm text-[#F3E9DA]/60">{loading ? "Calculating…" : "Pick a room type to see the price."}</p>
      ) : (
        <div className={cn("relative mt-3 space-y-2 text-sm transition-opacity", loading && "opacity-60")}>
          <Row k={`Room ${q.nights}N × ${inr(q.roomRate)}`} v={inr(q.roomTotal)} />
          {q.mealTotal > 0 && <Row k={`${q.mealPlan?.code} meals ${q.nights}N × ${inr(q.mealRate)}`} v={inr(q.mealTotal)} />}
          {q.discount > 0 && <Row k="Discount" v={`−${inr(q.discount)}`} />}
          <Row k={`GST on room @ ${q.taxRatePercent}%`} v={inr(q.tax)} />
          <div className="my-2 h-px bg-white/10" />
          <div className="flex items-end justify-between">
            <span className="text-xs text-[#F3E9DA]/70">Total</span>
            <motion.span key={q.grandTotal} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl font-semibold">
              {inr(q.grandTotal)}
            </motion.span>
          </div>
          {advance > 0 && (
            <>
              <Row k="Advance" v={`−${inr(advance)}`} />
              <Row k="Balance at hotel" v={inr(Math.max(0, q.grandTotal - advance))} strong />
            </>
          )}
          <p className="pt-2 text-[10.5px] leading-snug text-[#F3E9DA]/50">Free cancellation is at the hotel&apos;s discretion; cancelled bookings reverse all stay charges on the folio.</p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#F3E9DA]/70">{k}</span>
      <span className={cn("tabular-nums", strong && "font-semibold text-brand-accent")}>{v}</span>
    </div>
  );
}
