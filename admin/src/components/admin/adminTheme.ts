export type AdminTheme = "light" | "dark";

const storageKey = "aiaiac-admin-theme";

export function getInitialAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyAdminTheme(theme: AdminTheme, persist = true) {
  document.documentElement.dataset["adminTheme"] = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (persist) window.localStorage.setItem(storageKey, theme);
}
