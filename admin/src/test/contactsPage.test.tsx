import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactsPage } from "@/pages/admin/communications/ContactsPage";

const auth = vi.hoisted(() => ({ permissions: ["communications.read", "communications.manage"] }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ admin: { permissions: auth.permissions } }),
}));

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const contact = {
  id: "system:delegate:1",
  name: "Amina Okafor",
  email: "amina@example.com",
  organization: "Example Energy",
  country: "Nigeria",
  status: "SUBMITTED",
  createdAt: "2026-09-15T00:00:00.000Z",
  source: "SYSTEM",
  types: ["PROFESSIONAL_DELEGATE"],
};

function list(items = [contact]) {
  return response({ success: true, data: { items, total: items.length, page: 1, limit: 25 } });
}

afterEach(() => {
  vi.restoreAllMocks();
  auth.permissions = ["communications.read", "communications.manage"];
});

describe("Contacts & Audiences", () => {
  it("shows authoritative source data, applies search and filters, and retains operational columns", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(list());
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Amina Okafor")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Country" })).toBeVisible();
    expect(within(screen.getByRole("table")).getByText("System")).toBeVisible();
    expect(within(screen.getByRole("table")).getByText("Professional Delegate")).toBeVisible();
    expect(screen.getByRole("link", { name: "amina@example.com" })).toBeVisible();

    fireEvent.change(screen.getByRole("textbox", { name: "Search contacts" }), {
      target: { value: "amina" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Contact source" }), {
      target: { value: "SYSTEM" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("search=amina");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("source=SYSTEM");
  });

  it("hides add/import actions without manage permission", async () => {
    auth.permissions = ["communications.read"];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(list());
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Amina Okafor")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add contact" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import CSV" })).not.toBeInTheDocument();
  });

  it("gives specific duplicate-email feedback without creating a second record", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(list())
      .mockResolvedValueOnce(response({ success: false }, 409));
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Amina Okafor");
    fireEvent.click(screen.getByRole("button", { name: "Add contact" }));
    const dialog = screen.getByRole("dialog", { name: "Add contact" });
    fireEvent.change(screen.getByLabelText("Contact category"), {
      target: { value: "PROSPECTIVE_SPONSOR" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), {
      target: { value: "Amina Okafor" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), {
      target: { value: "AMINA@example.com" },
    });
    fireEvent.submit(dialog.querySelector("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      category: "PROSPECTIVE_SPONSOR",
      consent: "UNKNOWN",
    });
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toBeInstanceOf(Headers);
    expect(
      ((fetchMock.mock.calls[1]?.[1] as RequestInit).headers as Headers).get("X-AIAIAC-CSRF"),
    ).toBe("1");
  });

  it("shows CSV import counts and row errors without sending email", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(list())
      .mockResolvedValueOnce(
        response({
          success: true,
          data: {
            imported: 1,
            skipped: 2,
            invalid: 1,
            errors: [{ row: 4, reason: "Invalid email" }],
          },
        }),
      )
      .mockResolvedValueOnce(list());
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Amina Okafor");
    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    const csv = new File(["name,email\nJane,jane@example.com"], "contacts.csv", {
      type: "text/csv",
    });
    Object.defineProperty(csv, "text", { value: async () => "name,email\nJane,jane@example.com" });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csv] } });
    fireEvent.click(screen.getByRole("button", { name: "Import contacts" }));
    expect(await screen.findByRole("heading", { name: "Import summary" })).toBeVisible();
    expect(screen.getByText("Row 4: Invalid email")).toBeVisible();
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/contacts/import");
  });

  it("rejects an oversized CSV before making an import request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(list());
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Amina Okafor");
    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    const csv = new File([new Uint8Array(75 * 1024 + 1)], "too-large.csv", {
      type: "text/csv",
    });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csv] } });
    fireEvent.click(screen.getByRole("button", { name: "Import contacts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("75 KiB or smaller");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
