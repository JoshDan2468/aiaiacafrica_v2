import { Menu } from "./adminIcons";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AdminProfile } from "@/types/auth";
import { AdminSidebar } from "./AdminSidebar";

interface AdminMobileNavProps {
  admin: AdminProfile;
  isLoggingOut: boolean;
  onLogout: () => void;
}

export function AdminMobileNav({ admin, isLoggingOut, onLogout }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D] lg:hidden"
          aria-label="Open admin navigation"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(20rem,85vw)] border-r-0 bg-[#05190F] p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:text-white [&>button]:focus:ring-emerald-400"
      >
        <SheetTitle className="sr-only">Admin navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Navigate the AIAIAC administration workspace.
        </SheetDescription>
        <AdminSidebar
          admin={admin}
          isLoggingOut={isLoggingOut}
          onLogout={onLogout}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
