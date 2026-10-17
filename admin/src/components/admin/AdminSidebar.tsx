import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "./adminIcons";
import { NavLink } from "react-router-dom";
import { adminNavigation, getAdminHomePath } from "@/data/adminNavigation";
import { formatAdminRole, getAdminInitials } from "@/lib/adminProfile";
import type { AdminProfile } from "@/types/auth";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  admin: AdminProfile;
  isLoggingOut: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({
  admin,
  isLoggingOut,
  onLogout,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const initials = getAdminInitials(admin.fullName);
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; top: number } | null>(null);

  const showTooltip = (label: string, target: HTMLElement) => {
    if (!collapsed) return;
    const rect = target.getBoundingClientRect();
    setActiveTooltip({ label, top: rect.top + rect.height / 2 });
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  return (
    <div className="relative flex h-full flex-col bg-[#05190F] text-white select-none">
      {/* Brand Header */}
      <div
        className={cn(
          "flex min-h-[72px] border-b border-white/10 py-3",
          collapsed
            ? "flex-col items-center justify-center gap-2 px-2"
            : "items-center justify-between gap-2 px-4",
        )}
      >
        <div className={cn("min-w-0", collapsed && "flex flex-col items-center")}>
          <NavLink
            to={getAdminHomePath(admin.permissions)}
            className="block rounded-[8px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05190F]"
          >
            <img
              src="/brand/aiaiac-logo-light.png"
              alt="AIAIAC 2027"
              className={cn(
                "object-contain object-left transition-all duration-200",
                collapsed ? "h-6 w-10" : "h-8 w-auto max-w-[10.5rem]",
              )}
            />
          </NavLink>
          {!collapsed && (
            <div className="mt-2 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#10B981]" />
              <p className="text-[11px] font-semibold tracking-[0.08em] text-white/55">
                Admin Workspace
              </p>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={() => {
              hideTooltip();
              onToggleCollapse();
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.04] text-white/70 transition-colors duration-150 hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399]"
          >
            {collapsed ? (
              <ChevronRight className="size-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav
        className={cn(
          "admin-sidebar-nav flex-1 overflow-y-auto py-4",
          collapsed ? "space-y-3 px-2" : "space-y-5 px-3.5 py-5",
        )}
        aria-label="Admin navigation"
        onScroll={hideTooltip}
      >
        {adminNavigation.map((group, groupIndex) => {
          const items = group.items.filter(
            (item) => !item.permission || admin.permissions.includes(item.permission),
          );
          if (items.length === 0) return null;

          return (
            <div key={group.label}>
              {collapsed ? (
                groupIndex > 0 ? (
                  <div className="mx-2 mb-2.5 border-t border-white/10" aria-hidden="true" />
                ) : null
              ) : (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                  {group.label}
                </p>
              )}
              <ul className={cn("space-y-1", !collapsed && "mt-1.5")}>
                {items.map((item) => {
                  const Icon = item.icon;
                  if (!item.href) return null;

                  return (
                    <li key={item.label}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/admin/communications"}
                        onClick={() => {
                          hideTooltip();
                          onNavigate?.();
                        }}
                        onMouseEnter={(e) => showTooltip(item.label, e.currentTarget)}
                        onMouseLeave={hideTooltip}
                        onFocus={(e) => showTooltip(item.label, e.currentTarget)}
                        onBlur={hideTooltip}
                        aria-label={item.ariaLabel ?? (collapsed ? item.label : undefined)}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex h-11 items-center rounded-[10px] text-sm font-medium text-white/72 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399]",
                            collapsed
                              ? "mx-auto w-11 justify-center px-0"
                              : "gap-[11px] px-3",
                            isActive &&
                              "bg-[#123526] text-white font-semibold ring-1 ring-inset ring-[#34D399]/20 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#10B981] hover:bg-[#153D2C]",
                          )
                        }
                      >
                        {item.emoji ? (
                          <span
                            className="text-[17px] leading-none shrink-0 select-none transition-transform duration-150 group-hover:scale-105"
                            aria-hidden="true"
                          >
                            {item.emoji}
                          </span>
                        ) : (
                          <Icon
                            className="size-[18px] shrink-0 text-white/60 transition-colors group-hover:text-white"
                            stroke={1.8}
                            aria-hidden="true"
                          />
                        )}
                        {!collapsed &&
                          (item.label === "Reports & Exports" ? (
                            <span className="truncate">
                              <span>Reports</span>
                              <span className="text-white/50"> &amp; Exports</span>
                            </span>
                          ) : (
                            <span className="truncate">{item.label}</span>
                          ))}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className={cn("border-t border-white/10", collapsed ? "p-2" : "p-3.5")}>
        <div
          className={cn(
            "flex items-center rounded-[10px] bg-white/[0.04]",
            collapsed ? "justify-center p-2" : "gap-3 p-2.5",
          )}
          title={collapsed ? `${admin.fullName} (${formatAdminRole(admin.role)})` : undefined}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-white/15 bg-white/10 text-xs font-bold text-white shadow-xs">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{admin.fullName}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-white/50">
                {formatAdminRole(admin.role)}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          onMouseEnter={(e) => showTooltip(isLoggingOut ? "Signing out…" : "Sign out", e.currentTarget)}
          onMouseLeave={hideTooltip}
          onFocus={(e) => showTooltip(isLoggingOut ? "Signing out…" : "Sign out", e.currentTarget)}
          onBlur={hideTooltip}
          aria-label={collapsed ? (isLoggingOut ? "Signing out…" : "Sign out") : undefined}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "mt-2 flex min-h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-white/10 text-xs font-medium text-white/75 transition-colors duration-150 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] disabled:cursor-wait disabled:opacity-50",
            collapsed ? "px-0" : "px-3",
          )}
        >
          <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
          {!collapsed && (isLoggingOut ? "Signing out…" : "Sign out")}
        </button>
      </div>

      {/* Floating Tooltip for Collapsed Desktop Mode */}
      {collapsed && activeTooltip && (
        <div
          role="tooltip"
          style={{ top: `${activeTooltip.top}px` }}
          className="pointer-events-none fixed left-[78px] z-[60] -translate-y-1/2 whitespace-nowrap rounded-[8px] border border-white/15 bg-[#05190F] px-3 py-1.5 text-xs font-semibold text-white shadow-xl"
        >
          {activeTooltip.label}
        </div>
      )}
    </div>
  );
}
