import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import { apiRequest } from "@/services/api/client";
import type { AdminProfile } from "@/types/auth";

const superAdmin: AdminProfile = {
  id: "admin-1",
  fullName: "Amina Okafor",
  email: "amina@example.com",
  role: "SUPER_ADMIN",
  permissions: [
    "users.read",
    "users.invite",
    "users.manage",
    "delegates.read",
    "delegates.manage",
    "registrations.read",
    "registrations.manage",
    "payments.read",
    "payments.manage",
    "sponsors.read",
    "sponsors.manage",
    "communications.read",
    "communications.send",
    "reports.export",
    "audit.read",
    "settings.manage",
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function adminResponse(admin = superAdmin) {
  return { success: true, message: "Current admin retrieved", data: { admin } };
}

function createDeferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("Admin authentication and layout", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/login");
  });

  it("renders the login form and validates required fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: false }, 401));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Admin Gateway" })).toBeVisible();
    expect(screen.getByLabelText("Email Address")).toBeVisible();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Sign In to Workspace" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address and password.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits normalized credentials with cookies and redirects on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(jsonResponse(adminResponse()));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { name: "Admin Gateway" });
    await user.type(screen.getByLabelText("Email Address"), "  AMINA@EXAMPLE.COM  ");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign In to Workspace" }));

    expect(await screen.findByRole("heading", { name: "Welcome back, Amina" })).toBeVisible();
    const [url, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body as string)).toEqual({
      email: "amina@example.com",
      password: "correct-password",
    });
    expect(window.location.pathname).toBe("/admin/dashboard");
  });

  it("shows a rate-limit message and clears the password after failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: false }, 429));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { name: "Admin Gateway" });
    await user.type(screen.getByLabelText("Email Address"), "admin@example.com");
    const password = screen.getByLabelText("Password");
    await user.type(password, "not-the-password");
    await user.click(screen.getByRole("button", { name: "Sign In to Workspace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many login attempts. Please wait and try again.",
    );
    expect(password).toHaveValue("");
  });

  it("shows a generic invalid-credentials message for a login 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ success: false, message: "Internal authentication detail" }, 401),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { name: "Admin Gateway" });
    await user.type(screen.getByLabelText("Email Address"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "incorrect-password");
    await user.click(screen.getByRole("button", { name: "Sign In to Workspace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Internal authentication detail");
    expect(window.location.pathname).toBe("/admin/login");
  });

  it("disables submit and announces progress while login is pending", async () => {
    const pendingLogin = createDeferredResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockReturnValueOnce(pendingLogin.promise);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { name: "Admin Gateway" });
    await user.type(screen.getByLabelText("Email Address"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign In to Workspace" }));

    expect(screen.getByRole("button", { name: "Verifying Credentials…" })).toBeDisabled();

    pendingLogin.resolve(jsonResponse(adminResponse()));
    expect(await screen.findByRole("heading", { name: "Welcome back, Amina" })).toBeVisible();
  });

  it("protects the dashboard without flashing protected content", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: false }, 401));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByText("Verifying administrator session…")).toBeVisible();
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Admin Gateway" })).toBeVisible();
    expect(window.location.pathname).toBe("/admin/login");
    expect(
      screen.queryByText("Your session expired. Please sign in again."),
    ).not.toBeInTheDocument();
  });

  it("clears Admin state, redirects once and shows expiry text after a protected API 401", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(adminResponse()))
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Admin Gateway" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session expired. Please sign in again.",
    );
    expect(window.location.pathname).toBe("/admin/login");
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("does not treat a public API 401 as Admin session expiry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: false }, 401));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    await screen.findByRole("heading", { name: "Admin Gateway" });
    await apiRequest("/student-verifications/access");
    expect(
      screen.queryByText("Your session expired. Please sign in again."),
    ).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/login");
  });

  it("does not cache authenticated Admin API responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/admin/users");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users",
      expect.objectContaining({ cache: "no-store", credentials: "include" }),
    );
  });

  it("does not sign out an active Admin for a public invitation 401", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.includes("/admin/invitations/validate")
              ? jsonResponse({ success: false }, 401)
              : jsonResponse(adminResponse()),
          ),
        ),
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back, Amina" });
    await apiRequest("/admin/invitations/validate?token=invalid");
    expect(screen.getByRole("heading", { name: "Welcome back, Amina" })).toBeVisible();
    expect(window.location.pathname).toBe("/admin/dashboard");
  });

  it("synchronizes a logout from another Admin tab", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(adminResponse())));
    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back, Amina" });
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "aiaiac:admin-session-end",
        newValue: "LOGOUT:1",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Admin Gateway" })).toBeVisible();
    expect(
      screen.queryByText("Your session expired. Please sign in again."),
    ).not.toBeInTheDocument();
  });

  it("updates permission UI after an expired session is replaced by a lower-role login", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const finance: AdminProfile = {
      ...superAdmin,
      id: "finance-1",
      role: "FINANCE",
      permissions: [
        "registrations.read",
        "payments.read",
        "reports.read",
        "reports.export",
        "reports.financial",
      ],
    };
    let overviewCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(jsonResponse(adminResponse()));
        if (url === "/api/auth/login") return Promise.resolve(jsonResponse(adminResponse(finance)));
        if (url === "/api/admin/overview" && overviewCalls++ === 0)
          return Promise.resolve(jsonResponse({ success: false }, 401));
        return Promise.resolve(jsonResponse(adminResponse(finance)));
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Admin Gateway" });
    await user.type(screen.getByLabelText("Email Address"), "finance@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign In to Workspace" }));
    expect(await screen.findByRole("heading", { name: "Welcome back, Amina" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Users & roles" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Payments" })).toBeVisible();
    expect(
      screen.queryByText("Your session expired. Please sign in again."),
    ).not.toBeInTheDocument();
  });

  it("restores a safe profile and keeps future navigation disabled", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const unsafeLookingName = "<script>Amina</script> Okafor";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(adminResponse({ ...superAdmin, fullName: unsafeLookingName })),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<App />);

    expect((await screen.findAllByText(unsafeLookingName))[0]).toBeVisible();
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(screen.getAllByText("Super Admin").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/admin/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Registrations" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users & roles" })).toHaveAttribute(
      "href",
      "/admin/users",
    );
    expect(screen.getByText("Total Registrations")).toBeVisible();
  });

  it("redirects an authenticated administrator away from login", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(adminResponse()));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Welcome back, Amina" })).toBeVisible();
    expect(window.location.pathname).toBe("/admin/dashboard");
  });

  it("logs out on the server, clears state, and returns to login", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(adminResponse()))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: "Logout successful" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back, Amina" });
    await user.click(screen.getAllByRole("button", { name: /Sign out/i })[0]!);

    expect(await screen.findByRole("heading", { name: "Admin Gateway" })).toBeVisible();
    const logoutCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/logout");
    expect(logoutCall).toBeDefined();
    expect((logoutCall?.[1] as RequestInit).credentials).toBe("include");
    expect(window.location.pathname).toBe("/admin/login");

    window.history.pushState({}, "", "/admin/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => expect(window.location.pathname).toBe("/admin/login"));
    expect(screen.getByRole("heading", { name: "Admin Gateway" })).toBeVisible();
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });

  it("opens and closes the focus-managed mobile navigation", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(adminResponse()));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back, Amina" });
    const trigger = screen.getByRole("button", { name: "Open admin navigation" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Admin navigation" });
    expect(within(dialog).getByRole("link", { name: "Overview" })).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("routes Communications to Enquiries without exposing the denied Overview", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    const communications: AdminProfile = {
      ...superAdmin,
      role: "COMMUNICATIONS",
      permissions: ["enquiries.read", "enquiries.manage", "reports.read"],
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me")
        return Promise.resolve(jsonResponse(adminResponse(communications)));
      if (url.startsWith("/api/admin/enquiries"))
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: { enquiries: { items: [], page: 1, total: 0, totalPages: 0 } },
          }),
        );
      return Promise.resolve(jsonResponse({ success: false }, 403));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    expect(await screen.findByRole("heading", { name: "Public Enquiries" })).toBeVisible();
    expect(window.location.pathname).toBe("/admin/enquiries");
    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AIAIAC 2027" })).toHaveAttribute(
      "href",
      "/admin/enquiries",
    );
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/admin/overview")).toBe(false);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open admin navigation" }));
    const mobileNav = screen.getByRole("dialog", { name: "Admin navigation" });
    expect(within(mobileNav).queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "Enquiries" })).toBeVisible();
  });
});
