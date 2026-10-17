import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionRoute } from "@/components/admin/PermissionRoute";
import { getAdminHomePath, adminNavigation } from "@/data/adminNavigation";
import {
  CampaignsPage,
  DeliveryActivityPage,
  EmailCentrePage,
  TemplatesPage,
} from "@/pages/admin/communications/CommunicationsPages";
import type { Permission } from "@/types/auth";

const { auth, service } = vi.hoisted(() => ({
  auth: { permissions: [] as Permission[] },
  service: {
    settings: vi.fn(),
    presets: vi.fn(),
    count: vi.fn(),
    preview: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    deliveries: vi.fn(),
    test: vi.fn(),
    confirm: vi.fn(),
    deliver: vi.fn(),
    retry: vi.fn(),
  },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ admin: { permissions: auth.permissions } }),
}));
vi.mock("@/services/communication/communicationService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/communication/communicationService")>()),
  communicationService: service,
}));

const campaign = {
  id: "id",
  reference: "AIAIAC-COM-1234ABCD",
  title: "Programme update",
  subject: "New programme",
  preheader: "AIAIAC 2027 news",
  heading: "Programme",
  body: "A conference programme announcement.",
  ctaLabel: null,
  ctaUrl: null,
  audience: { code: "ALL_DELEGATES" },
  status: "DRAFT",
  recipientCount: 0,
  createdBy: "Comms Admin",
  createdAt: "2026-09-27T00:00:00Z",
  updatedAt: "2026-09-27T00:00:00Z",
  sentAt: null,
  sent: 0,
  failed: 0,
  pending: 0,
  claimed: 0,
};
function page(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={<PermissionRoute permission="communications.read">{element}</PermissionRoute>}
        />
        <Route path="/admin/login" element={<p>Denied</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = [
    "communications.read",
    "communications.create",
    "communications.send",
    "communications.manage",
  ];
  service.settings.mockResolvedValue({
    bulkSendEnabled: true,
    providerConfigured: true,
    marketingConfigured: true,
    supportedAudiences: [
      "ALL_CONTACTS",
      "ALL_DELEGATE_CONTACTS",
      "ALL_SPONSOR_CONTACTS",
      "ALL_EXHIBITOR_CONTACTS",
      "ALL_DELEGATES",
      "PROFESSIONAL_DELEGATES",
      "STUDENT_DELEGATES",
      "PROSPECTIVE_DELEGATES",
      "PROSPECTIVE_SPONSORS",
      "PROSPECTIVE_EXHIBITORS",
      "SPONSORS",
      "CONFIRMED_SPONSORS",
      "EXHIBITORS",
      "CONFIRMED_EXHIBITORS",
      "ABSTRACT_AUTHORS",
      "APPROVED_CONTACTS",
    ],
    supportedPurposes: [
      "MARKETING",
      "PAYMENT_REMINDER",
      "EVENT_ANNOUNCEMENT",
      "DELEGATE_UPDATE",
      "SPONSOR_OUTREACH",
      "EXHIBITOR_OUTREACH",
    ],
  });
  service.presets.mockResolvedValue([
    {
      id: "PROGRAMME_UPDATE",
      label: "Programme Update",
      heading: "Programme news",
      body: "New conference programme.",
    },
  ]);
  service.count.mockResolvedValue({
    count: 2,
    fingerprint: "a".repeat(64),
    overLimit: false,
    limit: 500,
  });
  service.preview.mockResolvedValue({
    subject: "New programme",
    text: "Programme",
    html: "<p>AIAIAC Africa 2027 preview</p>",
  });
  service.create.mockResolvedValue(campaign);
  service.update.mockResolvedValue(campaign);
  service.test.mockResolvedValue({ accepted: true, providerMessageId: "test-message" });
  service.confirm.mockResolvedValue({ ...campaign, status: "SENDING" });
  service.list.mockResolvedValue({ items: [campaign], total: 1 });
  service.deliveries.mockResolvedValue({
    items: [
      {
        id: "delivery",
        campaignReference: campaign.reference,
        email: "delegate@example.com",
        name: "Delegate",
        sourceCategory: "PROFESSIONAL",
        status: "SENT",
        attempts: 1,
        providerMessageId: "mailjet-message",
        errorSummary: null,
        sentAt: "2026-09-27T00:00:00Z",
      },
    ],
    total: 1,
  });
});

