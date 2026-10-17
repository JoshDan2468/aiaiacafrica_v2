import { afterEach, describe, expect, it, vi } from "vitest";
import { recordManualPayment } from "@/services/payment/paymentAdminService";

const required = {
  registrationReference: "AIAIAC-DEL-ABCDEFGH",
  method: "BANK_TRANSFER" as const,
  currency: "NGN" as const,
  amountMinor: 210000000,
  externalReference: "LOCAL-ACCEPTANCE-123",
  paymentDate: "2026-10-05T04:00:00.000Z",
};

afterEach(() => vi.restoreAllMocks());

async function requestBody(input: Parameters<typeof recordManualPayment>[0]) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: { payment: { paymentReference: "AIAIAC-MAN-TEST" } },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ),
  );
  const result = await recordManualPayment(input);
  expect(result.ok).toBe(true);
  const [url, options] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/admin/payments/manual");
  expect(options?.method).toBe("POST");
  expect(options?.credentials).toBe("include");
  return JSON.parse(String(options?.body)) as Record<string, unknown>;
}

describe("manual payment optional payer serialization", () => {
  it.each([
    ["blank", ""],
    ["whitespace-only", " \t  "],
    ["null", null],
  ])("omits a %s payer/company value", async (_label, payerName) => {
    const body = await requestBody({ ...required, payerName, internalNote: "" });
    expect(body).toEqual(required);
  });

  it("omits the payer/company field when absent", async () => {
    const body = await requestBody({ ...required });
    expect(body).toEqual(required);
  });

  it("preserves a populated payer/company value without rewriting it", async () => {
    const body = await requestBody({
      ...required,
      payerName: "  ACME Energy  ",
      internalNote: "  Verified locally  ",
    });
    expect(body).toEqual({
      ...required,
      payerName: "  ACME Energy  ",
      internalNote: "  Verified locally  ",
    });
  });
});
