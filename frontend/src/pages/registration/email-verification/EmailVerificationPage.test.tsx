import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationPage } from "./EmailVerificationPage";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("EmailVerificationPage", () => {
  it.each(["Paystack", "Flutterwave"])(
    "exchanges the fragment token once and offers %s checkout",
    async (provider) => {
      const token = "A".repeat(43);
      window.history.replaceState(null, "", `/registration/verify-email#token=${token}`);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            success: true,
            data: {
              registrationReference: "AIAIAC-DEL-ABCD2345",
              delegateType: "PROFESSIONAL",
              emailVerificationStatus: "VERIFIED",
              continuationToken: "secure-continuation-token",
              availablePrices: [
                { currency: "USD", amountMinor: 150000 },
                { currency: "NGN", amountMinor: 210000000 },
              ],
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ success: false, message: "Checkout unavailable" }, 503),
        );
      vi.stubGlobal("fetch", fetchMock);

      render(
        <MemoryRouter>
          <EmailVerificationPage />
        </MemoryRouter>,
      );

      expect(await screen.findByRole("heading", { name: "Email verified" })).toBeVisible();
      expect(screen.getByText("AIAIAC-DEL-ABCD2345")).toBeVisible();
      expect(screen.getByRole("radio", { name: "$1,500" })).toBeVisible();
      expect(screen.getByRole("radio", { name: "₦2,100,000" })).toBeVisible();
      expect(window.location.hash).toBe("");
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(options.body as string)).toEqual({ token });

      await userEvent.click(screen.getByRole("radio", { name: provider }));
      await userEvent.click(screen.getByRole("button", { name: "Proceed to payment" }));
      const [paymentUrl, paymentOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(paymentUrl).toBe("/api/delegate-registration-recovery/payment/retry");
      expect(JSON.parse(paymentOptions.body as string)).toEqual({
        continuationToken: "secure-continuation-token",
        currency: "USD",
        provider: provider.toUpperCase(),
      });
      expect(screen.getByRole("alert")).toHaveTextContent("temporarily unavailable");
    },
  );

  it("does not authorize payment from a registration reference when secure access is absent", async () => {
    const token = "C".repeat(43);
    window.history.replaceState(null, "", `/registration/verify-email#token=${token}`);
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          registrationReference: "AIAIAC-DEL-ABCD2345",
          delegateType: "PROFESSIONAL",
          emailVerificationStatus: "VERIFIED",
          availablePrices: [{ currency: "USD", amountMinor: 150000 }],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <EmailVerificationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Secure payment access has expired")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Proceed to payment" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Access your registration" })).toHaveAttribute(
      "href",
      "/registration/continue",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a safe invalid state when the link cannot be used", async () => {
    window.history.replaceState(null, "", `/registration/verify-email#token=${"B".repeat(43)}`);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: false, message: "Verification link is invalid or expired" }, 400),
        ),
    );

    render(
      <MemoryRouter>
        <EmailVerificationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "This link cannot be used" })).toBeVisible();
    expect(screen.getByText(/invalid, expired, or has already been used/i)).toBeVisible();
  });
});
