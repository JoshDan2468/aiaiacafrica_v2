import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import type { AdminProfile } from "@/types/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function adminEnvelope(admin: AdminProfile) {
  return { success: true, message: "Current admin retrieved", data: { admin } };
}

describe("Admin user access", () => {
  beforeEach(() => window.history.replaceState({}, "", "/admin/dashboard"));

  it("shows navigation from server-provided permissions", async () => {
    const finance: AdminProfile = {
      id: "finance-1",
      fullName: "Femi Finance",
      email: "femi@example.com",
      role: "FINANCE",
      permissions: [
        "payments.read",
        "payments.manage",
        "registrations.read",
        "reports.read",
        "reports.export",
        "reports.financial",
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(adminEnvelope(finance))));

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Welcome back, Femi" }, { timeout: 5000 }),
    ).toBeVisible();
    expect(screen.getByText("Payments")).toBeVisible();
    expect(screen.getByText("Reports")).toBeVisible();
    expect(screen.queryByText("Users & roles")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Delegates" })).not.toBeInTheDocument();
  });

  it("renders the protected user directory without exposing password fields", async () => {
    window.history.replaceState({}, "", "/admin/users");
    const owner: AdminProfile = {
      id: "owner-1",
      fullName: "Amina Owner",
      email: "owner@example.com",
      role: "SUPER_ADMIN",
      permissions: ["users.read", "users.invite", "users.manage"],
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve(jsonResponse(adminEnvelope(owner)));
      if (url === "/api/admin/users") {
        return Promise.resolve(
          jsonResponse({
            success: true,
            message: "Admin users retrieved",
            data: {
              users: [
                {
                  id: "staff-1",
                  fullName: "Jane Doe",
                  email: "jane@example.com",
                  role: "FINANCE",
                  isActive: true,
                  createdAt: "2026-09-14T12:00:00.000Z",
                  lastLoginAt: null,
                },
                {
                  id: "scanner-1",
                  fullName: "Sam Scanner",
                  email: "scanner@example.com",
                  role: "CHECK_IN_STAFF",
                  isActive: true,
                  createdAt: "2026-09-14T12:00:00.000Z",
                  lastLoginAt: null,
                },
              ],
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ success: false }, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Users & Roles" }, { timeout: 5000 }),
    ).toBeVisible();
    expect(await screen.findByText("jane@example.com", {}, { timeout: 5000 })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Role for Sam Scanner" })).toHaveValue(
      "CHECK_IN_STAFF",
    );
    expect(screen.getByRole("button", { name: "Invite Staff" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Invitation History" })).toHaveAttribute(
      "href",
      "/admin/users/invitations",
    );
    expect(document.body.textContent).not.toContain("passwordHash");
  });

  it("validates and accepts a public invitation with the mutation header", async () => {
    window.history.replaceState({}, "", `/admin/accept-invite?token=${"A".repeat(43)}`);
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/auth/me") return Promise.resolve(jsonResponse({ success: false }, 401));
      if (url.startsWith("/api/admin/invitations/validate")) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            message: "Invitation status retrieved",
            data: {
              status: "VALID",
              invitation: {
                id: "invite-1",
                fullName: "Jane Doe",
                email: "jane@example.com",
                role: "FINANCE",
                invitedByAdminId: "owner-1",
                status: "PENDING",
                expiresAt: "2026-09-16T12:00:00.000Z",
                acceptedAt: null,
                revokedAt: null,
                emailSentAt: "2026-09-14T12:00:00.000Z",
                createdAt: "2026-09-14T12:00:00.000Z",
                updatedAt: "2026-09-14T12:00:00.000Z",
              },
            },
          }),
        );
      }
      if (url === "/api/admin/invitations/accept") {
        expect(new Headers(options?.headers).get("X-AIAIAC-CSRF")).toBe("1");
        return Promise.resolve(
          jsonResponse({ success: true, message: "Staff account activated", data: {} }, 201),
        );
      }
      return Promise.resolve(jsonResponse({ success: false }, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    expect(await screen.findByText("jane@example.com")).toBeVisible();
    await user.type(screen.getByLabelText("New Password"), "StrongPassword1");
    await user.type(screen.getByLabelText("Confirm Password"), "StrongPassword1");
    await user.click(screen.getByRole("button", { name: "Set Password & Activate Account" }));

    await waitFor(() => expect(window.location.pathname).toBe("/admin/login"));
  });
});
