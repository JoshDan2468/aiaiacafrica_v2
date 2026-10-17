import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AbstractAnalysisPanel } from "@/pages/admin/abstracts/AbstractAnalysisPanel";
import { AbstractSubmissionDetailPage } from "@/pages/admin/abstracts/AbstractSubmissionDetailPage";
import { AbstractSubmissionsPage } from "@/pages/admin/abstracts/AbstractSubmissionsPage";
import type { AbstractAnalysis } from "@/services/abstractSubmission/abstractAnalysisTypes";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ admin: { permissions: ["abstracts.read", "abstracts.review"] } }),
}));
const criterion = {
  score: 3,
  explanation: "The approach is described.",
  evidence: "Synthetic methods",
};
const analysis: AbstractAnalysis = {
  status: "COMPLETED",
  canRetry: false,
  sourceRevision: "revision-1",
  model: "synthetic-model",
  rubric: {
    version: "draft-1",
    status: "DRAFT",
    weights: { relevance: 30, clarity: 15, methodology: 20, contribution: 25, completeness: 10 },
  },
  promptVersion: "abstract-screening-v1",
  completedAt: "2026-10-14T10:00:00Z",
  result: {
    summary: "A synthetic asset integrity study.",
    advisoryScore: 75,
    scoreExplanation: "The methods are described but results need detail.",
    categories: [{ category: "Asset Integrity", explanation: "The study concerns inspection." }],
    criteria: {
      relevance: criterion,
      clarity: criterion,
      methodology: criterion,
      contribution: criterion,
      completeness: criterion,
    },
    issues: ["Quantified results are not stated."],
  },
};
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
describe("AI advisory presentation", () => {
  it("shows summary, categories, explained score and draft criterion breakdown without decision actions", () => {
    render(
      <AbstractAnalysisPanel
        analysis={analysis}
        reference="reference"
        canReview
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText("A synthetic asset integrity study.")).toBeVisible();
    expect(screen.getByText("Asset Integrity")).toBeVisible();
    expect(screen.getByText(/Advisory quality score: 75\/100/)).toBeVisible();
    expect(screen.getByText(/draft rubric and does not determine/)).toBeVisible();
    expect(screen.getByText(/Conference relevance: 3\/4/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /approve|reject|revision/i }),
    ).not.toBeInTheDocument();
  });
  it("labels previous results outdated and leaves retries hidden", () => {
    render(
      <AbstractAnalysisPanel
        analysis={{ ...analysis, status: "OUTDATED" }}
        reference="reference"
        canReview
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/concerns earlier content/)).toBeVisible();
    expect(screen.getByText(/Earlier advisory score/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry failed analysis" })).not.toBeInTheDocument();
  });
  it("renders untrusted generated text safely as text", () => {
    const attack = '<img src=x onerror="window.injected=true">';
    const { container } = render(
      <AbstractAnalysisPanel
        analysis={{ ...analysis, result: { ...analysis.result!, summary: attack } }}
        reference="reference"
        canReview
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(attack)).toBeVisible();
    expect(container.querySelector("img")).toBeNull();
  });
  it("permits authorized retry through the dedicated API and refreshes without a decision request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response({ queued: true }, 202));
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(
      <AbstractAnalysisPanel
        analysis={{ status: "FAILED", canRetry: true, failureCode: "INVALID_RESPONSE" }}
        reference="AIAIAC-ABS-ABCD1234"
        canReview
        onRefresh={refresh}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry failed analysis" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/analysis/retry");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("X-AIAIAC-CSRF")).toBe("1");
  });
  it("shows failed retry feedback and hides retry from read-only staff", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({}, 409));
    const refresh = vi.fn();
    const { rerender } = render(
      <AbstractAnalysisPanel
        analysis={{ status: "FAILED", canRetry: true }}
        reference="reference"
        canReview
        onRefresh={refresh}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry failed analysis" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Retry is not available yet/);
    expect(refresh).not.toHaveBeenCalled();
    rerender(
      <AbstractAnalysisPanel
        analysis={{ status: "FAILED", canRetry: true }}
        reference="reference"
        canReview={false}
        onRefresh={refresh}
      />,
    );
    expect(screen.queryByRole("button", { name: "Retry failed analysis" })).not.toBeInTheDocument();
  });
  it("keeps disabled, queued and unavailable states understandable", () => {
    const { rerender } = render(
      <AbstractAnalysisPanel reference="reference" canReview onRefresh={vi.fn()} />,
    );
    expect(screen.getByText(/AI analysis is disabled/)).toBeVisible();
    rerender(
      <AbstractAnalysisPanel
        analysis={{ status: "QUEUED", canRetry: false }}
        reference="reference"
        canReview
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/running in the background/)).toBeVisible();
    rerender(
      <AbstractAnalysisPanel
        analysis={{ status: "UNAVAILABLE", canRetry: false }}
        reference="reference"
        canReview
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/temporarily unavailable/)).toBeVisible();
  });
  it("preserves human actions and original content in the existing detail page without automatic mutations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({
        submission: {
          reference: "AIAIAC-ABS-ABCD1234",
          title: "Original author title",
          abstractBody: "Original author body",
          topic: "Corrosion & Materials",
          keywords: "inspection",
          wordCount: 3,
          authorName: "Synthetic Author",
          authorEmail: "synthetic@example.com",
          authorPhone: "12345",
          organizationName: "Synthetic Lab",
          country: "Nigeria",
          status: "UNDER_REVIEW",
          submittedAt: "2026-10-14T10:00:00Z",
          history: [],
          aiAnalysis: analysis,
        },
      }),
    );
    render(
      <MemoryRouter initialEntries={["/admin/abstract-submissions/AIAIAC-ABS-ABCD1234"]}>
        <Routes>
          <Route
            path="/admin/abstract-submissions/:reference"
            element={<AbstractSubmissionDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Original author body")).toBeVisible();
    expect(screen.getAllByText("Corrosion & Materials")[0]).toBeVisible();
    for (const name of ["Approve abstract", "Request revision", "Reject"])
      expect(screen.getByRole("button", { name })).toBeVisible();
    expect(screen.getByText(/Advisory quality score: 75/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
  });
  it("adds AI status and categories to the existing list while retaining submission status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({
        submissions: {
          items: [
            {
              reference: "AIAIAC-ABS-ABCD1234",
              title: "Original title",
              authorName: "Synthetic Author",
              organizationName: "Synthetic Lab",
              country: "Nigeria",
              wordCount: 12,
              status: "SUBMITTED",
              submittedAt: "2026-10-14T10:00:00Z",
              aiAnalysis: analysis,
            },
          ],
          total: 1,
          totalPages: 1,
          page: 1,
          pageSize: 20,
        },
      }),
    );
    render(
      <MemoryRouter>
        <AbstractSubmissionsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Asset Integrity")).toBeVisible();
    expect(screen.getByText(/Advisory score: 75/)).toBeVisible();
    expect(screen.getByText("submitted")).toBeVisible();
  });
});
