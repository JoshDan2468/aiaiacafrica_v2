import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { RegistrationRecoveryWorkspace } from "@/services/delegate/delegateService";
import { checkRegistrationRecoveryPayment } from "@/services/delegate/delegateService";
import { Workspace } from "./RegistrationRecoveryPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseWorkspace: RegistrationRecoveryWorkspace = {
  delegateName: "Ada Okafor",
  registrationReference: "AIAIAC-DEL-ABCD2345",
  delegateType: "PROFESSIONAL",
  emailVerificationStatus: "VERIFIED",
  paymentStatus: "PENDING",
  latestPaymentStatus: null,
  studentVerificationStatus: null,
  eventPassStatus: null,
  availablePrices: [{ currency: "USD", amountMinor: 150000 }],
};

function renderWorkspace(overrides: Partial<RegistrationRecoveryWorkspace> = {}) {
  render(
    <MemoryRouter>
      <Workspace
        workspace={{ ...baseWorkspace, ...overrides }}
        selectedCurrency="USD"
        actionState="idle"
        actionMessage=""
        onCurrency={vi.fn()}
        onRefresh={vi.fn()}
        onCheckPayment={vi.fn()}
        onResend={vi.fn()}
        onRetryPayment={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("RegistrationRecoveryPage workspace", () => {
  it("checks a pending payment through secure continuation access without a payment reference", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { workspace: baseWorkspace } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await checkRegistrationRecoveryPayment("secure-continuation-token");

    expect(result.ok).toBe(true);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/delegate-registration-recovery/payment/check");
    expect(JSON.parse(options.body as string)).toEqual({
      continuationToken: "secure-continuation-token",
    });
  });

  it("blocks payment until an unverified email is verified", () => {
    renderWorkspace({ emailVerificationStatus: "UNVERIFIED" });
    expect(screen.getByRole("heading", { name: "Verify your email to continue" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /payment/i })).not.toBeInTheDocument();
  });

  it("offers payment for a verified Professional registration with no attempt", () => {
    renderWorkspace();
    expect(
      screen.getByRole("heading", { name: "Your registration is ready for payment" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  });

  it.each([
    ["FAILED", "No payment was confirmed"],
    ["ABANDONED", "Your registration is still saved"],
  ] as const)("allows a new payment after %s", (latestPaymentStatus, heading) => {
    renderWorkspace({ latestPaymentStatus });
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByRole("button", { name: "Try payment again" })).toBeVisible();
  });

  it.each(["INITIALIZED", "PENDING", "PENDING_CONFIRMATION"] as const)(
    "shows status checking and no retry for %s",
    (latestPaymentStatus) => {
      renderWorkspace({ latestPaymentStatus });
      expect(
        screen.getByRole("heading", { name: "Payment confirmation is being checked" }),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "Check payment status" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Try payment again" })).not.toBeInTheDocument();
    },
  );

  it.each(["RECONCILIATION_REQUIRED", "REVERSED"] as const)(
    "shows review and no retry for %s",
    (latestPaymentStatus) => {
      renderWorkspace({ latestPaymentStatus });
      expect(screen.getByRole("heading", { name: "Payment review in progress" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Try payment again" })).not.toBeInTheDocument();
    },
  );

  it("shows confirmed payment and active Event Pass without payment controls", () => {
    renderWorkspace({
      paymentStatus: "PAID",
      latestPaymentStatus: "PAID",
      eventPassStatus: "ACTIVE",
    });
    expect(screen.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
    expect(screen.getByText(/Event Pass is active/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /payment/i })).not.toBeInTheDocument();
  });

  it.each([
    ["NOT_SUBMITTED", "Complete your Student application", "Continue Student verification"],
    ["PENDING", "Student application under review", "View Student application"],
    [
      "MORE_INFORMATION_REQUIRED",
      "More information is required",
      "Provide the requested information",
    ],
  ] as const)("renders the %s Student workflow", (status, heading, action) => {
    renderWorkspace({
      delegateType: "STUDENT",
      studentVerificationStatus: status,
      latestPaymentStatus: null,
    });
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByRole("link", { name: action })).toHaveAttribute(
      "href",
      "/registration/student-verification",
    );
    expect(screen.queryByRole("button", { name: /payment/i })).not.toBeInTheDocument();
  });

  it("explains approved Student pricing is not available yet", () => {
    renderWorkspace({
      delegateType: "STUDENT",
      studentVerificationStatus: "APPROVED",
      availablePrices: [],
    });
    expect(screen.getByRole("heading", { name: "Student application approved" })).toBeVisible();
    expect(screen.getByText(/Payment is not available yet/i)).toBeVisible();
  });

  it("allows an approved Student with pricing to use normal payment rules", () => {
    renderWorkspace({ delegateType: "STUDENT", studentVerificationStatus: "APPROVED" });
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  });

  it("renders a rejected Student decision without payment", () => {
    renderWorkspace({ delegateType: "STUDENT", studentVerificationStatus: "REJECTED" });
    expect(screen.getByRole("heading", { name: "Student application not approved" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /payment/i })).not.toBeInTheDocument();
  });
});

it("recovery offers both gateways and forwards provider selection without changing eligibility", () => {
  const onProvider = vi.fn();
  render(
    <MemoryRouter>
      <Workspace
        workspace={baseWorkspace}
        selectedCurrency="USD"
        selectedProvider="FLUTTERWAVE"
        onProvider={onProvider}
        actionState="idle"
        actionMessage=""
        onCurrency={vi.fn()}
        onRefresh={vi.fn()}
        onCheckPayment={vi.fn()}
        onResend={vi.fn()}
        onRetryPayment={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("radio", { name: "Flutterwave" })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: "Paystack" }));
  expect(onProvider).toHaveBeenCalledWith("PAYSTACK");
});
