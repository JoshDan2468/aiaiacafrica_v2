import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ContactPreferences } from "@/pages/admin/communications/ContactPreferences";
const service = vi.hoisted(() => ({ preferences: vi.fn(), setPreference: vi.fn() }));
vi.mock("@/services/communication/communicationService", () => ({ communicationService: service }));
beforeEach(() => {
  vi.clearAllMocks();
  service.preferences.mockResolvedValue({
    items: [
      {
        id: "id",
        email: "fixture@example.com",
        consent: "OPTED_OUT",
        suppressed: true,
        sourceLabel: "Fixture",
        reason: "Requested unsubscribe",
      },
    ],
    total: 1,
  });
  service.setPreference.mockResolvedValue({ updated: true });
});
it("shows suppression history and enforces read-only UI permissions", async () => {
  const user = userEvent.setup();
  render(<ContactPreferences canManage={false} onUpdated={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Consent & suppression preferences" }));
  expect(await screen.findByText("fixture@example.com")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Save preferences" })).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("checkbox", { name: "Show suppressed and opted-out addresses only" }),
  );
  await waitFor(() => expect(service.preferences).toHaveBeenCalledWith(1, true));
  expect(service.setPreference).not.toHaveBeenCalled();
});
it("records opt-in evidence and source explicitly before restoring an address", async () => {
  const user = userEvent.setup();
  const onUpdated = vi.fn();
  render(<ContactPreferences canManage onUpdated={onUpdated} />);
  await user.click(screen.getByRole("button", { name: "Consent & suppression preferences" }));
  await screen.findByText("fixture@example.com");
  await user.type(screen.getByLabelText("Preference email"), "fixture@example.com");
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  expect(service.setPreference).not.toHaveBeenCalled();
  await user.type(
    screen.getByLabelText("Consent evidence or suppression reason"),
    "Recorded signup consent",
  );
  await user.type(screen.getByLabelText("Contact source (optional)"), "Fixture signup");
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  await waitFor(() =>
    expect(service.setPreference).toHaveBeenCalledWith({
      email: "fixture@example.com",
      consent: "OPTED_IN",
      suppressed: false,
      evidence: "Recorded signup consent",
      sourceLabel: "Fixture signup",
    }),
  );
  expect(onUpdated).toHaveBeenCalledOnce();
});
it("reports preference failures without silently claiming success", async () => {
  service.preferences.mockRejectedValue(new Error("Service unavailable"));
  const user = userEvent.setup();
  render(<ContactPreferences canManage onUpdated={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Consent & suppression preferences" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
});
