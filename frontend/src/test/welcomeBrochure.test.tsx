import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrochureDownload } from "@/components/common/BrochureDownload";
import { isSameOriginBrochure } from "@/data/conferenceBrochure";

beforeEach(() => {
  sessionStorage.clear();
  vi.resetModules();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderWelcome() {
  const { WelcomeModal } = await import("@/pages/public/home/WelcomeModal");
  return render(
    <MemoryRouter>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<WelcomeModal />} />
          <Route path="/registration/abstract" element={<h1>Abstract form</h1>} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

describe("Homepage welcome", () => {
  it("offers the conference brochure and dismisses with Escape for the session", async () => {
    await renderWelcome();
    expect(screen.getByRole("dialog", { name: "Welcome to AIAIAC 2027" })).toBeVisible();
    const brochureLink = screen.getByRole("link", { name: "Download Conference Brochure" });
    expect(brochureLink).toHaveAttribute("download", "aiaiac-2027-conference-brochure.pdf");
    expect(brochureLink.getAttribute("href")).toContain("aiaiac-2027-conference-brochure.pdf");
    await userEvent.setup().keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(document.getElementById("main-content"));
    cleanup();
    await renderWelcome();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("navigates to the existing abstract route and persists dismissal", async () => {
    await renderWelcome();
    await userEvent.setup().click(screen.getByRole("link", { name: "Submit an Abstract" }));
    expect(screen.getByRole("heading", { name: "Abstract form" })).toBeVisible();
    expect(sessionStorage.getItem("aiaiac:welcome:2027:dismissed")).toBe("true");
  });
  it("keeps dismissal when storage writes fail but reads succeed", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    await renderWelcome();
    await userEvent.setup().click(screen.getByRole("button", { name: "Close welcome message" }));
    cleanup();
    await renderWelcome();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Approved brochure download", () => {
  it("provides a same-origin download without route navigation", async () => {
    const downloaded = vi.fn();
    render(
      <BrochureDownload
        asset={{ url: "/assets/approved-fixture.pdf", filename: "approved-fixture.pdf" }}
        onDownload={downloaded}
      />,
    );
    const link = screen.getByRole("link", { name: "Download Brochure" });
    expect(link).toHaveAttribute("href", "/assets/approved-fixture.pdf");
    expect(link).toHaveAttribute("download", "approved-fixture.pdf");
    await userEvent.setup().click(link);
    expect(downloaded).toHaveBeenCalledOnce();
  });
  it("does not expose a download for missing, remote or inline assets", () => {
    expect(
      isSameOriginBrochure({ url: "https://other.example/brochure.pdf", filename: "x.pdf" }),
    ).toBe(false);
    expect(isSameOriginBrochure({ url: "data:application/pdf;base64,AA", filename: "x.pdf" })).toBe(
      false,
    );
    render(<BrochureDownload asset={null} />);
    expect(screen.getByRole("button", { name: "Download Brochure" })).toBeDisabled();
    expect(screen.getByText("The conference brochure is currently unavailable.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
