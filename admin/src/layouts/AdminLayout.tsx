import { Suspense, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { SEO } from "@/components/common/SEO";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "aiaiac-admin-sidebar-collapsed";

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getInitialSidebarCollapsed);

  if (!admin) return null;

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-shell min-h-screen min-w-0 overflow-x-hidden font-sans antialiased">
      <SEO title="Admin Portal | AIAIAC Africa 2027" noindex={true} />
      <a
        href="#admin-main"
        className="fixed left-4 top-4 z-[70] -translate-y-24 rounded-[10px] bg-[#05190F] px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-[#10B981]"
      >
        Skip to content
      </a>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-[#05190F] transition-[width] duration-200 ease-out lg:block",
          sidebarCollapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        <AdminSidebar
          admin={admin}
          isLoggingOut={isLoggingOut}
          onLogout={() => void handleLogout()}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </aside>

      {/* Main Canvas Area */}
      <div
        className={cn(
          "admin-workspace min-h-screen min-w-0 transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[248px]",
        )}
      >
        <AdminTopbar
          admin={admin}
          isLoggingOut={isLoggingOut}
          onLogout={() => void handleLogout()}
        />
        <main
          id="admin-main"
          tabIndex={-1}
          className="min-w-0 px-3.5 py-4 outline-none sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10"
        >
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center" aria-busy="true">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#05190F] border-t-transparent dark:border-[#34D399] dark:border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
