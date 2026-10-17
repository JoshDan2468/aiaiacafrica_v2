import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, User } from "./adminIcons";
import { formatAdminRole, getAdminInitials } from "@/lib/adminProfile";
import type { AdminProfile } from "@/types/auth";
import { cn } from "@/lib/utils";

interface AdminProfileMenuProps {
  admin: AdminProfile;
  isLoggingOut: boolean;
  onLogout: () => void;
  className?: string;
}

export function AdminProfileMenu({
  admin,
  isLoggingOut,
  onLogout,
  className,
}: AdminProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = getAdminInitials(admin.fullName);
  const formattedRole = formatAdminRole(admin.role);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex h-11 items-center gap-2.5 rounded-[10px] border border-transparent bg-transparent p-1.5 pr-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#173D2D] text-xs font-bold text-white">
          {initials}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-36 truncate text-[13px] font-semibold leading-tight text-slate-900">
            {admin.fullName}
          </p>
          <p className="text-[11px] font-medium text-slate-500">{formattedRole}</p>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-slate-400 transition-transform duration-150",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(25,37,30,0.08)]">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="text-xs font-bold text-slate-900">{admin.fullName}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{admin.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
              <ShieldCheck className="size-3 text-emerald-600" aria-hidden="true" />
              {formattedRole}
            </div>
          </div>

          <div className="py-1">
            <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-slate-600">
              <User className="size-3.5 text-slate-400" />
              <span className="truncate">Permissions: {admin.permissions.length} granted</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              {isLoggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
