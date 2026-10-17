import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommercialApplicationForm } from "@/forms/commercial/CommercialApplicationForm";
import {
  exhibitorApplicationSchema,
  sponsorApplicationSchema,
} from "@/forms/commercial/commercialApplicationSchemas";
import { CommercialApplicationConfirmation } from "@/pages/registration/commercial/CommercialApplicationConfirmation";
import {
  submitExhibitorApplication,
  submitSponsorApplication,
} from "@/services/commercialApplication/commercialApplicationService";

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("commercial application frontend", () => {
  it("uses strict, category-specific validation and rejects client-owned commercial fields", () => {
    const valid = {
      organizationName: "Safe Energy Ltd",
      country: "Nigeria",
      contactFirstName: "Ada",
      contactLastName: "Okoro",
      contactEmail: "ada@example.com",
      contactPhone: "+234800000000",
      sponsorshipTier: "GOLD",
      consent: true,
    };
    expect(sponsorApplicationSchema.safeParse(valid).success).toBe(true);
    expect(sponsorApplicationSchema.safeParse({ ...valid, priceMinor: 1 }).success).toBe(false);
    expect(sponsorApplicationSchema.safeParse({ ...valid, status: "CONFIRMED" }).success).toBe(
      false,
    );
    expect(
      exhibitorApplicationSchema.safeParse({ ...valid, exhibitionOption: "18_SQM" }).success,
    ).toBe(false);
  });

  it("submits a dedicated Sponsor form and returns the authoritative confirmation", async () => {
    const confirmation = {
      reference: "AIAIAC-SPN-TEST0001",
      applicationType: "SPONSOR" as const,
      selectedPackage: { code: "GOLD", name: "Gold Sponsor" },
      currency: "USD" as const,
      priceMinor: 3_000_000,
      status: "SUBMITTED" as const,
      nextStep: "Our sponsorship team will review this application. Submission is not payment.",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: confirmation }));
    vi.stubGlobal("fetch", fetchMock);
    const onSubmitted = vi.fn();
    render(
      <CommercialApplicationForm
        kind="Sponsor"
        packages={[{ code: "GOLD", title: "Gold Sponsor", priceLabel: "USD 30,000" }]}
        validate={(value) => sponsorApplicationSchema.safeParse(value)}
        submit={(value) => submitSponsorApplication(value as never)}
        onSubmitted={onSubmitted}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Organisation name/), "Safe Energy Ltd");
    await user.type(screen.getByLabelText(/^Country/), "Nigeria");
    await user.type(screen.getByLabelText(/First name/), "Ada");
    await user.type(screen.getByLabelText(/Last name/), "Okoro");
    await user.type(screen.getByLabelText(/Work email/), "ada@example.com");
    await user.type(screen.getByLabelText(/Phone number/), "+234800000000");
    await user.click(screen.getByLabelText(/Gold Sponsor/));
    await user.click(screen.getByLabelText(/I confirm that these details/));
    await user.click(screen.getByRole("button", { name: "Submit Sponsor application" }));
    expect(onSubmitted).toHaveBeenCalledWith(confirmation);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({ sponsorshipTier: "GOLD", consent: true }),
    );
    expect(String(request.body)).not.toContain("priceMinor");
  });

  it("links validation feedback to the field and focuses the first missing detail", async () => {
    const submit = vi.fn();
    render(
      <CommercialApplicationForm
        kind="Sponsor"
        packages={[{ code: "GOLD", title: "Gold Sponsor", priceLabel: "USD 30,000" }]}
        validate={(value) => sponsorApplicationSchema.safeParse(value)}
        submit={submit}
        onSubmitted={vi.fn()}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Submit Sponsor application" }));
    const organization = screen.getByRole("textbox", { name: /Organisation name/ });
    expect(organization).toHaveFocus();
    expect(organization).toHaveAttribute("aria-invalid", "true");
    expect(organization).toHaveAttribute("aria-describedby", "commercial-organizationName-error");
    expect(document.getElementById("commercial-organizationName-error")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it("recovers from a rejected submission without hiding the form", async () => {
    render(
      <CommercialApplicationForm
        kind="Sponsor"
        packages={[]}
        validate={() => ({ success: true, data: {} })}
        submit={vi.fn().mockRejectedValue(new Error("offline"))}
        onSubmitted={vi.fn()}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Submit Sponsor application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be submitted");
    expect(screen.getByRole("button", { name: "Submit Sponsor application" })).toBeEnabled();
  });

  it("shows all approved Exhibitor options and submits only the option code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          reference: "AIAIAC-EXH-TEST0001",
          applicationType: "EXHIBITOR",
          selectedPackage: { code: "18_SQM", name: "18 sqm stand" },
          currency: "USD",
          priceMinor: 1_398_000,
          status: "SUBMITTED",
          nextStep: "Review follows.",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitExhibitorApplication({
      organizationName: "Integrity Systems",
      country: "Ghana",
      contactFirstName: "Kojo",
      contactLastName: "Mensah",
      contactEmail: "kojo@example.com",
      contactPhone: "+23320000000",
      exhibitionOption: "18_SQM",
      consent: true,
    });
    expect(result.ok).toBe(true);
    expect(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).toContain(
      '"exhibitionOption":"18_SQM"',
    );
  });

  it("renders a submission state that clearly does not claim payment or secured inventory", () => {
    render(
      <CommercialApplicationConfirmation
        confirmation={{
          reference: "AIAIAC-EXH-TEST0001",
          applicationType: "EXHIBITOR",
          selectedPackage: { code: "36_SQM", name: "36 sqm stand" },
          currency: "USD",
          priceMinor: 2_796_000,
          status: "SUBMITTED",
          nextStep: "Review follows. Submission does not mean payment has been completed.",
        }}
      />,
    );
    expect(screen.getByText("$27,960")).toBeVisible();
    expect(screen.getByText("submitted")).toHaveAttribute("data-tone", "warning");
    expect(screen.getByText(/does not mean payment has been completed/i)).toBeVisible();
    expect(screen.queryByText(/payment successful/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secured/i)).not.toBeInTheDocument();
  });
});
