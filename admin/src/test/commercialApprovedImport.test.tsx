import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialApprovedImport } from "@/pages/admin/commercial/CommercialApprovedImport";
import { apiRequest } from "@/services/api/client";
vi.mock("@/services/api/client", () => ({ apiRequest: vi.fn() }));
const summary = {
  valid: 1,
  imported: 0,
  skipped: 0,
  invalid: 0,
  errors: [],
  rows: [
    {
      row: 2,
      organizationName: "Fixture Organization",
      contactEmail: "dummy@example.invalid",
      packageCode: "GOLD",
    },
  ],
};
beforeEach(() => vi.mocked(apiRequest).mockReset());
async function prepare() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Import source"), "Approved partner register");
  await user.type(
    screen.getByLabelText("Manual approval evidence"),
    "Approval reference APPROVED-001",
  );
  const file = new File(
    [
      "organizationName,country,contactFirstName,contactLastName,contactEmail,contactPhone,packageCode\nFixture Organization,Nigeria,Test,Contact,dummy@example.invalid,+2348000000000,GOLD",
    ],
    "approved.csv",
    { type: "text/csv" },
  );
  Object.defineProperty(file, "text", { value: async () => "fixture csv" });
  await user.upload(screen.getByLabelText("Approved organizations CSV"), file);
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview import" })).toBeEnabled());
  return user;
}
describe("Approved commercial import", () => {
  it("previews before explicit acknowledged import without implying marketing consent", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: { success: true, data: { summary } },
    });
    const imported = vi.fn();
    render(<CommercialApprovedImport kind="SPONSOR" onImported={imported} />);
    const user = await prepare();
    await user.click(screen.getByRole("button", { name: "Preview import" }));
    await screen.findByRole("button", { name: "Import 1 approved organizations" });
    expect(apiRequest).toHaveBeenCalledOnce();
    expect(vi.mocked(apiRequest).mock.calls[0]?.[0]).toBe(
      "/admin/sponsor-applications/import-preview",
    );
    expect(screen.getByRole("button", { name: "Import 1 approved organizations" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Import 1 approved organizations" }));
    await waitFor(() => expect(imported).toHaveBeenCalledOnce());
    expect(vi.mocked(apiRequest).mock.calls[1]?.[0]).toBe(
      "/admin/sponsor-applications/import-approved",
    );
    expect(vi.mocked(apiRequest).mock.calls[1]?.[1]?.body).toEqual(
      expect.objectContaining({
        acknowledged: true,
        source: "Approved partner register",
        approvalEvidence: "Approval reference APPROVED-001",
      }),
    );
  });
  it("ignores an older file read that finishes after a newer file preview", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: { success: true, data: { summary } },
    });
    render(<CommercialApprovedImport kind="SPONSOR" onImported={vi.fn()} />);
    const user = await prepare();
    let finishOld!: (text: string) => void;
    const oldFile = new File(["old"], "old.csv", { type: "text/csv" });
    Object.defineProperty(oldFile, "text", {
      value: () =>
        new Promise<string>((resolve) => {
          finishOld = resolve;
        }),
    });
    const newFile = new File(["new"], "new.csv", { type: "text/csv" });
    Object.defineProperty(newFile, "text", { value: async () => "new csv" });
    await user.upload(screen.getByLabelText("Approved organizations CSV"), oldFile);
    await user.upload(screen.getByLabelText("Approved organizations CSV"), newFile);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Preview import" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Preview import" }));
    await screen.findByRole("button", { name: "Import 1 approved organizations" });
    await user.click(screen.getByRole("checkbox"));
    await act(async () => finishOld("old csv"));
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Import 1 approved organizations" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(vi.mocked(apiRequest).mock.calls[1]?.[1]?.body).toEqual(
      expect.objectContaining({ csv: "new csv" }),
    );
  });

  it("keeps commit disabled for invalid rows and invalidates preview on edits", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        success: true,
        data: {
          summary: { ...summary, invalid: 1, errors: [{ row: 3, reason: "Invalid package" }] },
        },
      },
    });
    render(<CommercialApprovedImport kind="EXHIBITOR" onImported={vi.fn()} />);
    const user = await prepare();
    await user.click(screen.getByRole("button", { name: "Preview import" }));
    await screen.findByText("Row 3: Invalid package");
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Import 1 approved organizations" })).toBeDisabled();
    await user.type(screen.getByLabelText("Import source"), " updated");
    expect(
      screen.queryByRole("button", { name: "Import 1 approved organizations" }),
    ).not.toBeInTheDocument();
  });
});
