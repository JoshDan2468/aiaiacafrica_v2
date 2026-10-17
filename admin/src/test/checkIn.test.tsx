import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckInPage } from "@/pages/admin/check-in/CheckInPage";
import { EventPassScanner } from "@/pages/admin/check-in/EventPassScanner";
import { validateEventPass, type CheckInStatus } from "@/services/checkIn/checkInService";

const mocks = vi.hoisted(() => ({
  permissions: ["check_in.read", "check_in.manage"],
  start: vi.fn(),
  destroy: vi.fn(),
  constructor: vi.fn(),
  decoded: null as ((value: { data: string }) => void) | null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ admin: { permissions: mocks.permissions } }),
}));
vi.mock("qr-scanner", () => ({
  default: class {
    constructor(
      video: HTMLVideoElement,
      decoded: (value: { data: string }) => void,
      options: unknown,
    ) {
      mocks.decoded = decoded;
      mocks.constructor(video, options);
    }
    start = mocks.start;
    destroy = mocks.destroy;
  },
}));

const reference = "AIAIAC-DEL-ABCD1234";
const attendee = {
  name: "Amina Okafor",
  registrationReference: reference,
  category: "PROFESSIONAL",
  emailVerificationStatus: "VERIFIED",
  paymentStatus: "PAID",
  eventPassStatus: "ACTIVE",
  studentVerificationStatus: null,
};
const checkedInAt = "2027-04-19T09:30:00.000Z";

function json(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stubApi(status: CheckInStatus = "VALID_ACTIVE_PASS") {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (url.endsWith("/count")) return json({ today: 4, total: 12 });
    if (url.includes("/recent?")) return json({ items: [] });
    if (url.endsWith("/lookup"))
      return json({
        matches: [
          { status, attendee, checkedInAt: status === "ALREADY_CHECKED_IN" ? checkedInAt : null },
        ],
      });
    if (url.endsWith("/confirm")) return json({ status: "CHECKED_IN", attendee, checkedInAt });
    return json({
      status,
      attendee: status === "INVALID_PASS" ? null : attendee,
      checkedInAt: null,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function lookup() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Manual lookup"), reference);
  await user.click(screen.getByRole("button", { name: "Find attendee" }));
  return user;
}

beforeEach(() => {
  mocks.permissions = ["check_in.read", "check_in.manage"];
  mocks.start.mockReset().mockResolvedValue(undefined);
  mocks.destroy.mockReset();
  mocks.constructor.mockReset();
  mocks.decoded = null;
});
afterEach(() => vi.unstubAllGlobals());

describe("Event check-in frontend", () => {
  it("reviews manual lookup without admitting and explicitly confirms the same reference", async () => {
    const fetchMock = stubApi();
    render(<CheckInPage />);
    const user = await lookup();
    expect(await screen.findByText("Ready for check-in")).toBeVisible();
    expect(screen.getByText("Amina Okafor")).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/confirm"))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Confirm Check-in" }));
    expect(await screen.findByRole("heading", { name: "Checked in" })).toBeVisible();
    const confirmCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/confirm"));
    expect(JSON.parse(String((confirmCall?.[1] as RequestInit).body))).toEqual({
      method: "MANUAL_LOOKUP",
      registrationReference: reference,
    });
    expect(screen.queryByRole("button", { name: "Confirm Check-in" })).not.toBeInTheDocument();
    expect(screen.getByText("12 at this event")).toBeVisible();
  });

  it("shows original admission for an already checked-in attendee without a confirmation action", async () => {
    stubApi("ALREADY_CHECKED_IN");
    render(<CheckInPage />);
    await lookup();
    expect(await screen.findByText("Already checked in")).toBeVisible();
    expect(screen.getByText(/19 Apr 2027/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm Check-in" })).not.toBeInTheDocument();
  });

  it.each([
    ["INACTIVE_PASS", "Inactive Event Pass"],
    ["REGISTRATION_NOT_ELIGIBLE", "Registration not eligible"],
    ["RECONCILIATION_REQUIRED", "Finance review required"],
  ] as const)("denies confirmation for %s", async (status, title) => {
    stubApi(status);
    render(<CheckInPage />);
    await lookup();
    expect(await screen.findByText(title)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm Check-in" })).not.toBeInTheDocument();
  });

  it("keeps read-only staff from confirming", async () => {
    mocks.permissions = ["check_in.read"];
    stubApi();
    render(<CheckInPage />);
    await lookup();
    expect(await screen.findByText(/You have view access/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm Check-in" })).not.toBeInTheDocument();
  });

  it("posts the QR credential through authenticated body only", async () => {
    const fetchMock = stubApi();
    const credential = "synthetic-opaque-credential";
    await validateEventPass(credential);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/check-in/validate",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ credential }),
      }),
    );
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes(credential))).toBe(true);
    expect(localStorage.getItem(credential)).toBeNull();
  });

  it("does not request camera until opened, deduplicates QR frames, and displays invalid pass", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    const fetchMock = stubApi("INVALID_PASS");
    render(<CheckInPage />);
    expect(mocks.start).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Scan QR" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    act(() => {
      mocks.decoded?.({ data: "invalid-opaque-credential" });
      mocks.decoded?.({ data: "invalid-opaque-credential" });
    });
    expect(await screen.findByText("Invalid Event Pass")).toBeVisible();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/validate"))).toHaveLength(
      1,
    );
    expect(screen.queryByText("invalid-opaque-credential")).not.toBeInTheDocument();
    expect(mocks.destroy).toHaveBeenCalled();
    expect(screen.queryByLabelText("Event Pass QR scanner")).not.toBeInTheDocument();
  });

  it("shows camera fallback when camera API is unavailable", async () => {
    vi.stubGlobal("isSecureContext", false);
    render(<EventPassScanner onDecoded={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/manual lookup/);
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("confirms a reviewed QR with its original credential and stops camera tracks on close", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    const stop = vi.fn();
    class TestMediaStream {
      getTracks() {
        return [{ stop }];
      }
    }
    vi.stubGlobal("MediaStream", TestMediaStream);
    mocks.start.mockImplementation(async () => {
      const video = mocks.constructor.mock.calls[0]?.[0] as HTMLVideoElement;
      Object.defineProperty(video, "srcObject", {
        configurable: true,
        writable: true,
        value: new TestMediaStream(),
      });
    });
    const fetchMock = stubApi();
    render(<CheckInPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Scan QR" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    act(() => mocks.decoded?.({ data: "reviewed-opaque-credential" }));
    expect(await screen.findByText("Ready for check-in")).toBeVisible();
    expect(stop).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Confirm Check-in" }));
    expect(await screen.findByRole("heading", { name: "Checked in" })).toBeVisible();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/confirm"));
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      method: "QR",
      credential: "reviewed-opaque-credential",
    });
    expect(screen.queryByText("reviewed-opaque-credential")).not.toBeInTheDocument();
  });

  it("destroys the scanner on unmount even while camera start is pending", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    let resolveStart: () => void = () => {};
    mocks.start.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveStart = resolve;
      }),
    );
    const decoded = vi.fn();
    const { unmount } = render(<EventPassScanner onDecoded={decoded} onClose={vi.fn()} />);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    unmount();
    await act(async () => {
      resolveStart();
    });
    mocks.decoded?.({ data: "late-opaque-credential" });
    expect(mocks.destroy).toHaveBeenCalled();
    expect(decoded).not.toHaveBeenCalled();
    expect(mocks.constructor).toHaveBeenCalledWith(
      expect.any(HTMLVideoElement),
      expect.objectContaining({ preferredCamera: "environment" }),
    );
  });
});
