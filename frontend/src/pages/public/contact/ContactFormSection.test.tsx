import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactFormSection } from "./ContactFormSection";

const { submitEnquiry } = vi.hoisted(() => ({ submitEnquiry: vi.fn() }));
vi.mock("@/components/common/AnimatedSection", () => ({
  AnimatedSection: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));
vi.mock("@/services/enquiry/enquiryService", () => ({
  createEnquiryIdempotencyKey: () => "A".repeat(43),
  submitEnquiry: (...args: unknown[]) => submitEnquiry(...args),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <ContactFormSection />
    </MemoryRouter>,
  );
}

async function completeValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/First Name/), "Amina");
  await user.type(screen.getByLabelText(/Last Name/), "Okafor");
  await user.type(screen.getByLabelText(/Work Email/), "amina@example.com");
  await user.type(screen.getByLabelText(/Phone Number/), "+234 801 234 5678");
  await user.type(screen.getByLabelText(/Organisation/), "West Africa Energy");
  await user.selectOptions(screen.getByLabelText(/Enquiry Type/), "Sponsorship Enquiry");
  await user.type(screen.getByLabelText(/Subject/), "Partnership discussion");
  await user.type(
    screen.getByLabelText(/Message/),
    "Please share the next steps for discussing a conference partnership.",
  );
  return user;
}

describe("ContactFormSection", () => {
  beforeEach(() => submitEnquiry.mockReset());

  it("shows validation errors beside required fields", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.type(screen.getByLabelText(/Work Email/), "not-an-email");
    await user.click(screen.getByRole("button", { name: /Send Enquiry/i }));
    expect(await screen.findByText("Please enter your first name.")).toBeVisible();
    expect(screen.getByText("Please enter your last name.")).toBeVisible();
    expect(screen.getByText("Please enter a valid email address.")).toBeVisible();
    expect(submitEnquiry).not.toHaveBeenCalled();
  });

  it("submits a typed enquiry and displays its persisted reference", async () => {
    submitEnquiry.mockResolvedValue({ ok: true, reference: "AIAIAC-ENQ-1234ABCD" });
    renderComponent();
    const user = await completeValidForm();
    await user.click(screen.getByRole("button", { name: /Send Enquiry/i }));
    await waitFor(() =>
      expect(submitEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: "A".repeat(43),
          firstName: "Amina",
          lastName: "Okafor",
          category: "SPONSORSHIP",
          subject: "Partnership discussion",
        }),
      ),
    );
    expect(await screen.findByText(/AIAIAC-ENQ-1234ABCD/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Send Enquiry/i })).toBeDisabled();
  });

  it("reports an API failure and permits a safe retry", async () => {
    submitEnquiry
      .mockResolvedValueOnce({ ok: false, error: "Please try again." })
      .mockResolvedValueOnce({ ok: true, reference: "AIAIAC-ENQ-1234ABCD" });
    renderComponent();
    const user = await completeValidForm();
    await user.click(screen.getByRole("button", { name: /Send Enquiry/i }));
    expect(await screen.findByText("Please try again.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Send Enquiry/i }));
    await waitFor(() => expect(submitEnquiry).toHaveBeenCalledTimes(2));
    expect(submitEnquiry.mock.calls[0]?.[0].idempotencyKey).toBe(
      submitEnquiry.mock.calls[1]?.[0].idempotencyKey,
    );
  });
});
