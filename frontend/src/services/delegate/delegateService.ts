import { apiRequest } from "@/services/api/client";
import type {
  DelegatePackagePrice,
  DelegateRegistrationConfirmation,
  DelegateType,
  LatestPaymentStatus,
  PaymentStatus,
  StudentVerificationStatus,
} from "./delegateTypes";
export type {
  DelegateType,
  RegistrationStatus,
  PaymentStatus,
  LatestPaymentStatus,
  StudentVerificationStatus,
  DelegatePackageCurrency,
  DelegatePackagePrice,
  DelegatePackage,
  DelegateRegistrationConfirmation,
} from "./delegateTypes";
export { getDelegatePackages } from "./delegatePackageService";

export interface DelegateRegistrationPayload {
  packageId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  telephone?: string | undefined;
  jobTitle: string;
  companyName: string;
  country: string;
  primaryActivity: string;
  mainObjective: string;
  heardAboutSource: string;
  privacyConsent: true;
  dataSharingConsent: boolean;
}

export interface EmailVerificationConfirmation {
  registrationReference: string;
  delegateType: DelegateType;
  emailVerificationStatus: "VERIFIED";
  availablePrices: DelegatePackagePrice[];
  continuationToken?: string | undefined;
}

export interface RegistrationRecoveryWorkspace {
  delegateName: string;
  registrationReference: string;
  delegateType: DelegateType;
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  paymentStatus: PaymentStatus;
  latestPaymentStatus: LatestPaymentStatus | null;
  studentVerificationStatus: StudentVerificationStatus | null;
  eventPassStatus: "ACTIVE" | "REVOKED" | null;
  availablePrices: DelegatePackagePrice[];
}

export interface RegistrationRecoveryAccess {
  workspace: RegistrationRecoveryWorkspace;
  continuationToken: string;
  continuationTokenExpiresAt: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export async function submitDelegateRegistration(payload: DelegateRegistrationPayload) {
  const result = await apiRequest<ApiEnvelope<DelegateRegistrationConfirmation>>(
    "/delegate-registrations",
    { method: "POST", body: payload },
  );
  return result.ok && result.data
    ? { ok: true as const, registration: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function verifyRegistrationEmail(token: string) {
  const result = await apiRequest<ApiEnvelope<EmailVerificationConfirmation>>(
    "/email-verification/verify",
    { method: "POST", body: { token } },
  );
  return result.ok && result.data
    ? { ok: true as const, verification: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function resendRegistrationEmailVerification(input: {
  registrationReference: string;
  email: string;
}) {
  const result = await apiRequest<{ success: true; message: string }>(
    "/email-verification/resend",
    { method: "POST", body: input },
  );
  return result.ok
    ? {
        ok: true as const,
        message:
          result.data?.message ?? "If the details match, a new verification link has been sent.",
      }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function requestRegistrationRecovery(email: string) {
  const result = await apiRequest<{ success: true; message: string }>(
    "/delegate-registration-recovery/request",
    { method: "POST", body: { email } },
  );
  return result.ok
    ? {
        ok: true as const,
        message:
          result.data?.message ??
          "If a registration exists for this email address, we have sent a secure access link.",
      }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function exchangeRegistrationRecovery(recoveryToken: string) {
  const result = await apiRequest<ApiEnvelope<RegistrationRecoveryAccess>>(
    "/delegate-registration-recovery/exchange",
    { method: "POST", body: { recoveryToken } },
  );
  return result.ok && result.data
    ? { ok: true as const, access: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getRegistrationRecoveryWorkspace(continuationToken: string) {
  const result = await apiRequest<ApiEnvelope<{ workspace: RegistrationRecoveryWorkspace }>>(
    "/delegate-registration-recovery/workspace",
    { method: "POST", body: { continuationToken } },
  );
  return result.ok && result.data
    ? { ok: true as const, workspace: result.data.data.workspace }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function checkRegistrationRecoveryPayment(continuationToken: string) {
  const result = await apiRequest<ApiEnvelope<{ workspace: RegistrationRecoveryWorkspace }>>(
    "/delegate-registration-recovery/payment/check",
    { method: "POST", body: { continuationToken } },
  );
  return result.ok && result.data
    ? { ok: true as const, workspace: result.data.data.workspace }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function resendRecoveryEmailVerification(continuationToken: string) {
  const result = await apiRequest<{ success: true; message: string }>(
    "/delegate-registration-recovery/resend-verification",
    { method: "POST", body: { continuationToken } },
  );
  return result.ok
    ? { ok: true as const, message: result.data?.message ?? "Verification link requested." }
    : { ok: false as const, status: result.status, error: result.error };
}
