"use client";

import type { SessionUser } from "@restrocore/types";
import { ChevronDown, LogOut, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-auth";

function initials(name?: string) {
  if (!name) return "RC";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ user }: { user?: SessionUser }) {
  const logout = useLogout();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/30">
          <Avatar className="h-8 w-8 rounded-lg shadow-2xs">
            <AvatarFallback className="rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col text-left xl:flex">
            <span className="text-xs font-semibold leading-tight text-slate-800">{user?.name ?? "Staff"}</span>
            <span className="text-[10px] font-medium text-slate-500 leading-tight">{user?.roleName ?? "Owner"}</span>
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <DropdownMenuLabel className="px-2 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{user?.roleName}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          <DropdownMenuItem
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/login") })}
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
