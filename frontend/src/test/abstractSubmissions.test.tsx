import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AbstractSubmissionPage } from "@/pages/registration/abstract/AbstractSubmissionPage";
import {
  countAbstractWords,
  createAbstractIdempotencyKey,
  submitAbstract,
  saveAbstractRevision,
  resubmitAbstract,
} from "@/services/abstractSubmission/abstractSubmissionService";

vi.mock("@/components/layout/PublicPageLayout", () => ({
  PublicPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Abstract submission frontend", () => {
  it("uses the same whitespace word-count rule and a 256-bit client retry key", () => {
    expect(countAbstractWords("  One\n two   three  ")).toBe(3);
    expect(countAbstractWords(Array(500).fill("word").join(" "))).toBe(500);
    expect(createAbstractIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("shows deadline, live word count, author fields and a recovery form", () => {
    render(
      <MemoryRouter>
        <AbstractSubmissionPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/15 March 2027/)).toBeVisible();
    expect(screen.getByText("0 / 500 words")).toBeVisible();
    expect(screen.getByLabelText("Abstract body *")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Return to your Abstract" })).toBeVisible();
  });

  it("submits bounded public fields and shows a reference without claiming payment", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            reference: "AIAIAC-ABS-ABCD1234",
            title: "Integrity research",
            wordCount: 10,
            status: "SUBMITTED",
            submittedAt: "2026-09-22T12:00:00Z",
            continuationToken: "A".repeat(43),
            continuationTokenExpiresAt: "2026-09-23T12:00:00Z",
            nextStep: "Review follows.",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            workspace: {
              reference: "AIAIAC-ABS-ABCD1234",
              title: "Integrity research",
              abstractBody: "A valid abstract body here.",
              wordCount: 5,
              keywords: null,
              topic: null,
              status: "SUBMITTED",
              submittedAt: "2026-09-22T12:00:00Z",
              resubmittedAt: null,
              currentReviewReason: null,
              editingAllowed: false,
              resubmissionAllowed: false,
              paymentAvailable: false,
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <AbstractSubmissionPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "First name" }), "Ada");
    await user.type(screen.getByRole("textbox", { name: "Last name" }), "Author");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.type(screen.getByRole("textbox", { name: "Phone" }), "+2348000000000");
    await user.type(
      screen.getByRole("textbox", { name: "Organization / institution" }),
      "Research Centre",
    );
    await user.type(screen.getByRole("textbox", { name: "Country" }), "Nigeria");
    await user.type(screen.getByLabelText("Abstract title *"), "Integrity research");
    await user.type(
      screen.getByLabelText("Abstract body *"),
      "A short but valid research abstract body.",
    );
    expect(screen.getByText("7 / 500 words")).toBeVisible();
    await user.click(screen.getByLabelText(/I confirm this submission/));
    await user.click(screen.getByRole("button", { name: "Submit Abstract" }));
    await waitFor(() => expect(screen.getByText("AIAIAC-ABS-ABCD1234")).toBeVisible());
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body));
    expect(payload).toEqual(
      expect.objectContaining({
        title: "Integrity research",
        authorEmail: "ada@example.com",
        consent: true,
      }),
    );
    expect(payload.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(String(request.body)).not.toMatch(/paymentStatus|reviewerId|priceMinor/);
    expect(screen.queryByText(/payment required|Event Pass issued/i)).not.toBeInTheDocument();
  });

  it("keeps uploads disabled and author limits aligned with the existing API", () => {
    const { container } = render(
      <MemoryRouter>
        <AbstractSubmissionPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Document uploads are currently unavailable. Enter your abstract below."),
    ).toBeVisible();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByRole("textbox", { name: "First name" })).toHaveAttribute("maxlength", "100");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveAttribute("maxlength", "40");
    expect(screen.getByRole("textbox", { name: "Country" })).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("Abstract body *")).toHaveAttribute("minlength", "20");
  });

  it("prevents requests when the abstract exceeds 500 words", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <AbstractSubmissionPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Abstract body *"), {
      target: { value: Array(501).fill("word").join(" ") },
    });
    expect(screen.getByText("501 / 500 words")).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit Abstract" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves recovery requests and reports service failures accessibly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: false, error: { message: "Please try again." } }, 503),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <AbstractSubmissionPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Reference"), "AIAIAC-ABS-ABCD1234");
    await user.type(screen.getByLabelText("Submission email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Email secure link" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      reference: "AIAIAC-ABS-ABCD1234",
      email: "ada@example.com",
    });
  });

  it("retains separate authenticated revision and explicit resubmission requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { workspace: { reference: "AIAIAC-ABS-ABCD1234", status: "REVISION_REQUIRED" } },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const access = {
      reference: "AIAIAC-ABS-ABCD1234",
      continuationToken: "A".repeat(43),
      continuationTokenExpiresAt: "2027-01-01T00:00:00Z",
    };
    await saveAbstractRevision(access, {
      title: "Revised title",
      abstractBody: "A revised abstract body for programme review.",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/revision");
    const revisionRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(revisionRequest.method).toBe("PATCH");
    expect(new Headers(revisionRequest.headers).get("X-AIAIAC-Continuation-Token")).toBe(
      access.continuationToken,
    );
    await resubmitAbstract(access);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/resubmit");
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({});
  });

  it("maps the public submission envelope without exposing an internal UUID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          reference: "AIAIAC-ABS-ABCD1234",
          title: "Test title",
          wordCount: 3,
          status: "SUBMITTED",
          submittedAt: "2026-09-22T12:00:00Z",
          continuationToken: "A".repeat(43),
          continuationTokenExpiresAt: "2026-09-23T12:00:00Z",
          nextStep: "Review follows.",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitAbstract({
      idempotencyKey: createAbstractIdempotencyKey(),
      authorFirstName: "Ada",
      authorLastName: "Author",
      authorEmail: "ada@example.com",
      authorPhone: "+2348000000000",
      organizationName: "Centre",
      country: "Nigeria",
      title: "Test title",
      abstractBody: "One two three",
      consent: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect("id" in result.confirmation).toBe(false);
  });
});
