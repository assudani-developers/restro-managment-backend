"use client";

import { ArrowRight, BedDouble, CalendarCheck2, DoorOpen, Hammer, LogIn, LogOut, Plus, Search, Sparkles, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookingWizard } from "@/components/hotel/booking-wizard";
import { Btn, Empty, Modal, PageHeader, Panel, ROOM_STATUS, Segmented, StatusPill, fmtDate, inr } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useBoard, useRoomStatus, type BoardRoom, type BoardStatus } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";

const ORDER: BoardStatus[] = ["AVAILABLE", "OCCUPIED", "CHECKOUT_SOON", "DIRTY", "INSPECTION", "BOOKED", "MAINTENANCE"];

export default function FrontDeskPage() {
  const { branchId } = useBranch();
  const { data, isLoading } = useBoard(branchId);
  const [filter, setFilter] = useState<BoardStatus | "ALL">("ALL");
  const [view, setView] = useState<"floor" | "grid">("floor");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BoardRoom | null>(null);
  const [wizard, setWizard] = useState<{ open: boolean; categoryId?: string; roomId?: string }>({ open: false });

  const rooms = useMemo(
    () =>
      (data?.rooms ?? []).filter(
        (r) =>
          (filter === "ALL" || r.display === filter) &&
          (!search || r.number.includes(search) || r.current?.guestName.toLowerCase().includes(search.toLowerCase()) || r.category.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [data, filter, search],
  );
  const floors = useMemo(() => {
    const m = new Map<string, BoardRoom[]>();
    for (const r of rooms) m.set(r.floorLabel || "Rooms", [...(m.get(r.floorLabel || "Rooms") ?? []), r]);
    return [...m.entries()];
  }, [rooms]);

  const total = data?.rooms.length ?? 0;
  const occupied = (data?.counts.OCCUPIED ?? 0) + (data?.counts.CHECKOUT_SOON ?? 0);

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow={data ? fmtDate(data.today, { weekday: "long", day: "numeric", month: "long" }) : undefined}
        title="Rooms"
        actions={
          <>
            <Link href="/housekeeping">
              <Btn variant="outline">
                <Sparkles /> Housekeeping
              </Btn>
            </Link>
            <Btn onClick={() => setWizard({ open: true })}>
              <Plus /> New booking
            </Btn>
          </>
        }
      />

      {/* Legend + counters */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={cn("lux-card flex flex-col items-start px-4 py-3 text-left transition", filter === "ALL" && "ring-2 ring-brand")}
        >
          <span className="text-[13px] font-medium text-muted-foreground">Occupancy</span>
          <span className="mt-1 font-display text-2xl font-semibold tabular-nums">{total ? Math.round((occupied / total) * 100) : 0}%</span>
          <span className="text-[11px] text-muted-foreground">
            {occupied}/{total} rooms
          </span>
        </button>
        {ORDER.map((s) => {
          const st = ROOM_STATUS[s];
          const count = data?.counts[s] ?? 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? "ALL" : s)}
              className={cn("lux-card relative flex flex-col items-start overflow-hidden px-4 py-3 text-left transition hover:-translate-y-0.5", filter === s && "ring-2")}
              style={filter === s ? { ["--tw-ring-color" as string]: st.color } : undefined}
            >
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: st.color }} />
              <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: st.text }}>
                {st.label}
              </span>
              <span className="mt-1 font-display text-2xl font-semibold tabular-nums">{count}</span>
              <span className="truncate text-[11px] text-muted-foreground">{st.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Panel
          title="Rooms"
          subtitle={filter === "ALL" ? `${rooms.length} rooms` : `${rooms.length} ${ROOM_STATUS[filter].label.toLowerCase()}`}
          actions={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Room, guest, type" className="h-8 w-44 rounded-lg border border-input bg-card pr-2 pl-8 text-xs outline-none focus:border-brand" />
              </div>
              <Segmented value={view} onChange={setView} options={[{ value: "floor", label: "By floor" }, { value: "grid", label: "Grid" }]} />
            </div>
          }
        >
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : total === 0 ? (
            <Empty icon={BedDouble} title="No rooms yet" body="Add room types and room numbers in Hotel Setup to light up the board." action={<Link href="/hotel-setup"><Btn>Open Hotel Setup</Btn></Link>} />
          ) : rooms.length === 0 ? (
            <Empty icon={Search} title="Nothing matches" body="Clear the filter or search to see every room." />
          ) : view === "grid" ? (
            <RoomGrid rooms={rooms} onSelect={setSelected} />
          ) : (
            <div className="space-y-6">
              {floors.map(([floor, list]) => (
                <div key={floor}>
                  <p className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                    <span className="h-px w-6 bg-border" /> {floor} floor · {list.length}
                  </p>
                  <RoomGrid rooms={list} onSelect={setSelected} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Arrivals today" subtitle={`${data?.arrivals.length ?? 0} expected`} bodyClassName="p-0">
            <ul className="divide-y divide-border/70">
              {(data?.arrivals ?? []).length === 0 && <li className="px-5 py-6 text-center text-sm text-muted-foreground">No pending arrivals</li>}
              {data?.arrivals.map((a) => (
                <li key={a.id}>
                  <Link href={`/bookings/${a.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                      <LogIn className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.guestName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {a.code} · {a.category} · {a.room ? `Room ${a.room}` : "Room not assigned"}
                        {a.checkIn < (data?.today ?? "") ? " · overdue" : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Departures today" subtitle={`Checkout by ${data?.checkOutTime ?? ""}`} bodyClassName="p-0">
            <ul className="divide-y divide-border/70">
              {(data?.departures ?? []).length === 0 && <li className="px-5 py-6 text-center text-sm text-muted-foreground">No departures due</li>}
              {data?.departures.map((d) => (
                <li key={d.id}>
                  <Link href={`/bookings/${d.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.guestName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {d.code} · Room {d.room}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <RoomDrawer
        room={selected}
        onClose={() => setSelected(null)}
        onBook={(r) => {
          setSelected(null);
          setWizard({ open: true, categoryId: r.category.id, roomId: r.id });
        }}
      />
      <BookingWizard open={wizard.open} onClose={() => setWizard({ open: false })} presetCategoryId={wizard.categoryId} presetRoomId={wizard.roomId} />
    </div>
  );
}

function RoomGrid({ rooms, onSelect }: { rooms: BoardRoom[]; onSelect: (r: BoardRoom) => void }) {
  return (
    <motion.div layout className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
      <AnimatePresence initial={false}>
        {rooms.map((r, i) => {
          const s = ROOM_STATUS[r.display];
          return (
            <motion.button
              layout
              key={r.id}
              type="button"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(i * 0.015, 0.25), type: "spring", stiffness: 420, damping: 32 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(r)}
              className="group relative flex h-[132px] flex-col overflow-hidden rounded-2xl border p-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
              style={{ background: `linear-gradient(160deg, ${s.soft}, #FFFDF9 85%)`, borderColor: `${s.color}55` }}
              aria-label={`Room ${r.number}, ${s.label}`}
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: s.color }} />
              <div className="flex items-start justify-between">
                <span className="font-display text-[26px] leading-none font-semibold tracking-tight" style={{ color: s.text }}>
                  {r.number}
                </span>
                <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", (r.display === "CHECKOUT_SOON" || r.display === "BOOKED") && "pulse-ring")} style={{ background: s.color, color: `${s.color}88` }} />
              </div>
              <span className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{r.category.name}</span>
              <div className="mt-auto">
                {r.current ? (
                  <>
                    <p className="truncate text-xs font-semibold text-foreground">{r.current.guestName}</p>
                    <p className="truncate text-[10.5px] text-muted-foreground">
                      till {fmtDate(r.current.checkOut, { day: "2-digit", month: "short" })}
                      {r.current.balance > 0 ? ` · due ${inr(r.current.balance)}` : ""}
                    </p>
                  </>
                ) : r.next && r.display === "BOOKED" ? (
                  <p className="truncate text-xs font-semibold" style={{ color: s.text }}>
                    Arriving · {r.next.guestName}
                  </p>
                ) : null}
                <span className="mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase" style={{ background: `${s.color}22`, color: s.text }}>
                  {s.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

function RoomDrawer({ room, onClose, onBook }: { room: BoardRoom | null; onClose: () => void; onBook: (r: BoardRoom) => void }) {
  const { branchId } = useBranch();
  const setStatus = useRoomStatus(branchId);
  if (!room) return <Modal open={false} onClose={onClose} title="" side>{null}</Modal>;
  const s = ROOM_STATUS[room.display];
  const act = (status: "AVAILABLE" | "OCCUPIED" | "DIRTY" | "INSPECTION" | "MAINTENANCE", note?: string) =>
    setStatus.mutate({ id: room.id, status, note }, { onSuccess: onClose });

  return (
    <Modal open={!!room} onClose={onClose} side title={`Room ${room.number}`} subtitle={`${room.category.name} · ${room.floorLabel ?? ""} · ${inr(room.category.baseRate)}/night`}>
      <div className="space-y-5">
        <div className="rounded-2xl p-4" style={{ background: s.soft }}>
          <StatusPill status={room.display} />
          <p className="mt-2 text-sm" style={{ color: s.text }}>
            {s.hint} · since {new Date(room.statusSince).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {room.current && (
          <div className="lux-card p-4">
            <p className="text-[13px] font-medium text-muted-foreground">In house</p>
            <p className="mt-1 font-display text-lg font-semibold">{room.current.guestName}</p>
            <p className="text-xs text-muted-foreground">
              {room.current.code} · {fmtDate(room.current.checkIn)} → {fmtDate(room.current.checkOut)} · {room.current.adults}A {room.current.children}C · {room.current.mealPlan?.code ?? "EP"}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Balance
              </span>
              <span className={cn("font-display text-lg font-semibold", room.current.balance > 0 ? "text-rose-700" : "text-emerald-700")}>{inr(room.current.balance)}</span>
            </div>
            <Link href={`/bookings/${room.current.id}`} className="mt-3 block">
              <Btn className="w-full">
                <DoorOpen /> Open folio
              </Btn>
            </Link>
          </div>
        )}

        {room.next && !room.current && (
          <div className="lux-card p-4">
            <p className="text-[13px] font-medium text-muted-foreground">Next arrival</p>
            <p className="mt-1 font-display text-lg font-semibold">{room.next.guestName}</p>
            <p className="text-xs text-muted-foreground">
              {room.next.code} · {fmtDate(room.next.checkIn)} → {fmtDate(room.next.checkOut)}
            </p>
            <Link href={`/bookings/${room.next.id}`} className="mt-3 block">
              <Btn className="w-full" variant={room.status === "AVAILABLE" ? "primary" : "outline"}>
                <LogIn /> {room.status === "AVAILABLE" ? "Check in guest" : "Open booking"}
              </Btn>
            </Link>
          </div>
        )}

        <div>
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Room actions</p>
          <div className="grid grid-cols-2 gap-2">
            {!room.current && room.status === "AVAILABLE" && (
              <Btn variant="soft" onClick={() => onBook(room)}>
                <CalendarCheck2 /> Book this room
              </Btn>
            )}
            {!room.current && room.status === "DIRTY" && (
              <Btn variant="soft" loading={setStatus.isPending} onClick={() => act("INSPECTION", "Cleaned")}>
                <Sparkles /> Mark cleaned
              </Btn>
            )}
            {!room.current && (room.status === "INSPECTION" || room.status === "DIRTY") && (
              <Btn variant="soft" loading={setStatus.isPending} onClick={() => act("AVAILABLE", "Inspected & released")}>
                <Sparkles /> Inspect & release
              </Btn>
            )}
            {!room.current && room.status === "AVAILABLE" && (
              <Btn variant="outline" loading={setStatus.isPending} onClick={() => act("DIRTY")}>
                Mark dirty
              </Btn>
            )}
            {room.status !== "MAINTENANCE" ? (
              <Btn variant="outline" loading={setStatus.isPending} onClick={() => act("MAINTENANCE", "Out of service")}>
                <Hammer /> Out of service
              </Btn>
            ) : (
              <Btn variant="outline" loading={setStatus.isPending} onClick={() => act(room.current ? "OCCUPIED" : "DIRTY", "Back in service")}>
                <Hammer /> Back in service
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
