"use client";

import { Info, MessageCircle, Save, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Btn, Empty, PageHeader, Panel, Segmented, Tag, Textarea, Toggle, waLink } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useMarkLog, useNotificationLogs, useSaveTemplate, useTemplates, type NotificationTemplate } from "@/hooks/use-hotel";

const VARS = ["guestName", "hotelName", "bookingCode", "roomType", "room", "checkIn", "checkOut", "checkInTime", "checkOutTime", "mealPlan", "total", "paid", "balance", "amount", "link", "pin", "wifiName", "wifiPassword", "orderNumber"];
const LABEL: Record<string, string> = {
  BOOKING_CONFIRMED: "Booking confirmed", PAYMENT_RECEIVED: "Payment received", PRE_ARRIVAL: "Before check-in", CHECKED_IN: "Guest check-in",
  FOOD_ORDERED: "Food ordered", FOLIO_UPDATED: "Extra bill generated", CHECKOUT_REMINDER: "Checkout reminder", PAYMENT_COMPLETED: "Payment completed",
  CHECKED_OUT: "Checkout completed", BOOKING_CANCELLED: "Booking cancelled",
};

export default function GuestMessagesPage() {
  const [tab, setTab] = useState<"outbox" | "templates">("outbox");
  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Guest messages"
        actions={<Segmented value={tab} onChange={setTab} options={[{ value: "outbox", label: "Outbox" }, { value: "templates", label: "Templates" }]} />}
      />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          No WhatsApp Business / SMS provider is connected yet, so messages wait in the outbox and staff send them in one tap (opens WhatsApp with the text filled in). Automatic delivery needs an approved WhatsApp template account and an SMS gateway.
        </p>
      </div>
      {tab === "outbox" ? <Outbox /> : <Templates />}
    </div>
  );
}

function Outbox() {
  const { branchId } = useBranch();
  const { data } = useNotificationLogs(branchId);
  const mark = useMarkLog(branchId);
  const [filter, setFilter] = useState<"QUEUED" | "ALL">("QUEUED");
  const rows = (data ?? []).filter((l) => filter === "ALL" || l.status === filter);
  return (
    <Panel title={`${rows.length} messages`} actions={<Segmented value={filter} onChange={setFilter} options={[{ value: "QUEUED", label: "To send" }, { value: "ALL", label: "All" }]} />} bodyClassName="p-0">
      {rows.length === 0 ? (
        <div className="p-6"><Empty icon={MessageCircle} title="Outbox is clear" body="New bookings, payments and check-ins will appear here." /></div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{LABEL[l.trigger] ?? l.trigger}</span>
                  <Tag value={l.status} />
                  <span className="text-[11px] text-muted-foreground">
                    {l.channel} · {l.recipient} · {new Date(l.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {l.bookingId && (
                    <Link href={`/bookings/${l.bookingId}`} className="text-[11px] font-semibold text-brand hover:underline">
                      Booking
                    </Link>
                  )}
                </div>
                <p className="mt-1.5 text-[12.5px] whitespace-pre-line text-muted-foreground">{l.body}</p>
              </div>
              {l.status === "QUEUED" && (
                <div className="flex shrink-0 gap-2">
                  {/\d{6,}/.test(l.recipient) && (
                    <a href={waLink(l.recipient, l.body)} target="_blank" rel="noreferrer" onClick={() => mark.mutate({ id: l.id, status: "SENT" })}>
                      <Btn size="sm"><Send /> WhatsApp</Btn>
                    </a>
                  )}
                  <Btn size="sm" variant="ghost" onClick={() => mark.mutate({ id: l.id, status: "SENT" })}>Mark sent</Btn>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Templates() {
  const { branchId } = useBranch();
  const { data } = useTemplates(branchId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(data ?? []).map((t) => <TemplateCard key={t.id} t={t} />)}
      <div className="lux-card p-5 lg:col-span-2">
        <p className="text-[13px] font-medium text-muted-foreground">Placeholders</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VARS.map((v) => <code key={v} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{`{{${v}}}`}</code>)}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Links are secure per-guest tokens; private guest data is never encoded into QR codes or URLs.</p>
      </div>
    </div>
  );
}

function TemplateCard({ t }: { t: NotificationTemplate }) {
  const { branchId } = useBranch();
  const save = useSaveTemplate(branchId);
  const [body, setBody] = useState(t.body);
  const [active, setActive] = useState(t.isActive);
  const dirty = body !== t.body || active !== t.isActive;
  return (
    <Panel title={LABEL[t.trigger] ?? t.trigger} subtitle={t.channel} actions={<Toggle checked={active} onChange={setActive} label="Active" />}>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-36 font-mono text-[12px]" />
      <div className="mt-3 flex justify-end">
        <Btn size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate({ trigger: t.trigger, channel: t.channel, body, isActive: active })}>
          <Save /> Save
        </Btn>
      </div>
    </Panel>
  );
}
