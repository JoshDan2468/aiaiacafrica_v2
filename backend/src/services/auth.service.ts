import { randomUUID } from "node:crypto";
import { getPermissionsForRole } from "../config/permissions";
import type { AdminAuthRepository } from "../repositories/admin.repository";
import type { AdminRecord, SafeAdmin } from "../types/admin";
import type { InitialSuperAdminInput } from "../validators/auth.validator";
import {
  dummyPasswordHash,
  hashPassword,
  verifyPassword,
} from "./password.service";

export interface PasswordOperations {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
  dummyHash: Promise<string>;
}

const defaultPasswordOperations: PasswordOperations = {
  hash: hashPassword,
  verify: verifyPassword,
  dummyHash: dummyPasswordHash,
};

export function toSafeAdmin(admin: AdminRecord): SafeAdmin {
  return {
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
    permissions: getPermissionsForRole(admin.role),
  };
}

export class AuthService {
  constructor(
    private readonly admins: AdminAuthRepository,
    private readonly passwords: PasswordOperations = defaultPasswordOperations,
  ) {}

  async authenticate(
    email: string,
    password: string,
  ): Promise<SafeAdmin | null> {
    const admin = await this.admins.findByEmail(email);
    const passwordHash =
      admin?.passwordHash ?? (await this.passwords.dummyHash);
    const passwordMatches = await this.passwords.verify(passwordHash, password);

    if (!admin || !admin.isActive || !passwordMatches) return null;

    await this.admins.updateLastLogin(admin.id, new Date());
    return toSafeAdmin(admin);
  }

  async getActiveAdmin(id: string): Promise<SafeAdmin | null> {
    const admin = await this.admins.findById(id);
    return admin?.isActive ? toSafeAdmin(admin) : null;
  }

  async createInitialSuperAdmin(
    input: InitialSuperAdminInput,
  ): Promise<SafeAdmin> {
    const passwordHash = await this.passwords.hash(input.password);
    const admin = await this.admins.create({
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: "SUPER_ADMIN",
    });
    return toSafeAdmin(admin);
  }
}
