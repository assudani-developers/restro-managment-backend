"use client";

import { Volume2, VolumeX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationMute } from "@/hooks/use-notification-mute";
import { playNotificationFeedback } from "@/lib/notification-feedback";
import { unlockAudio, useAudioUnlocked } from "@/lib/audio-unlock";
import { useRealtimeState } from "@/lib/realtime-status";

// Two things a kitchen screen has to be honest about: whether live updates
// are flowing, and whether it is actually allowed to make noise. A browser
// blocks sound until the page is touched, so an untouched screen says so and
// offers one tap to turn it on instead of silently missing every new ticket.
export function LiveStatus() {
  const state = useRealtimeState();
  const unlocked = useAudioUnlocked();
  const [muted, toggleMute] = useNotificationMute();

  return (
    <div className="flex flex-col gap-2">
      {state === "offline" && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800">
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          Live updates paused - reconnecting in background. No tickets lost.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!muted && !unlocked && (
          <Button
            type="button"
            size="sm"
            className="h-8.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3 shadow-2xs gap-1.5"
            onClick={() => {
              void unlockAudio().then((ok) => ok && playNotificationFeedback());
            }}
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            Enable Audio Chime
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 shadow-2xs gap-1.5"
          aria-pressed={muted}
          onClick={toggleMute}
          title="Per-device audio setting"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden /> : <Volume2 className="h-3.5 w-3.5 text-teal-600" aria-hidden />}
          {muted ? "Muted" : "Chime On"}
        </Button>
      </div>
    </div>
  );
}
