import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";

describe("public application separation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it.each([
    "/admin",
    "/admin/login",
    "/admin/accept-invite?token=example",
    "/admin/dashboard",
    "/admin/delegates/example",
    "/admin/communications/campaigns/example",
    "/admin/unknown",
  ])("renders the public not-found page at %s without checking staff auth", (url) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", url);
    render(<App />);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
