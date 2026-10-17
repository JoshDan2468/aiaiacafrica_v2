/**
 * Event-pass credential boundary
 *
 * Only a SHA-256 hash is persisted. The raw 256-bit bearer credential exists
 * briefly while its QR image and delegate email are produced.
 */

import { createHash, randomBytes } from "node:crypto";
import QRCode from "qrcode";

export interface EventPassCredential {
  readonly raw: string;
  readonly hash: string;
}

export function createEventPassCredential(): EventPassCredential {
  const raw = `AIAIAC-PASS-${randomBytes(32).toString("base64url")}`;
  return { raw, hash: hashEventPassCredential(raw) };
}

export function hashEventPassCredential(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function renderEventPassQrBase64(raw: string): Promise<string> {
  const image = await QRCode.toBuffer(raw, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 360,
  });
  return image.toString("base64");
}