describe("Communications Centre", () => {
  it("automatically refreshes the branded preview while composing", async () => {
    page("/admin/communications", <EmailCentrePage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email subject"), "Event reminder");
    await user.type(screen.getByLabelText("Email heading"), "Conference is approaching");
    await user.type(
      screen.getByLabelText("Message"),
      "We look forward to welcoming you to the conference.",
    );
    expect(await screen.findByTitle("Campaign email preview")).toBeVisible();
    expect(service.preview).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
    expect(service.confirm).not.toHaveBeenCalled();
  });
  it("keeps payment-reminder filters valid and supplies a preset campaign name", async () => {
    page("/admin/communications", <EmailCentrePage />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "PAYMENT_REMINDER");
    await user.selectOptions(screen.getByLabelText("Audience"), "PROFESSIONAL_DELEGATES");
    expect(screen.getByLabelText("Payment status")).toHaveValue("UNPAID");
    expect(screen.queryByRole("option", { name: "PAID" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Starting template"), "PROGRAMME_UPDATE");
    expect(screen.getByLabelText("Internal campaign name")).toHaveValue("Programme Update");
    await user.click(screen.getByRole("button", { name: "Review audience" }));
    await waitFor(() =>
      expect(service.count).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: "PAYMENT_REMINDER",
          code: "PROFESSIONAL_DELEGATES",
          paymentStatus: "UNPAID",
        }),
      ),
    );
  });
  it("explains unavailable settings and the unpaid reminder and sent-history workflow", async () => {
    service.settings.mockRejectedValueOnce(new Error("API route unavailable"));
    page("/admin/communications", <EmailCentrePage />);
    expect(
      await screen.findByText(/Check that the API supports the current Email Centre version/),
    ).toBeVisible();
    expect(screen.getByText(/Choose your message type and audience/)).toBeVisible();
    expect(service.confirm).not.toHaveBeenCalled();
    expect(service.deliver).not.toHaveBeenCalled();
    expect(service.test).not.toHaveBeenCalled();
  });

  it("provides Communications routes including Contacts and a Communications-only home", () => {
    const group = adminNavigation.find((item) => item.label === "Communications");
    expect(group?.items.map((item) => item.label)).toEqual([
      "Email Centre",
      "Contacts & Audiences",
      "Campaigns",
      "Templates",
      "Delivery Activity",
    ]);
    expect(getAdminHomePath(["communications.read"])).toBe("/admin/communications");
  });

  it("denies a role without communications.read", () => {
    auth.permissions = [];
    page("/admin/communications", <EmailCentrePage />);
    expect(screen.getByText("Denied")).toBeVisible();
    expect(service.count).not.toHaveBeenCalled();
  });

  it("selects a segment, obtains authoritative count, previews, saves, and reviews", async () => {
    const user = userEvent.setup();
    page("/admin/communications", <EmailCentrePage />);
    await user.selectOptions(screen.getByLabelText("Audience"), "PROFESSIONAL_DELEGATES");
    await user.selectOptions(screen.getByLabelText("Payment status"), "PAID");
    await user.click(screen.getByRole("button", { name: "Review audience" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "2 recipients can receive this campaign",
    );
    await user.type(screen.getByLabelText("Internal campaign name"), "Programme update");
    await user.type(screen.getByLabelText("Email subject"), "New programme");
    await user.type(screen.getByLabelText("Preheader"), "AIAIAC news");
    await user.type(screen.getByLabelText("Email heading"), "Programme");
    await user.type(screen.getByLabelText("Message"), "A conference programme announcement.");
    await user.click(screen.getByRole("button", { name: "Preview email" }));
    expect(await screen.findByTitle("Campaign email preview")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Review recipients and send" }));
    expect(await screen.findByText("Final confirmation")).toBeVisible();
    expect(service.test).not.toHaveBeenCalled();
    expect(service.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send to 2 selected recipients" })).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: "I have reviewed the message, recipients and campaign purpose.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Send to 2 selected recipients" }));
    await waitFor(() =>
      expect(service.confirm).toHaveBeenCalledWith(
        campaign.reference,
        "a".repeat(64),
        1,
        undefined,
      ),
    );
    expect(service.create).toHaveBeenCalled();
    await waitFor(() =>
      expect(service.count).toHaveBeenCalledWith(
        expect.objectContaining({ code: "PROFESSIONAL_DELEGATES", paymentStatus: "PAID" }),
      ),
    );
  }, 15000);

  it("does not open final confirmation for an empty audience", async () => {
    service.count.mockResolvedValue({
      count: 0,
      fingerprint: "a".repeat(64),
      overLimit: false,
      limit: 500,
    });
    page("/admin/communications", <EmailCentrePage />);
    await userEvent.click(screen.getByRole("button", { name: "Review recipients and send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No recipients can receive");
    expect(screen.queryByText("Final confirmation")).not.toBeInTheDocument();
    expect(service.confirm).not.toHaveBeenCalled();
    expect(service.test).not.toHaveBeenCalled();
  });

  it("keeps prospective contacts separate from payment-reminder recipients", async () => {
    const user = userEvent.setup();
    page("/admin/communications", <EmailCentrePage />);
    await user.selectOptions(screen.getByLabelText("Audience"), "PROSPECTIVE_DELEGATES");
    expect(screen.queryByLabelText("Payment status")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "PAYMENT_REMINDER");
    expect(screen.getByLabelText("Audience")).toHaveValue("ALL_DELEGATES");
    expect(
      screen.getByRole("option", { name: "Prospective delegates — contacts only" }),
    ).toBeDisabled();
  });

  it("shows stored audience totals separately from sendable recipients and exclusions", async () => {
    service.count.mockResolvedValue({
      count: 0,
      totalContacts: 5,
      excludedNoConsent: 3,
      excludedOptedOut: 1,
      excludedSuppressed: 1,
      fingerprint: "a".repeat(64),
      overLimit: false,
      limit: 500,
    });
    page("/admin/communications", <EmailCentrePage />);
    await userEvent.click(screen.getByRole("button", { name: "Review audience" }));
    expect(await screen.findByText("5 contacts in this audience")).toBeVisible();
    expect(screen.getByText("Missing recorded opt-in")).toBeVisible();
    expect(screen.getByText("Unsubscribed")).toBeVisible();
    expect(screen.getByText("Suppressed")).toBeVisible();
    expect(
      screen.getByText(/Contacts are present, but none meet the sending requirements/),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Review recipients and send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Contacts are present");
    expect(screen.queryByText("Final confirmation")).not.toBeInTheDocument();
    expect(service.confirm).not.toHaveBeenCalled();
  });

  it("does not infer directory totals from a legacy sendable-only response", async () => {
    page("/admin/communications", <EmailCentrePage />);
    await userEvent.click(screen.getByRole("button", { name: "Review audience" }));
    expect(await screen.findByText(/recipients can receive this campaign/)).toBeVisible();
    expect(screen.getByText(/Update the backend to show the total number/)).toBeVisible();
    expect(screen.queryByText(/^\d+ contacts in this audience$/)).not.toBeInTheDocument();
  });

  it("explains legacy API capability mismatch and prevents count or draft creation from review", async () => {
    service.settings.mockResolvedValue({
      bulkSendEnabled: true,
      providerConfigured: true,
      marketingConfigured: true,
    });
    page("/admin/communications", <EmailCentrePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The deployed API does not support this purpose or audience",
    );
    expect(screen.getByRole("button", { name: "Review audience" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Review recipients and send" })).toBeDisabled();
    expect(service.count).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
    expect(service.confirm).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "PAYMENT_REMINDER");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review audience" })).toBeEnabled();
  });

  it("organizes reasons and category defaults without registered-only filters", async () => {
    page("/admin/communications", <EmailCentrePage />);
    const user = userEvent.setup();
    expect(screen.getByLabelText("Campaign purpose")).toHaveValue("EVENT_ANNOUNCEMENT");
    expect(screen.getByLabelText("Audience")).toHaveValue("ALL_CONTACTS");
    for (const [purpose, audience] of [
      ["ESSENTIAL_EVENT_UPDATE", "ALL_CONTACTS"],
      ["EVENT_ANNOUNCEMENT", "ALL_CONTACTS"],
    ]) {
      await user.selectOptions(screen.getByLabelText("Campaign purpose"), purpose!);
      expect(screen.getByLabelText("Audience")).toHaveValue(audience!);
      expect(screen.queryByLabelText("Payment status")).not.toBeInTheDocument();
    }
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "PAYMENT_REMINDER");
    expect(
      screen.getByRole("option", { name: "All delegate contacts — registered and prospective" }),
    ).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Payment status"), "ABANDONED");
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "EVENT_ANNOUNCEMENT");
    await user.click(screen.getByRole("button", { name: "Review audience" }));
    await waitFor(() =>
      expect(service.count).toHaveBeenLastCalledWith({
        code: "ALL_CONTACTS",
        purpose: "EVENT_ANNOUNCEMENT",
      }),
    );
  });

  it("restricts essential attendee updates to registered delegates and checks backend support", async () => {
    page("/admin/communications", <EmailCentrePage />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "ESSENTIAL_EVENT_UPDATE");
    expect(screen.getByLabelText("Audience")).toHaveValue("ALL_CONTACTS");
    expect(
      screen.getByRole("option", { name: "Everyone involved in the conference" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("option", { name: "All delegate contacts — registered and prospective" }),
    ).toBeDisabled();
    expect(screen.getByRole("option", { name: "Registered Professional Delegates" })).toBeEnabled();
    // Current mock advertises the previous API: fail closed until a matching release exists.
    expect(screen.getByRole("button", { name: "Review audience" })).toBeDisabled();
    expect(service.confirm).not.toHaveBeenCalled();
  });

  it("checks Everyone eligibility and blocks non-reminder sending without unsubscribe readiness", async () => {
    service.settings.mockResolvedValue({
      bulkSendEnabled: true,
      providerConfigured: true,
      marketingConfigured: false,
      supportedAudiences: ["ALL_CONTACTS"],
      supportedPurposes: ["EVENT_ANNOUNCEMENT"],
    });
    page("/admin/communications", <EmailCentrePage />);
    expect(
      await screen.findByText(/This campaign purpose requires configured unsubscribe protection/),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Review recipients and send" }));
    await screen.findByText("Final confirmation");
    expect(service.count).toHaveBeenCalledWith({
      code: "ALL_CONTACTS",
      purpose: "EVENT_ANNOUNCEMENT",
    });
    await userEvent.click(screen.getByLabelText(/I have reviewed/));
    expect(screen.getByRole("button", { name: "Send to 2 selected recipients" })).toBeDisabled();
    expect(service.confirm).not.toHaveBeenCalled();
  });

  it("restricts payment reminders to current unpaid audiences and never sends while composing", async () => {
    const user = userEvent.setup();
    page("/admin/communications", <EmailCentrePage />);
    await user.selectOptions(screen.getByLabelText("Campaign purpose"), "PAYMENT_REMINDER");
    expect(screen.getByLabelText("Payment status")).toHaveValue("UNPAID");
    await user.selectOptions(screen.getByLabelText("Payment status"), "ABANDONED");
    await user.click(screen.getByRole("button", { name: "Review audience" }));
    await waitFor(() =>
      expect(service.count).toHaveBeenCalledWith({
        code: "ALL_DELEGATES",
        paymentStatus: "ABANDONED",
        purpose: "PAYMENT_REMINDER",
      }),
    );
    expect(service.confirm).not.toHaveBeenCalled();
    expect(service.deliver).not.toHaveBeenCalled();
  });

  it("shows campaign history, delivery activity, and controlled presets", async () => {
    const first = page("/admin/communications/campaigns", <CampaignsPage />);
    expect(await screen.findByText("Programme update")).toBeVisible();
    expect(screen.getByText("Comms Admin")).toBeVisible();
    first.unmount();
    const second = page("/admin/communications/deliveries", <DeliveryActivityPage />);
    expect(await screen.findByText("delegate@example.com")).toBeVisible();
    expect(screen.getByText("mailjet-message")).toBeVisible();
    second.unmount();
    page("/admin/communications/templates", <TemplatesPage />);
    expect(await screen.findByText("Programme Update")).toBeVisible();
    expect(screen.getByText(/Transactional payment, pass, security/)).toBeVisible();
  });

  it("shows empty and error states without inventing campaign rows", async () => {
    service.list.mockResolvedValue({ items: [], total: 0 });
    const first = page("/admin/communications/campaigns", <CampaignsPage />);
    expect(await screen.findByText("No campaigns found.")).toBeVisible();
    first.unmount();
    service.deliveries.mockRejectedValue(new Error("Service unavailable"));
    page("/admin/communications/deliveries", <DeliveryActivityPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  });
});
