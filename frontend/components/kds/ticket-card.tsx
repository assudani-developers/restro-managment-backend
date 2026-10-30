"use client";

import { ApiError } from "@/lib/api";
import { Flame, Globe, Printer, Star, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactDetailsDialog } from "@/components/contact-details-dialog";
import { ReasonDialog } from "@/components/orders/reason-dialog";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import {
  NEXT_STATUS,
  useRejectKot,
  useReprintKot,
  useSetKotPriority,
  useUpdateKotStatus,
  type KotTicket,
} from "@/hooks/use-kds";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Accept",
  ACCEPTED: "Start preparing",
  PREPARING: "Mark ready",
  READY: "Mark served",
};

const REJECT_REASONS = ["Out of stock", "Item unavailable", "Kitchen too busy", "Equipment problem"];

// A ticket this young is new enough to draw the eye (and it stops on its own).
const FRESH_MINUTES = 2;

function useElapsedMinutes(createdAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const compute = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)));
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
  }, [createdAt]);
  return elapsed;
}

function customerDisplayName(order: KotTicket["order"]) {
  return order.customer?.name || order.guestName || null;
}

function customerPhone(order: KotTicket["order"]) {
  return order.customer?.phone || null;
}

export function TicketCard({ ticket, branchId }: { ticket: KotTicket; branchId: string | null }) {
  const elapsed = useElapsedMinutes(ticket.createdAt);
  const updateStatus = useUpdateKotStatus(branchId);
  const setPriority = useSetKotPriority(branchId);
  const reprint = useReprintKot(branchId);
  const { note, clear: clearNote, toast } = useNoteToast();
  const nextStatus = NEXT_STATUS[ticket.status];
  const isLate = elapsed >= 15;
  const isFresh = ticket.status === "NEW" && elapsed < FRESH_MINUTES;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const reject = useRejectKot(branchId);
  const { data: me } = useCurrentUser();
  // Rejecting before cooking starts is for anyone on the kitchen screen; food
  // already on the stove is a manager's call (the server enforces the same).
  const started = ticket.status === "PREPARING";
  const canReject =
    (ticket.status === "NEW" || ticket.status === "ACCEPTED" || started) &&
    (!started || hasPermission(me?.user, "orders.cancel"));

  return (
    <Card
      className={cn(
        "flex shrink-0 flex-col gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs transition-all",
        isLate && "border-rose-300 ring-1 ring-rose-200 bg-rose-50/15",
        ticket.isPriority && !isLate && "border-amber-300 ring-1 ring-amber-200 bg-amber-50/15",
        isFresh && "border-indigo-400 ring-2 ring-indigo-200 motion-safe:animate-pulse",
      )}
    >
      <StatusNote note={note} onClear={clearNote} />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ticket for order #${ticket.order.orderNumber}?`}
        description={
          ticket.order.table
            ? `Table ${ticket.order.table.number} will be told the kitchen cannot make this. The ticket stays on record with your name and reason.`
            : "The guest will be told the kitchen cannot make this. The ticket stays on record with your name and reason."
        }
        warning={started ? "This ticket is already being prepared. Rejecting it means the food in progress is wasted." : undefined}
        reasons={REJECT_REASONS}
        confirmLabel="Reject ticket"
        keepLabel="Keep ticket"
        onSubmit={(reason) =>
          reject.mutateAsync({ id: ticket.id, reason, confirmStarted: started ? true : undefined })
        }
      />
      <ContactDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={`Order #${ticket.order.orderNumber}`}
        name={customerDisplayName(ticket.order)}
        subtitle={ticket.order.table ? `Table ${ticket.order.table.number}` : ticket.order.type}
        phone={customerPhone(ticket.order)}
        waMessage={`Hi ${customerDisplayName(ticket.order) ?? ""}, this is regarding your order #${ticket.order.orderNumber}.`}
      />
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="flex items-center justify-between rounded-xl p-1.5 -m-1 text-left transition hover:bg-slate-50"
        title="View customer details"
      >
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              #{ticket.order.orderNumber}
            </span>
            {ticket.isPriority && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                VIP
              </span>
            )}
            {ticket.order.channel === "ONLINE" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 text-sky-900 px-1.5 py-0.5 text-[10px] font-bold">
                <Globe className="h-3 w-3 text-sky-700" />
                Online
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-0.5 text-xs text-slate-600 font-medium">
            <span className="font-semibold text-slate-800">
              {ticket.order.table ? `Table ${ticket.order.table.number}` : ticket.order.type}
            </span>
            {ticket.station && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-indigo-600 font-semibold">{ticket.station.name}</span>
              </>
            )}
            {customerDisplayName(ticket.order) && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{customerDisplayName(ticket.order)}</span>
              </>
            )}
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums border shrink-0",
            elapsed < 10
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : elapsed < 20
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-rose-50 text-rose-800 border-rose-300 animate-pulse",
          )}
        >
          <Timer className="h-3.5 w-3.5" />
          {elapsed}m
        </div>
      </button>

      {ticket.order.notes && (
        <p className="flex items-start gap-1 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-900 font-medium">
          <Flame className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" /> {ticket.order.notes}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5">
        {ticket.items.map((item) => (
          <div key={item.id} className="text-sm">
            <p className="font-bold text-slate-900 flex items-center">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-slate-900 text-white text-[11px] font-black mr-2 shrink-0">
                {item.orderItem.quantity}
              </span>
              <span>{item.orderItem.nameSnapshot}</span>
            </p>
            {item.orderItem.modifiers.length > 0 && (
              <p className="text-xs text-slate-500 pl-7 mt-0.5">
                {item.orderItem.modifiers.map((m) => m.nameSnapshot).join(", ")}
              </p>
            )}
            {item.orderItem.kitchenNote && (
              <p className="flex items-center gap-1 text-xs text-amber-700 font-semibold pl-7 mt-0.5">
                <Flame className="h-3 w-3 text-amber-600 shrink-0" /> {item.orderItem.kitchenNote}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
        {nextStatus && (
          <Button
            className={cn(
              "h-10 flex-1 text-xs font-bold rounded-xl transition-all shadow-2xs",
              ticket.status === "NEW" && "bg-indigo-600 hover:bg-indigo-700 text-white",
              ticket.status === "ACCEPTED" && "bg-amber-600 hover:bg-amber-700 text-white",
              ticket.status === "PREPARING" && "bg-blue-600 hover:bg-blue-700 text-white",
              ticket.status === "READY" && "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate(
                { id: ticket.id, status: nextStatus },
                {
                  onError: (err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Could not update the ticket. Check the connection and try again.",
                    ),
                },
              )
            }
          >
            {updateStatus.isPending ? "Updating…" : STATUS_LABEL[ticket.status]}
          </Button>
        )}
        {canReject && (
          <Button
            variant="outline"
            className="h-10 shrink-0 px-3 border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold gap-1"
            onClick={() => setRejectOpen(true)}
            aria-label={`Reject ticket for order ${ticket.order.orderNumber}`}
          >
            <X className="h-4 w-4" aria-hidden />
            Reject
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl border-slate-200 hover:bg-slate-50"
          title={ticket.isPriority ? "Unmark priority" : "Mark priority"}
          aria-label={ticket.isPriority ? "Unmark priority" : "Mark priority"}
          disabled={setPriority.isPending}
          onClick={() =>
            setPriority.mutate({ id: ticket.id, isPriority: !ticket.isPriority })
          }
        >
          <Star className={cn("h-4 w-4", ticket.isPriority && "fill-amber-500 text-amber-500")} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl border-slate-200 hover:bg-slate-50"
          title={ticket.printedCount > 0 ? "Reprint ticket (marked REPRINT)" : "Print ticket"}
          aria-label={ticket.printedCount > 0 ? "Reprint ticket" : "Print ticket"}
          disabled={reprint.isPending}
          onClick={() =>
            reprint.mutate(
              { id: ticket.id, reprint: ticket.printedCount > 0 },
              {
                onSuccess: () =>
                  toast.success(
                    ticket.printedCount > 0 ? "Reprint sent to the kitchen printer" : "Ticket sent to the kitchen printer",
                  ),
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Could not print the ticket"),
              },
            )
          }
        >
          <Printer className="h-4 w-4 text-slate-600" />
        </Button>
      </div>
    </Card>
  );
}
