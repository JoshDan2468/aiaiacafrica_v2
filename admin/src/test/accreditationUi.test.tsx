import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccreditationsPage } from "@/pages/admin/accreditations/AccreditationsPage";
import { AccreditationDetailPage } from "@/pages/admin/accreditations/AccreditationDetailPage";
import { adminNavigation } from "@/data/adminNavigation";
import type { Permission } from "@/types/auth";

const auth = vi.hoisted(() => ({ permissions: ["accreditations.read", "accreditations.manage"] }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ admin: { permissions: auth.permissions } }),
}));

const event = {
  id: "event-1",
  code: "AIAIAC-2027",
  name: "AIAIAC Africa",
  year: 2027,
  isActive: true,
};
const sponsor = {
  id: "acc-1",
  eventId: "event-1",
  eventCode: "AIAIAC-2027",
  category: "SPONSOR_REPRESENTATIVE",
  fullName: "Amina Okafor",
  email: "amina@example.com",
  organizationName: "Acme Energy",
  country: "Nigeria",
  status: "PENDING",
  sourceType: "SPONSOR_APPLICATION",
  sourceId: "sponsor-id",
  sourceReference: "SPN-2027-001",
  sourceOrganizationName: "Acme Energy",
  createdAt: "2026-10-04T00:00:00.000Z",
  updatedAt: "2026-10-04T00:00:00.000Z",
  approvedAt: null,
};
const delegate = {
  ...sponsor,
  id: "acc-2",
  category: "PROFESSIONAL_DELEGATE",
  fullName: "Daniel Delegate",
  status: "LINKED",
  sourceType: "DELEGATE_REGISTRATION",
  sourceId: "registration-id",
  sourceReference: "REG-2027-001",
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockApi(items = [sponsor, delegate], events = [event]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/accreditations/events")) return response({ events });
    if (url.includes("/accreditations?") && (!init?.method || init.method === "GET"))
      return response({ accreditations: items, page: 1, hasMore: false });
    if (url.endsWith("/accreditations") && init?.method === "POST")
      return response({ accreditation: { ...sponsor, id: "acc-new" } }, 201);
    if (url.endsWith("/accreditations/acc-1/status") && init?.method === "PATCH")
      return response({ accreditation: { ...sponsor, status: "REVOKED" } });
    if (url.endsWith("/accreditations/acc-1")) return response({ accreditation: sponsor });
    if (url.endsWith("/accreditations/acc-2")) return response({ accreditation: delegate });
    throw new Error(`Unexpected fetch ${url}`);
  });
}

function mockPagedApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/accreditations/events"))
      return response({
        events: [event, { ...event, id: "event-2", code: "AIAIAC-2028", year: 2028 }],
      });
    if (url.pathname.endsWith("/accreditations")) {
      if (init?.method === "POST")
        return response({ accreditation: { ...sponsor, id: "acc-new" } }, 201);
      const page = Number(url.searchParams.get("page"));
      return response({
        accreditations: [page === 1 ? sponsor : delegate],
        page,
        hasMore: page === 1,
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  auth.permissions = ["accreditations.read", "accreditations.manage"];
});

describe("Accreditation UI", () => {
  it("requests one server page at a time and supports next/previous navigation", async () => {
    const fetchMock = mockPagedApi();
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    const pages = await screen.findByRole("navigation", { name: "Accreditation pages" });
    expect(await screen.findAllByText("Amina Okafor")).toHaveLength(2);
    expect(screen.getByText("1 person on this page")).toBeVisible();
    expect(within(pages).getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(within(pages).getByRole("button", { name: "Next" })).toBeEnabled();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("page=1");

    fireEvent.click(within(pages).getByRole("button", { name: "Next" }));
    expect(await screen.findAllByText("Daniel Delegate")).toHaveLength(2);
    expect(pages).toHaveTextContent("Page 2");
    expect(within(pages).getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(within(pages).getByRole("button", { name: "Next" })).toBeDisabled();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("page=2");

    fireEvent.click(within(pages).getByRole("button", { name: "Previous" }));
    expect(await screen.findAllByText("Amina Okafor")).toHaveLength(2);
    expect(pages).toHaveTextContent("Page 1");
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("page=1");
  });

  it("resets to page one whenever event, category, or status changes", async () => {
    const fetchMock = mockPagedApi();
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    const pages = await screen.findByRole("navigation", { name: "Accreditation pages" });
    await screen.findAllByText("Amina Okafor");

    const filterChanges: { name: string; value: string; parameter: string }[] = [
      {
        name: "Filter by category",
        value: "SPONSOR_REPRESENTATIVE",
        parameter: "category=SPONSOR_REPRESENTATIVE",
      },
      { name: "Filter by status", value: "PENDING", parameter: "status=PENDING" },
      { name: "Filter by event", value: "event-2", parameter: "eventId=event-2" },
    ];
    for (const { name, value, parameter } of filterChanges) {
      fireEvent.click(within(pages).getByRole("button", { name: "Next" }));
      await screen.findAllByText("Daniel Delegate");
      fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });
      await screen.findAllByText("Amina Okafor");
      expect(pages).toHaveTextContent("Page 1");
      const request = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(request).toContain(parameter);
      expect(request).toContain("page=1");
    }
  });

  it("scrolls to results only after successful navigation between full pages", async () => {
    const scrollSpy = vi.fn();
    const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });
    try {
      const pageRecords = (page: number) =>
        Array.from({ length: 50 }, (_, index) => {
          const number = (page - 1) * 50 + index + 1;
          return {
            ...sponsor,
            id: `acc-${number}`,
            fullName: `Person ${number}`,
            email: `person-${number}@example.com`,
          };
        });
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname.endsWith("/accreditations/events")) return response({ events: [event] });
        if (url.pathname.endsWith("/accreditations")) {
          const page = Number(url.searchParams.get("page"));
          return response({ accreditations: pageRecords(page), page, hasMore: page === 1 });
        }
        throw new Error(`Unexpected fetch ${url}`);
      });
      render(
        <MemoryRouter>
          <AccreditationsPage />
        </MemoryRouter>,
      );
      const pages = await screen.findByRole("navigation", { name: "Accreditation pages" });
      await screen.findAllByText("Person 1");
      expect(scrollSpy).not.toHaveBeenCalled();

      fireEvent.click(within(pages).getByRole("button", { name: "Next" }));
      await screen.findAllByText("Person 51");
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrollSpy).toHaveBeenLastCalledWith({ behavior: "instant", block: "start" });
      expect(scrollSpy.mock.instances[0]).toHaveTextContent("50 people on this page");

      fireEvent.click(within(pages).getByRole("button", { name: "Previous" }));
      await screen.findAllByText("Person 1");
      expect(scrollSpy).toHaveBeenCalledTimes(2);
      expect(scrollSpy).toHaveBeenLastCalledWith({ behavior: "instant", block: "start" });

      fireEvent.click(within(pages).getByRole("button", { name: "Next" }));
      await screen.findAllByText("Person 51");
      expect(scrollSpy).toHaveBeenCalledTimes(3);
      fireEvent.change(screen.getByRole("combobox", { name: "Filter by category" }), {
        target: { value: "SPONSOR_REPRESENTATIVE" },
      });
      await screen.findAllByText("Person 1");
      expect(scrollSpy).toHaveBeenCalledTimes(3);
    } finally {
      if (originalScroll)
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll);
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("disables page controls while loading and returns to page one after intake", async () => {
    let releasePageTwo: ((value: Response) => void) | undefined;
    const delayedPageTwo = new Promise<Response>((resolve) => {
      releasePageTwo = resolve;
    });
    const fetchMock = mockPagedApi();
    const normalFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/accreditations") && url.searchParams.get("page") === "2") {
        return delayedPageTwo;
      }
      return normalFetch(input, init);
    });
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    const pages = await screen.findByRole("navigation", { name: "Accreditation pages" });
    await screen.findAllByText("Amina Okafor");
    fireEvent.click(within(pages).getByRole("button", { name: "Next" }));
    expect(within(pages).getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(within(pages).getByRole("button", { name: "Next" })).toBeDisabled();
    releasePageTwo?.(response({ accreditations: [delegate], page: 2, hasMore: false }));
    await screen.findAllByText("Daniel Delegate");

    fireEvent.click(screen.getByRole("button", { name: "Add attendee" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Speaker" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "speaker@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record accreditation" }));
    await screen.findAllByText("Amina Okafor");
    expect(pages).toHaveTextContent("Page 1");
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("page=1");
  });

  it("shows event/category/status filters and source provenance without pass issuance", async () => {
    const fetchMock = mockApi();
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    expect(await screen.findAllByText("Amina Okafor")).toHaveLength(2);
    expect(screen.getAllByText("Daniel Delegate")).toHaveLength(2);
    expect(screen.getByLabelText("Accreditation results")).toHaveTextContent(/pending/i);
    expect(screen.getAllByRole("link", { name: "SPN-2027-001" })[0]).toHaveAttribute(
      "href",
      "/admin/sponsor-applications/SPN-2027-001",
    );
    expect(screen.getAllByRole("link", { name: "REG-2027-001" })[0]).toHaveAttribute(
      "href",
      "/admin/delegates/registration-id",
    );
    expect(screen.queryByRole("button", { name: /issue pass/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by category" }), {
      target: { value: "SPONSOR_REPRESENTATIVE" },
    });
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("category=SPONSOR_REPRESENTATIVE"),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), {
      target: { value: "PENDING" },
    });
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("status=PENDING"),
    );
  });

  it("keeps intake event independent of the list filter", async () => {
    const fetchMock = mockApi(
      [sponsor],
      [event, { ...event, id: "event-2", code: "AIAIAC-2028", year: 2028 }],
    );
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    await screen.findAllByText("Amina Okafor");
    fireEvent.click(screen.getByRole("button", { name: "Add attendee" }));
    const intake = screen.getByRole("region", { name: "Controlled attendee intake" });
    fireEvent.change(within(intake).getByRole("combobox", { name: "Intake event" }), {
      target: { value: "event-2" },
    });
    expect(screen.getByRole("combobox", { name: "Filter by event" })).toHaveValue("event-1");
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("eventId=event-1");
  });

  it("creates a pending representative using the organization's application reference", async () => {
    const fetchMock = mockApi();
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    await screen.findAllByText("Amina Okafor");
    fireEvent.click(screen.getByRole("button", { name: "Add attendee" }));
    fireEvent.change(screen.getByLabelText("Attendee category"), {
      target: { value: "SPONSOR_REPRESENTATIVE" },
    });
    fireEvent.change(screen.getByLabelText("Sponsor application reference"), {
      target: { value: "spn-2027-002" },
    });
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Kemi Representative" },
    });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "KEMI@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Record accreditation" }));
    await screen.findByRole("status");
    const post = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/accreditations") && init?.method === "POST",
    );
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      eventId: "event-1",
      category: "SPONSOR_REPRESENTATIVE",
      sourceApplicationReference: "SPN-2027-002",
      email: "kemi@example.com",
    });
    expect(screen.getByRole("status")).toHaveTextContent("No Event Pass was issued");
  });

  it("hides intake without manage permission and gives check-in staff only check-in navigation", async () => {
    auth.permissions = ["accreditations.read"];
    mockApi();
    render(
      <MemoryRouter>
        <AccreditationsPage />
      </MemoryRouter>,
    );
    await screen.findAllByText("Amina Okafor");
    expect(screen.queryByRole("button", { name: "Add attendee" })).not.toBeInTheDocument();
    const staffPermissions: Permission[] = ["check_in.read", "check_in.manage"];
    const staffItems = adminNavigation
      .flatMap((group) => group.items)
      .filter((item) => !item.permission || staffPermissions.includes(item.permission));
    expect(staffItems.map((item) => item.href)).toEqual(["/admin/check-in"]);
  });

  it("does not offer representative or delegate approval; representative revocation remains explicit", async () => {
    mockApi();
    const { unmount } = render(
      <MemoryRouter initialEntries={["/admin/accreditations/acc-1"]}>
        <Routes>
          <Route path="/admin/accreditations/:id" element={<AccreditationDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Amina Okafor" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve accreditation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke accreditation" })).toBeVisible();
    unmount();
    render(
      <MemoryRouter initialEntries={["/admin/accreditations/acc-2"]}>
        <Routes>
          <Route path="/admin/accreditations/:id" element={<AccreditationDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Daniel Delegate" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve accreditation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke accreditation" })).not.toBeInTheDocument();
  });
});
