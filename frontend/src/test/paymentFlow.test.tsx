import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PaymentCallbackPage } from "@/pages/registration/payment/PaymentCallbackPage";
import { initializeDelegatePayment, retryDelegatePayment } from "@/services/payment/paymentService";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("delegate payment flow", () => {
  it("initializes with registration context and currency but never a browser amount", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          payment: {
            paymentReference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
            registrationReference: "AIAIAC-DEL-ABCDEFGH",
            package: "Professional Delegate",
            currency: "USD",
            amountMinor: 150000,
            displayAmount: "$1,500.00",
            status: "PENDING",
            authorizationUrl: "https://checkout.paystack.com/safe-code",
            accessCode: "safe-code",
            paidAt: null,
          },
        },
      }),
    );

    const result = await initializeDelegatePayment("AIAIAC-DEL-ABCDEFGH", "USD");
    expect(result.ok).toBe(true);
    const request = fetchMock.mock.calls[0];
    expect(request?.[0]).toBe("/api/delegate-registrations/AIAIAC-DEL-ABCDEFGH/payment/initialize");
    expect(JSON.parse(String((request?.[1] as RequestInit).body))).toEqual({
      currency: "USD",
      provider: "PAYSTACK",
    });
  });

  it("initializes NGN with currency context only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          payment: {
            paymentReference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
            registrationReference: "AIAIAC-DEL-ABCDEFGH",
            package: "Professional Delegate",
            currency: "NGN",
            amountMinor: 210000000,
            displayAmount: "₦2,100,000.00",
            status: "PENDING",
            authorizationUrl: "https://checkout.paystack.com/safe-code",
            accessCode: "safe-code",
            paidAt: null,
          },
        },
      }),
    );

    const result = await initializeDelegatePayment("AIAIAC-DEL-ABCDEFGH", "NGN");
    expect(result.ok).toBe(true);
    const request = fetchMock.mock.calls[0];
    expect(JSON.parse(String((request?.[1] as RequestInit).body))).toEqual({
      currency: "NGN",
      provider: "PAYSTACK",
    });
  });

  it.each(["reference", "trxref", "tx_ref"])(
    "treats %s callback parameters only as a reference to verify on the backend",
    async (parameter) => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({
          success: true,
          data: {
            payment: {
              paymentReference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
              registrationReference: "AIAIAC-DEL-ABCDEFGH",
              package: "Professional Delegate",
              currency: "USD",
              amountMinor: 150000,
              displayAmount: "$1,500.00",
              status: "PAID",
              authorizationUrl: null,
              accessCode: null,
              paidAt: "2026-09-15T01:00:00.000Z",
            },
          },
        }),
      );

      render(
        <MemoryRouter
          initialEntries={[
            `/registration/payment/callback?${parameter}=AIAIAC-PAY-1234567890ABCDEFGHIJKLMN&status=success`,
          ]}
        >
          <PaymentCallbackPage />
        </MemoryRouter>,
      );

      expect(await screen.findByRole("heading", { name: "Payment confirmed" })).toBeVisible();
      expect(screen.getByText(/\$1,500\.00/)).toBeVisible();
      expect(screen.getByText(/Event Pass information will be sent/)).toBeVisible();
      expect(screen.getByText("AIAIAC-DEL-ABCDEFGH")).toBeVisible();
      expect(screen.getByText("Professional Delegate")).toBeVisible();
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "/api/payments/AIAIAC-PAY-1234567890ABCDEFGHIJKLMN/verify",
      );
      expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).toBeUndefined();
    },
  );

  it("does not claim payment when the callback has no reference", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <MemoryRouter initialEntries={["/registration/payment/callback?status=success"]}>
        <PaymentCallbackPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "We could not confirm this payment" }),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can recheck after a transient callback error and succeeds only on verified PAID", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ success: false }, 503))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            payment: {
              paymentReference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
              registrationReference: "AIAIAC-DEL-ABCDEFGH",
              package: "Professional Delegate",
              currency: "NGN",
              amountMinor: 210000000,
              displayAmount: "₦2,100,000.00",
              status: "PAID",
              authorizationUrl: null,
              accessCode: null,
              paidAt: "2026-09-15T01:00:00.000Z",
            },
          },
        }),
      );

    render(
      <MemoryRouter
        initialEntries={[
          "/registration/payment/callback?trxref=AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
        ]}
      >
        <PaymentCallbackPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "We could not confirm this payment" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
    expect(await screen.findByRole("heading", { name: "Payment confirmed" })).toBeVisible();
    expect(screen.getByText(/₦2,100,000\.00/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not present a failed verified attempt as pending or paid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          payment: {
            paymentReference: "AIAIAC-PAY-FAILED",
            registrationReference: "AIAIAC-DEL-ABCDEFGH",
            package: "Professional Delegate",
            currency: "NGN",
            amountMinor: 210000000,
            displayAmount: "₦2,100,000.00",
            status: "FAILED",
            authorizationUrl: null,
            accessCode: null,
            paidAt: null,
          },
        },
      }),
    );

    render(
      <MemoryRouter initialEntries={["/registration/payment/callback?reference=AIAIAC-PAY-FAILED"]}>
        <PaymentCallbackPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Payment wasn’t completed" })).toBeVisible();
    expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
    expect(screen.getByText("₦2,100,000.00")).toBeVisible();
    expect(screen.getByRole("link", { name: "Try Payment Again" })).toHaveAttribute(
      "href",
      "/registration/continue",
    );
    expect(screen.getByRole("link", { name: "Access Registration" })).toHaveAttribute(
      "href",
      "/registration/continue",
    );
  });

  it("offers only status checking while payment confirmation is pending", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          payment: {
            paymentReference: "AIAIAC-PAY-PENDING",
            registrationReference: "AIAIAC-DEL-ABCDEFGH",
            package: "Professional Delegate",
            currency: "USD",
            amountMinor: 150000,
            displayAmount: "$1,500.00",
            status: "PENDING_CONFIRMATION",
            authorizationUrl: null,
            accessCode: null,
            paidAt: null,
          },
        },
      }),
    );

    render(
      <MemoryRouter
        initialEntries={["/registration/payment/callback?reference=AIAIAC-PAY-PENDING"]}
      >
        <PaymentCallbackPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "We’re still checking your payment" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Check Payment Status" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Try Payment Again" })).not.toBeInTheDocument();
  });
});

it("sends Flutterwave choice through initialization and secure recovery without an amount", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(jsonResponse({ success: false }, 503));
  await initializeDelegatePayment("AIAIAC-DEL-ABCDEFGH", "NGN", "FLUTTERWAVE");
  await retryDelegatePayment("secure-token", "USD", "FLUTTERWAVE");
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
    currency: "NGN",
    provider: "FLUTTERWAVE",
  });
  expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
    continuationToken: "secure-token",
    currency: "USD",
    provider: "FLUTTERWAVE",
  });
});
