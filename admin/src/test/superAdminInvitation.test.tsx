import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import type { AdminProfile, AdminRole } from "@/types/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockAdmin(role: AdminRole) {
  const admin: AdminProfile = {
    id: `${role.toLowerCase()}-1`,
    fullName: "Test Administrator",
    email: "admin@example.test",
    role,
    permissions: ["users.read", "users.invite", "users.manage"],
  };
  const invitationRequests: Array<Record<string, unknown>> = [];
  const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (url === "/api/auth/me") {
      return Promise.resolve(
        jsonResponse({ success: true, message: "Current admin", data: { admin } }),
      );
    }
    if (url === "/api/admin/users") {
      return Promise.resolve(jsonResponse({ success: true, data: { users: [] } }));
    }
    if (url === "/api/admin/users/invitations" && options?.method === "POST") {
      invitationRequests.push(JSON.parse(String(options.body)) as Record<string, unknown>);
      return Promise.resolve(jsonResponse({ success: true, data: { emailSent: true } }, 201));
    }
    if (url === "/api/admin/users/invitations") {
      return Promise.resolve(jsonResponse({ success: true, data: { invitations: [] } }));
    }
    return Promise.resolve(jsonResponse({ success: false }, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return { invitationRequests, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

describe("Super Admin invitation UI", () => {
  it("lets a Super Admin explicitly select the role in Users & Roles, with a warning and no password", async () => {
    window.history.replaceState({}, "", "/admin/users");
    const { invitationRequests } = mockAdmin("SUPER_ADMIN");
    const user = userEvent.setup();

    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Invite Staff" }, { timeout: 5000 }),
    );
    const dialog = screen.getByRole("dialog");
    const roleSelect = within(dialog).getByLabelText("Role Assignment *");
    expect(within(dialog).getByRole("option", { name: "Super Admin" })).toBeInTheDocument();
    await user.selectOptions(roleSelect, "SUPER_ADMIN");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("full platform control");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("single-use invitation");
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Full Name *"), "CEO Test");
    await user.type(within(dialog).getByLabelText("Official Email Address *"), "CEO@EXAMPLE.TEST");
    await user.click(within(dialog).getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => expect(invitationRequests).toHaveLength(1));
    expect(invitationRequests[0]).toEqual({
      name: "CEO Test",
      email: "ceo@example.test",
      role: "SUPER_ADMIN",
    });
  });

  it("keeps ordinary ADMIN invitations available without exposing Super Admin to ADMIN", async () => {
    window.history.replaceState({}, "", "/admin/users");
    const { invitationRequests } = mockAdmin("ADMIN");
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Invite Staff" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("option", { name: "Super Admin" })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/full platform control/i)).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Full Name *"), "Operations Test");
    await user.type(within(dialog).getByLabelText("Official Email Address *"), "OPS@EXAMPLE.TEST");
    await user.click(within(dialog).getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => expect(invitationRequests).toHaveLength(1));
    expect(invitationRequests[0]).toEqual({
      name: "Operations Test",
      email: "ops@example.test",
      role: "ADMIN",
    });
  });

  it("shows the Super Admin option and warning on Staff Invitations only to Super Admin", async () => {
    window.history.replaceState({}, "", "/admin/users/invitations");
    mockAdmin("SUPER_ADMIN");
    const user = userEvent.setup();

    render(<App />);
    const roleSelect = await screen.findByLabelText("Assigned Role *");
    expect(screen.getByRole("option", { name: "Super Admin" })).toBeInTheDocument();
    await user.selectOptions(roleSelect, "SUPER_ADMIN");
    expect(screen.getByRole("alert")).toHaveTextContent("full platform control");
  });

  it.each(["ADMIN", "FINANCE", "REGISTRATION_MANAGER", "COMMUNICATIONS"] as const)(
    "does not offer Super Admin on Staff Invitations to %s",
    async (role) => {
      window.history.replaceState({}, "", "/admin/users/invitations");
      mockAdmin(role);
      render(<App />);

      expect(await screen.findByLabelText("Assigned Role *")).toBeVisible();
      expect(screen.queryByRole("option", { name: "Super Admin" })).not.toBeInTheDocument();
      expect(screen.queryByText(/full platform control/i)).not.toBeInTheDocument();
    },
  );
});
