import { useEffect, useState } from "react";
import { Moon, Sun } from "./adminIcons";
import { applyAdminTheme, getInitialAdminTheme, type AdminTheme } from "./adminTheme";

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme>(getInitialAdminTheme);

  useEffect(() => {
    applyAdminTheme(theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <div className="admin-theme-control" aria-label="Admin colour theme">
      <Sun aria-hidden="true" className="size-[18px]" stroke={1.8} />
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        className="admin-theme-switch"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <span className="admin-theme-switch__knob" />
      </button>
      <Moon aria-hidden="true" className="size-[18px]" stroke={1.8} />
    </div>
  );
}
