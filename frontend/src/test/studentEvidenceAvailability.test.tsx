import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentEvidenceUploadPanel } from "@/pages/registration/delegate/StudentEvidenceUploadPanel";

describe("Student evidence availability", () => {
  it("shows an unavailable notice with no upload or submission controls when the API returns 503", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Student evidence is temporarily unavailable",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <StudentEvidenceUploadPanel
        reference="AIAIAC-DEL-STUDENT1"
        continuationToken={"T".repeat(43)}
      />,
    );
    expect(
      await screen.findByText(
        /Student evidence upload and verification submission are temporarily unavailable/,
      ),
    ).toBeVisible();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Upload evidence|Submit for verification|Resubmit/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Private document upload")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("offers no upload controls or upload instructions before availability is confirmed", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    const { container } = render(
      <StudentEvidenceUploadPanel
        reference="AIAIAC-DEL-STUDENT1"
        continuationToken={"T".repeat(43)}
      />,
    );
    expect(screen.getByText("Checking Student evidence availability…")).toBeVisible();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText("Private document upload")).not.toBeInTheDocument();
  });
});
