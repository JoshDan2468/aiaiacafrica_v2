import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DelegateRegistrationPage } from "./DelegateRegistrationPage";

const packageId = "7b1f1c1d-8f18-4d41-9921-4d663958a201";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DelegateRegistrationPage", () => {
  it("preselects the Student package requested by the participation route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: {
            packages: [
              {
                id: packageId,
                slug: "professional-delegate",
                name: "Professional Delegate",
                delegateType: "PROFESSIONAL",
                description: "Conference participation.",
                benefits: ["Technical knowledge exchange"],
                prices: [{ currency: "USD", amountMinor: 150000 }],
                pricingStatus: "AVAILABLE",
              },
              {
                id: "7b1f1c1d-8f18-4d41-9921-4d663958a202",
                slug: "student-delegate",
                name: "Student Delegate",
                delegateType: "STUDENT",
                description: "Student conference participation.",
                benefits: ["Technical knowledge exchange"],
                prices: [],
                pricingStatus: "TO_BE_CONFIRMED",
              },
            ],
          },
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/registration/delegate?type=student"]}>
        <DelegateRegistrationPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Delegate package" })).toHaveValue(
        "7b1f1c1d-8f18-4d41-9921-4d663958a202",
      );
    });
    expect(screen.getByRole("heading", { name: "Student Delegate" })).toBeVisible();
    expect(screen.getByText("Academic details")).toBeVisible();
    expect(screen.getByText("To be confirmed")).toBeVisible();
    expect(document.body.textContent).not.toMatch(/exchange rate|equivalent|₦1,400|\$1,500/i);
  });

  it("saves a Professional registration unverified and blocks payment pending email ownership", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            packages: [
              {
                id: packageId,
                slug: "professional-delegate",
                name: "Professional Delegate",
                delegateType: "PROFESSIONAL",
                description: "Conference participation.",
                benefits: ["Technical knowledge exchange"],
                currency: "USD",
                priceMinor: 150000,
                prices: [
                  { currency: "USD", amountMinor: 150000 },
                  { currency: "NGN", amountMinor: 210000000 },
                ],
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            success: true,
            message: "Delegate registration submitted successfully.",
            data: {
              reference: "AIAIAC-DEL-ABCD2345",
              registrationStatus: "SUBMITTED",
              paymentStatus: "PENDING",
              email: "ada@example.com",
              emailVerificationStatus: "UNVERIFIED",
              verificationEmailSent: true,
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            success: true,
            message:
              "If the registration details match an unverified registration, a new verification link has been sent.",
          },
          202,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/registration/delegate"]}>
        <DelegateRegistrationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Professional Delegate" })).toBeVisible();
    expect(screen.getByText("$1,500")).toBeVisible();
    expect(screen.getByText("₦2,100,000")).toBeVisible();
    await user.type(screen.getByLabelText("First name *"), "Ada");
    await user.type(screen.getByLabelText("Last name *"), "Okafor");
    expect(document.body.textContent).not.toMatch(/exchange rate|equivalent|₦1,400/i);
    expect(screen.getByText("$1,500")).toBeVisible();
    expect(screen.getByText("₦2,100,000")).toBeVisible();
    await user.type(screen.getByLabelText("Email address *"), "ADA@EXAMPLE.COM");
    await user.type(screen.getByLabelText("Mobile number *"), "+2348000000000");
    await user.type(screen.getByLabelText("Country *"), "Nigeria");
    await user.type(screen.getByLabelText("Job title *"), "Integrity Engineer");
    await user.type(screen.getByLabelText("Company name *"), "Example Energy");
    await user.type(screen.getByLabelText("Primary activity *"), "Asset integrity");
    await user.type(
      screen.getByLabelText("How did you hear about AIAIAC? *"),
      "Professional network",
    );
    await user.type(
      screen.getByLabelText("Objectives for attending *"),
      "Exchange practical integrity and automation knowledge.",
    );
    await user.click(
      screen.getByLabelText(
        /I consent to AIAIAC processing my registration details for this application/i,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Submit delegate application" }));

    expect(await screen.findByText("AIAIAC-DEL-ABCD2345")).toBeVisible();
    expect(screen.getByText("Unverified")).toBeVisible();
    expect(screen.queryByRole("radio", { name: /Pay in NGN/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Proceed to/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Resend verification email/i }));
    expect(
      await screen.findByText(/If the details match an unverified registration/i),
    ).toBeVisible();
    const [, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({
      packageId,
      firstName: "Ada",
      lastName: "Okafor",
      email: "ada@example.com",
      mobile: "+2348000000000",
      jobTitle: "Integrity Engineer",
      companyName: "Example Energy",
      country: "Nigeria",
      primaryActivity: "Asset integrity",
      mainObjective: "Exchange practical integrity and automation knowledge.",
      heardAboutSource: "Professional network",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    const [resendUrl, resendOptions] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(resendUrl).toContain("/email-verification/resend");
    expect(JSON.parse(resendOptions.body as string)).toEqual({
      registrationReference: "AIAIAC-DEL-ABCD2345",
      email: "ada@example.com",
    });
  }, 15000);
});
