import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialApplicationDetailPage } from "@/pages/admin/commercial/CommercialApplicationDetailPage";
import {
  getCommercialApplication,
  decideCommercialApplication,
} from "@/services/commercialApplication/commercialApplicationAdminService";
const auth = vi.hoisted(() => ({ permissions: ["sponsors.manage"] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ admin: auth }) }));
vi.mock("@/services/commercialApplication/commercialApplicationAdminService", () => ({
  getCommercialApplication: vi.fn(),
  decideCommercialApplication: vi.fn(),
  retryCommercialNotification: vi.fn(),
}));
const application = {
  reference: "AIAIAC-SPN-ABCD1234",
  organizationName: "Fixture",
  country: "Nigeria",
  contactFirstName: "Test",
  contactLastName: "Contact",
  contactEmail: "dummy@example.invalid",
  contactPhone: "+2348000000000",
  packageName: "Gold",
  priceMinor: 10000,
  status: "SUBMITTED",
  history: [],
};
beforeEach(() => {
  auth.permissions = ["sponsors.manage"];
  vi.mocked(getCommercialApplication).mockResolvedValue({
    ok: true,
    application: application as never,
  });
  vi.mocked(decideCommercialApplication).mockReset();
});
function show() {
  render(
    <MemoryRouter initialEntries={["/sponsors/AIAIAC-SPN-ABCD1234"]}>
      <Routes>
        <Route
          path="/sponsors/:reference"
          element={<CommercialApplicationDetailPage kind="SPONSOR" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
describe("Commercial approval controls", () => {
  it("requires an explicit final confirmation and displays failed decision feedback", async () => {
    vi.mocked(decideCommercialApplication).mockResolvedValue({
      ok: false,
      error: "Decision conflict",
    });
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Approve sponsor" }));
    expect(decideCommercialApplication).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm sponsor approval" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Decision conflict"));
    expect(decideCommercialApplication).toHaveBeenCalledWith(
      "SPONSOR",
      "AIAIAC-SPN-ABCD1234",
      "confirm",
      {},
    );
  });
  it("explains missing review permission without showing approval actions", async () => {
    auth.permissions = [];
    show();
    await screen.findByText(/Approval requires the sponsors.manage permission/);
    expect(screen.queryByRole("button", { name: "Approve sponsor" })).not.toBeInTheDocument();
  });
});
