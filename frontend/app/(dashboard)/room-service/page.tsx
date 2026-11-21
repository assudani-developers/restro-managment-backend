"use client";

import { ChefHat, ConciergeBell, Link2, Search, Utensils } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Btn, Empty, Input, PageHeader, Panel, Segmented, Stat, Tag, Toggle, inr } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useHotelSettings, usePostOrderToFolio, useRoomMenu, useRoomService, useUpdateHotelSettings, useUpdateRoomMenuItem } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";

const KITCHEN_TONE: Record<string, string> = {
  NEW: "bg-sky-50 text-sky-800",
  PREPARING: "bg-amber-50 text-amber-800",
  READY: "bg-violet-50 text-violet-800",
  SERVED: "bg-emerald-50 text-emerald-800",
};

export default function RoomServicePage() {
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Room service"
        actions={<Segmented value={tab} onChange={setTab} options={[{ value: "orders", label: "Live orders" }, { value: "menu", label: "Room menu" }]} />}
      />
      {tab === "orders" ? <Orders /> : <RoomMenu />}
    </div>
  );
}

function Orders() {
  const { branchId } = useBranch();
  const { data } = useRoomService(branchId);
  const post = usePostOrderToFolio(branchId);
  const rooms = data?.rooms ?? [];
  const orders = data?.orders ?? [];
  const totals = rooms.reduce((a, r) => ({ orders: a.orders + r.orders, delivered: a.delivered + r.delivered, pending: a.pending + r.pending, unbilled: a.unbilled + r.unbilled }), { orders: 0, delivered: 0, pending: 0, unbilled: 0 });

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Orders (24h)" value={totals.orders} icon={ConciergeBell} />
        <Stat label="Delivered" value={totals.delivered} icon={Utensils} tone="green" />
        <Stat label="Pending" value={totals.pending} icon={ChefHat} tone="accent" />
        <Stat label="Unbilled food" value={inr(totals.unbilled)} icon={Link2} tone="red" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Panel title="By room" bodyClassName="p-0">
          {rooms.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No room-service orders in the last 24 hours.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10.5px] text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left">Room</th>
                  <th className="px-2 py-2">Orders</th>
                  <th className="px-2 py-2">Done</th>
                  <th className="px-2 py-2">Pending</th>
                  <th className="px-5 py-2 text-right">Unbilled</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.room} className="border-t border-border/60 text-center">
                    <td className="px-5 py-2.5 text-left font-display text-base font-semibold">{r.room}</td>
                    <td>{r.orders}</td>
                    <td className="text-emerald-700">{r.delivered}</td>
                    <td className="text-amber-700">{r.pending}</td>
                    <td className="px-5 text-right font-semibold">{inr(r.unbilled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Orders">
          {orders.length === 0 ? (
            <Empty icon={ConciergeBell} title="No orders yet" body="Print room QR cards so guests can order from their room." action={<Link href="/qr-studio"><Btn variant="soft">Print QR cards</Btn></Link>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {orders.map((o, i) => (
                <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-xl font-semibold">Room {o.room}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {o.orderNumber} · {new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {o.guestName}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", KITCHEN_TONE[o.kitchen])}>{o.kitchen.toLowerCase()}</span>
                  </div>
                  <ul className="mt-3 space-y-0.5 text-sm">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between">
                        <span>
                          {it.quantity}× {it.nameSnapshot}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="font-display text-lg font-semibold">{inr(o.totalAmount)}</span>
                    {o.folioPostedAt ? (
                      <Tag value="SENT" label="On room folio" />
                    ) : o.status === "PAID" ? (
                      <Tag value="COMPLETED" label="Paid" />
                    ) : o.status === "CANCELLED" ? (
                      <Tag value="CANCELLED" />
                    ) : (
                      <Btn size="sm" variant="soft" loading={post.isPending} onClick={() => post.mutate({ orderId: o.id, bookingId: o.bookingId ?? undefined })}>
                        Charge to room
                      </Btn>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function RoomMenu() {
  const { branchId } = useBranch();
  const { data: settings } = useHotelSettings(branchId);
  const saveSettings = useUpdateHotelSettings(branchId);
  const { data: items } = useRoomMenu(branchId);
  const update = useUpdateRoomMenuItem(branchId);
  const [search, setSearch] = useState("");
  const separate = settings?.roomMenuMode === "SEPARATE";
  const grouped = useMemo(() => {
    const m = new Map<string, NonNullable<typeof items>>();
    for (const it of items ?? []) if (!search || it.name.toLowerCase().includes(search.toLowerCase())) m.set(it.category.name, [...(m.get(it.category.name) ?? []), it]);
    return [...m.entries()];
  }, [items, search]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {(["SYNCED", "SEPARATE"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => saveSettings.mutate({ roomMenuMode: mode })}
            className={cn("lux-card p-5 text-left transition", settings?.roomMenuMode === mode ? "ring-2 ring-brand" : "opacity-80 hover:opacity-100")}
          >
            <p className="flex items-center gap-2 font-display text-lg font-semibold">
              <span className={cn("h-4 w-4 rounded-full border-2", settings?.roomMenuMode === mode ? "border-brand bg-brand shadow-[inset_0_0_0_3px_white]" : "border-stone-300")} />
              {mode === "SYNCED" ? "Synced with restaurant" : "Separate room menu"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "SYNCED"
                ? "Rooms see exactly what the restaurant QR shows, same prices. One menu to maintain."
                : "Pick which dishes rooms can order and set a room-service price for each (e.g. +₹30 delivery)."}
            </p>
          </button>
        ))}
      </div>
      <Panel
        title="Dishes"
        subtitle={separate ? "Toggle availability in rooms and set room prices. Sold out applies everywhere." : "Sold out applies to restaurant and room QR menus. Switch to Separate to customise rooms."}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find dish" className="h-8 w-44 rounded-lg border border-input bg-card pr-2 pl-8 text-xs outline-none focus:border-brand" />
          </div>
        }
      >
        {grouped.length === 0 ? (
          <Empty icon={Utensils} title="No dishes" body="Add items in Menu first." action={<Link href="/menu"><Btn variant="soft">Open Menu</Btn></Link>} />
        ) : (
          <div className="space-y-6">
            {grouped.map(([cat, list]) => (
              <div key={cat}>
                <p className="mb-2 text-[13px] font-medium text-muted-foreground">{cat}</p>
                <div className="divide-y divide-border/60 rounded-2xl border border-border">
                  {list.map((it) => (
                    <div key={it.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded-sm border-2", it.isVeg ? "border-emerald-600" : "border-rose-700")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", it.isVeg ? "bg-emerald-600" : "bg-rose-700")} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold", it.isSoldOut && "text-muted-foreground line-through")}>{it.name}</p>
                        <p className="text-[11px] text-muted-foreground">Restaurant {inr(it.price)}</p>
                      </div>
                      {separate && (
                        <>
                          <label className="flex items-center gap-2 text-xs">
                            In rooms <Toggle checked={it.roomServiceEnabled} onChange={(v) => update.mutate({ id: it.id, roomServiceEnabled: v })} label="Available in rooms" />
                          </label>
                          <Input
                            key={`${it.id}-${it.roomServicePrice}`}
                            type="number"
                            min={0}
                            defaultValue={it.roomServicePrice ?? ""}
                            placeholder={`Room ₹ (${Number(it.price)})`}
                            className="h-8 w-32 text-xs"
                            onBlur={(e) => {
                              const v = e.target.value === "" ? null : Number(e.target.value);
                              if (v !== (it.roomServicePrice == null ? null : Number(it.roomServicePrice))) update.mutate({ id: it.id, roomServicePrice: v });
                            }}
                          />
                        </>
                      )}
                      <label className="flex items-center gap-2 text-xs">
                        Sold out <Toggle checked={it.isSoldOut} onChange={(v) => update.mutate({ id: it.id, isSoldOut: v })} label="Sold out" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
