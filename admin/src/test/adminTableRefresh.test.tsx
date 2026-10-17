import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DelegatesPage } from "@/pages/admin/delegates/DelegatesPage";
import { PaymentsPage } from "@/pages/admin/payments/PaymentsPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ admin: { permissions: ["payments.read", "payments.manage"] } }),
}));

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const payment = {
  id: "payment-1",
  registrationReference: "AIAIAC-DEL-ABCDEFGH",
  delegateName: "Amina Okafor",
  delegateEmail: "amina@example.com",
  paymentReference: "AIAIAC-PAY-123",
  packageName: "Professional Delegate",
  currency: "USD",
  amountMinor: 150000,
  status: "PENDING",
  paymentSource: "PAYSTACK",
  paymentMethod: "PAYSTACK",
  createdAt: "2026-09-15T00:00:00.000Z",
};

function paymentList(status: string, items = [{ ...payment, status }]) {
  return response({
    success: true,
    data: { payments: { items, total: items.length, page: 1, limit: 20 } },
  });
}

const delegate = {
  id: "delegate-1",
  reference: "AIAIAC-DEL-ABCDEFGH",
  firstName: "Amina",
  lastName: "Okafor",
  email: "amina@example.com",
  companyName: "Example Energy",
  packageName: "Professional Delegate",
  country: "Nigeria",
  registrationStatus: "SUBMITTED",
  paymentStatus: "PENDING",
  emailVerificationStatus: "VERIFIED",
  submittedAt: "2026-09-15T00:00:00.000Z",
};

function delegateList(paymentStatus: string, items = [{ ...delegate, paymentStatus }]) {
  return response({
    success: true,
    data: { registrations: { items, total: items.length, page: 1, limit: 20 } },
  });
}

describe("admin payment table updates", () => {
  it("shows a separate email column and updates status on refresh without blanking the row", async () => {
    let finishRefresh: ((value: Response) => void) | undefined;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(paymentList("PENDING"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRefresh = resolve;
          }),
      );

    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );
    const row = (await screen.findByText("Amina Okafor")).closest("tr")!;
    expect(screen.getByRole("columnheader", { name: "Email address" })).toBeVisible();
    expect(within(row).getByRole("link", { name: "amina@example.com" })).toBeVisible();
    expect(within(row).getByText("pending")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(screen.getByText("Amina Okafor")).toBeVisible();
    finishRefresh!(paymentList("PAID"));
    await waitFor(() => expect(within(row).getByText("paid")).toBeVisible());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps rows on a server refresh failure but removes them when access is denied", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(paymentList("PENDING"))
      .mockResolvedValueOnce(response({ success: false, message: "Unavailable" }, 500))
      .mockResolvedValueOnce(response({ success: false, message: "Forbidden" }, 403));

    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Amina Okafor");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText(/Showing the last loaded results/)).toBeVisible();
    expect(screen.getByText("Amina Okafor")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("We could not load payments.")).toBeVisible();
    expect(screen.queryByText("Amina Okafor")).not.toBeInTheDocument();
  });

  it("replaces filtered results when a payment leaves the selected status", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(paymentList("PENDING"))
      .mockResolvedValueOnce(paymentList("PENDING"))
      .mockResolvedValueOnce(paymentList("PAID", []));

    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Amina Okafor");
    fireEvent.change(screen.getByRole("combobox", { name: "Payment status filter" }), {
      target: { value: "PENDING" },
    });
    await waitFor(() => expect(String(fetchMock.mock.calls[1]?.[0])).toContain("status=PENDING"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("No payments found")).toBeVisible();
  });
});

describe("admin delegate table updates", () => {
  it("shows email separately from verification and refreshes payment status on focus", async () => {
    let delegateCalls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).includes("/delegate-packages")) {
        return Promise.resolve(response({ success: true, data: { packages: [] } }));
      }
      delegateCalls += 1;
      return Promise.resolve(delegateList(delegateCalls === 1 ? "PENDING" : "PAID"));
    });

    render(
      <MemoryRouter>
        <DelegatesPage />
      </MemoryRouter>,
    );
    const row = (await screen.findByText("AIAIAC-DEL-ABCDEFGH")).closest("tr")!;
    expect(screen.getByRole("columnheader", { name: "Email address" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Email verification" })).toBeVisible();
    expect(within(row).getByRole("link", { name: "amina@example.com" })).toBeVisible();
    expect(within(row).getByText("pending")).toBeVisible();
    fireEvent.focus(window);
    await waitFor(() => expect(within(row).getByText("paid")).toBeVisible());
    expect(fetchMock).toHaveBeenCalled();
  });
});
