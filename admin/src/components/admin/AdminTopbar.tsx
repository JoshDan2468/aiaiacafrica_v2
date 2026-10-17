import { useLocation } from "react-router-dom";
import type { AdminProfile } from "@/types/auth";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminProfileMenu } from "./AdminProfileMenu";
import { AdminThemeToggle } from "./AdminThemeToggle";

interface AdminTopbarProps {
  admin: AdminProfile;
  isLoggingOut: boolean;
  onLogout: () => void;
}

function getModuleInfo(pathname: string): { section: string; title: string } {
  if (pathname.startsWith("/admin/delegates"))
    return { section: "Registration", title: "Delegates" };
  if (pathname.startsWith("/admin/student-verifications"))
    return { section: "Registration", title: "Student Verification" };
  if (pathname.startsWith("/admin/sponsor-applications"))
    return { section: "Commercial", title: "Sponsors" };
  if (pathname.startsWith("/admin/exhibitor-applications"))
    return { section: "Commercial", title: "Exhibitors" };
  if (pathname.startsWith("/admin/abstract-submissions"))
    return { section: "Programme", title: "Abstracts" };
  if (pathname.startsWith("/admin/check-in"))
    return { section: "Operations", title: "Event Check-in" };
  if (pathname.startsWith("/admin/enquiries")) return { section: "Operations", title: "Enquiries" };
  if (pathname.startsWith("/admin/communications/contacts"))
    return { section: "Communications", title: "Contacts & Audiences" };
  if (pathname.startsWith("/admin/communications/campaigns"))
    return { section: "Communications", title: "Campaigns" };
  if (pathname.startsWith("/admin/communications/templates"))
    return { section: "Communications", title: "Templates" };
  if (pathname.startsWith("/admin/communications/deliveries"))
    return { section: "Communications", title: "Delivery Activity" };
  if (pathname.startsWith("/admin/communications"))
    return { section: "Communications", title: "Email Centre" };
  if (pathname.startsWith("/admin/payments")) return { section: "Finance", title: "Payments" };
  if (pathname.startsWith("/admin/reports"))
    return { section: "Reporting", title: "Reports & Exports" };
  if (pathname.startsWith("/admin/users/invitations"))
    return { section: "Administration", title: "Invitations" };
  if (pathname.startsWith("/admin/users")) return { section: "Administration", title: "Users" };

  return { section: "Overview", title: "Dashboard" };
}

export function AdminTopbar({ admin, isLoggingOut, onLogout }: AdminTopbarProps) {
  const location = useLocation();
  const moduleInfo = getModuleInfo(location.pathname);

  return (
    <header className="admin-topbar sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b px-3.5 sm:h-[72px] sm:px-6 lg:px-8 xl:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
        <AdminMobileNav admin={admin} isLoggingOut={isLoggingOut} onLogout={onLogout} />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12px] sm:gap-2 sm:text-[13px]">
          <span className="hidden font-medium text-slate-500 sm:inline">{moduleInfo.section}</span>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{moduleInfo.title}</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AdminThemeToggle />
        <AdminProfileMenu admin={admin} isLoggingOut={isLoggingOut} onLogout={onLogout} />
      </div>
    </header>
  );
}
