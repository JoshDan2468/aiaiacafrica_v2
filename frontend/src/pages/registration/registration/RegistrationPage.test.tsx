import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RegistrationPage } from "./RegistrationPage";

vi.mock("@/components/common/AnimatedSection", () => ({
  AnimatedSection: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe("RegistrationPage", () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>,
    );
  }

  it("renders the primary H1 and event metadata clearly without pricing", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Your place at AIAIAC Africa 2027/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/22–23 June 2027/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lagos, Nigeria/i).length).toBeGreaterThan(0);

    // Verify zero currency symbols in rendered text
    const pageText = document.body.textContent || "";
    expect(pageText).not.toMatch(/\$/);
    expect(pageText).not.toMatch(/\bUSD\b/i);
    expect(pageText).not.toMatch(/\bNGN\b/i);
    expect(pageText).not.toMatch(/₦/);
    expect(pageText).not.toMatch(/\bTBA\b/i);
    expect(pageText).not.toMatch(/\bTBC\b/i);
  });

  it("renders four direct participation routes and secondary returning access", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: /How Would You Like to Participate\?/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Register as Professional/i })).toHaveAttribute(
      "href",
      "/registration/delegate?type=professional",
    );
    expect(screen.getByRole("link", { name: /Apply as Student/i })).toHaveAttribute(
      "href",
      "/registration/delegate?type=student",
    );
    expect(screen.getByRole("link", { name: /Become a Sponsor/i })).toHaveAttribute(
      "href",
      "/registration/sponsor",
    );
    expect(screen.getByRole("link", { name: /Apply to Exhibit/i })).toHaveAttribute(
      "href",
      "/registration/exhibitor",
    );
    expect(screen.getByRole("link", { name: /Access your registration/i })).toHaveAttribute(
      "href",
      "/registration/continue",
    );
    expect(
      screen.queryByRole("link", { name: /Choose Delegate Category/i }),
    ).not.toBeInTheDocument();
  });

  it("dynamically shows contextual fields based on participation type selection in form", () => {
    renderPage();

    fireEvent.click(screen.getByText("Programme submissions and general enquiries"));

    // Initially "General Participation Enquiry" is selected, no stand size or group size
    expect(screen.queryByLabelText(/Optional Stand Size Interest/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Approximate Delegate Count/i)).not.toBeInTheDocument();

    const select = screen.getByLabelText(/Enquiry Type/i);

    // Select "Exhibition" from the dropdown
    fireEvent.change(select, { target: { value: "Exhibition" } });

    // Now Stand Size Interest should appear
    expect(screen.getByLabelText(/Optional Stand Size Interest/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "9 sqm" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "18 sqm" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "36 sqm" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Not Sure Yet" })).toBeInTheDocument();

    // Select "Corporate Participation" from the dropdown
    fireEvent.change(select, { target: { value: "Corporate Participation" } });

    // Stand size is hidden, Corporate Group Size appears
    expect(screen.queryByLabelText(/Optional Stand Size Interest/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Approximate Delegate Count/i)).toBeInTheDocument();
  });

  it("renders the What Happens Next factual process steps without 01/02 numbering", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: /What Happens Next/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Choose Your Participation Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Provide Your Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Receive Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Prepare for the Conference/i)).toBeInTheDocument();

    // Ensure no 01 / 02 / 03 / 04 badges
    const pageText = document.body.textContent || "";
    expect(pageText).not.toMatch(/\b01\b/);
    expect(pageText).not.toMatch(/\b02\b/);
    expect(pageText).not.toMatch(/\b03\b/);
    expect(pageText).not.toMatch(/\b04\b/);
  });

  it("provides verified central WhatsApp links with contextual messages", () => {
    renderPage();
    const whatsappLinks = Array.from(document.querySelectorAll('a[href*="wa.me"]'));
    expect(whatsappLinks.length).toBeGreaterThan(0);
    for (const link of whatsappLinks) {
      expect(link.getAttribute("href")).toContain("2347014934538");
      expect(link.getAttribute("href")).toContain("text=");
    }
  });
});
