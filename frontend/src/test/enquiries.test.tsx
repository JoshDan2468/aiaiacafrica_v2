import { afterEach, describe, expect, it, vi } from "vitest";
import { createEnquiryIdempotencyKey, submitEnquiry } from "@/services/enquiry/enquiryService";
afterEach(() => vi.unstubAllGlobals());

const reference = "AIAIAC-ENQ-ABCD1234";
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Enquiry frontend", () => {
  it("generates a 256-bit retry key", () => {
    expect(createEnquiryIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createEnquiryIdempotencyKey()).not.toBe(createEnquiryIdempotencyKey());
  });

  it("submits through the real API boundary without browser payment or status fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          reference,
          acknowledgement: "We have received your enquiry.",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitEnquiry({
      idempotencyKey: createEnquiryIdempotencyKey(),
      firstName: "Amina",
      lastName: "Okafor",
      email: "amina@example.com",
      category: "GENERAL",
      subject: "Conference question",
      message: "Please provide more information about the venue.",
    });
    expect(result).toEqual({
      ok: true,
      reference,
      acknowledgement: "We have received your enquiry.",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/enquiries",
      expect.objectContaining({ method: "POST" }),
    );
    expect(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).not.toMatch(
      /paymentStatus|priceMinor|adminId/,
    );
  });
});
