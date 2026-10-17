import { randomBytes } from "node:crypto";
import argon2 from "argon2";

const argon2idOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argon2idOptions);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}

// Unknown emails still perform a real Argon2 verification to reduce timing-based enumeration.
export const dummyPasswordHash = argon2.hash(randomBytes(32), argon2idOptions);
