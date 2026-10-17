import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import type { AdminRole } from "@/types/auth";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(role: AdminRole) {
  window.history.replaceState({}, "", "/admin/users");
  const requests: string[] = [];
  const admin = {
    id: "owner-1",
    fullName: "Synthetic Owner",
    email: "owner@example.invalid",
    role,
    permissions: ["users.read", "users.manage", "users.invite"],
  };
  const users = [
    {
      id: "staff-1",
      fullName: "Synthetic Staff",
      email: "staff@example.invalid",
      role: "ADMIN",
      isActive: true,
      createdAt: "2026-09-14T12:00:00.000Z",
      lastLoginAt: null,
    },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/auth/me")
        return Promise.resolve(response({ success: true, data: { admin } }));
      if (url === "/api/admin/users")
        return Promise.resolve(response({ success: true, data: { users } }));
      if (url === "/api/admin/users/staff-1/promote" && options?.method === "PATCH") {
        requests.push(url);
        expect(new Headers(options.headers).get("X-AIAIAC-CSRF")).toBe("1");
        users[0]!.role = "SUPER_ADMIN";
        return Promise.resolve(response({ success: true, data: { user: users[0] } }));
      }
      return Promise.resolve(response({ success: false }, 404));
    }),
  );
  return requests;
}

afterEach(() => vi.unstubAllGlobals());

describe("existing account Super Admin promotion", () => {
  it("requires explicit confirmation and keeps ordinary role options unchanged", async () => {
    const requests = setup("SUPER_ADMIN");
    const user = userEvent.setup();
    render(<App />);
    const action = await screen.findByRole(
      "button",
      { name: "Promote to Super Admin" },
      { timeout: 5000 },
    );
    expect(screen.queryByRole("option", { name: "Super Admin" })).not.toBeInTheDocument();
    await user.click(action);
    const dialog = screen.getByRole("dialog", { name: "Promote to Super Admin?" });
    expect(within(dialog).getAllByText(/full platform control/i)).toHaveLength(2);
    expect(within(dialog).getByText(/staff@example.invalid/i)).toBeVisible();
    const confirm = within(dialog).getByRole("button", { name: "Confirm promotion" });
    expect(confirm).toBeDisabled();
    expect(requests).toHaveLength(0);
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(confirm);
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(await screen.findByText(/was promoted to Super Admin/i)).toBeVisible();
  });

  it.each(["ADMIN", "FINANCE", "REGISTRATION_MANAGER", "COMMUNICATIONS"] as const)(
    "does not offer promotion to %s",
    async (role) => {
      setup(role);
      render(<App />);
      expect(await screen.findByText("staff@example.invalid")).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Promote to Super Admin" }),
      ).not.toBeInTheDocument();
    },
  );
});
