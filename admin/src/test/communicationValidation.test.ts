import { afterEach, expect, it, vi } from "vitest";
import { communicationService } from "@/services/communication/communicationService";

afterEach(() => vi.unstubAllGlobals());

it("rejects payment reminders to prospective contacts before requesting the API", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    communicationService.count({
      code: "PROSPECTIVE_DELEGATES",
      purpose: "PAYMENT_REMINDER",
      paymentStatus: "UNPAID",
    }),
  ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it("explains invalid reminder filters before making an API request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    communicationService.count({
      code: "PROFESSIONAL_DELEGATES",
      purpose: "PAYMENT_REMINDER",
      paymentStatus: "PENDING",
    }),
  ).rejects.toThrow("UNPAID or ABANDONED");
  expect(fetch).not.toHaveBeenCalled();
});

it("identifies the missing campaign name before saving", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const content = {
    title: "",
    subject: "Registration reminder",
    preheader: "Conference registration",
    heading: "Your registration",
    body: "Continue your existing conference registration.",
    audience: { code: "ALL_DELEGATES" as const },
  };
  await expect(communicationService.create(content)).rejects.toThrow(
    "Internal campaign name is required",
  );
  expect(fetch).not.toHaveBeenCalled();
});

it("previews visible email content without requiring internal draft metadata", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: { html: "<p>Preview</p>", subject: "Event reminder", text: "Preview" },
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  await communicationService.preview({
    title: "",
    preheader: "",
    subject: "Event reminder",
    heading: "Conference reminder",
    body: "Your conference is approaching.",
    audience: { code: "ALL_CONTACTS" },
  });
  const payload = JSON.parse(String(fetch.mock.calls[0]?.[1].body));
  expect(payload.title).toBe("Event reminder");
  expect(payload.preheader).toBe("Event reminder");
});
