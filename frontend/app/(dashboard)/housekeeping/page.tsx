"use client";

import { CheckCheck, Hammer, Sparkles, Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Btn, Empty, PageHeader, ROOM_STATUS, Stat } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useBoard, useRoomStatus, type BoardRoom, type RoomStatus } from "@/hooks/use-hotel";

const COLUMNS: { key: RoomStatus; title: string; next?: { to: RoomStatus; label: string; note: string } }[] = [
  { key: "DIRTY", title: "To clean", next: { to: "INSPECTION", label: "Cleaned", note: "Cleaning done" } },
  { key: "INSPECTION", title: "Supervisor inspection", next: { to: "AVAILABLE", label: "Approve", note: "Inspected & released" } },
  { key: "MAINTENANCE", title: "Out of service", next: { to: "DIRTY", label: "Fixed", note: "Maintenance complete" } },
];

function since(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`;
}

export default function HousekeepingPage() {
  const { branchId } = useBranch();
  const { data } = useBoard(branchId);
  const setStatus = useRoomStatus(branchId);
  const rooms = data?.rooms ?? [];
  const by = (s: RoomStatus) => rooms.filter((r) => r.status === s && !(s === "MAINTENANCE" && r.current));
  const dirty = by("DIRTY");
  const oldest = dirty.sort((a, b) => a.statusSince.localeCompare(b.statusSince))[0];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Housekeeping" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="To clean" value={dirty.length} icon={Sparkles} tone="red" />
        <Stat label="Awaiting inspection" value={by("INSPECTION").length} icon={CheckCheck} tone="accent" />
        <Stat label="Out of service" value={by("MAINTENANCE").length} icon={Hammer} tone="ink" />
        <Stat label="Longest waiting" value={oldest ? since(oldest.statusSince) : "—"} hint={oldest ? `Room ${oldest.number}` : "All clean"} icon={Timer} tone="blue" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = by(col.key);
          const s = ROOM_STATUS[col.key];
          return (
            <section key={col.key} className="rounded-3xl border border-border bg-muted/30 p-3">
              <header className="mb-3 flex items-center justify-between px-2 pt-1">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {col.title}
                </h2>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold">{list.length}</span>
              </header>
              <div className="space-y-2.5">
                <AnimatePresence>
                  {list.map((r) => (
                    <Card key={r.id} room={r} col={col} busy={setStatus.isPending} onMove={(to, note) => setStatus.mutate({ id: r.id, status: to, note })} />
                  ))}
                </AnimatePresence>
                {list.length === 0 && <Empty title="All clear" />}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Card({ room, col, onMove, busy }: { room: BoardRoom; col: (typeof COLUMNS)[number]; onMove: (to: RoomStatus, note: string) => void; busy: boolean }) {
  const s = ROOM_STATUS[col.key];
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, scale: 0.95 }} className="lux-card flex items-center gap-3 p-3.5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-semibold" style={{ background: s.soft, color: s.text }}>
        {room.number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{room.category.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {room.floorLabel ? `${room.floorLabel} · ` : ""}waiting {since(room.statusSince)}
          {room.next ? ` · arrival ${room.next.checkIn}` : ""}
        </p>
      </div>
      {col.next && (
        <Btn size="sm" variant={col.key === "INSPECTION" ? "primary" : "soft"} disabled={busy} onClick={() => onMove(col.next!.to, col.next!.note)}>
          {col.next.label}
        </Btn>
      )}
    </motion.div>
  );
}
