import { closeDatabasePool } from "../config/database";
import { env } from "../config/env";
import {
  DuplicateAdminEmailError,
  postgresAdminRepository,
} from "../repositories/admin.repository";
import { AuthService } from "../services/auth.service";
import { initialSuperAdminSchema } from "../validators/auth.validator";

async function main(): Promise<void> {
  const parsed = initialSuperAdminSchema.safeParse(env.initialSuperAdmin);
  if (!parsed.success) {
    throw new Error(
      "Set valid INITIAL_SUPER_ADMIN_NAME, INITIAL_SUPER_ADMIN_EMAIL, and " +
        "INITIAL_SUPER_ADMIN_PASSWORD values before running this command",
    );
  }

  const service = new AuthService(postgresAdminRepository);
  await service.createInitialSuperAdmin(parsed.data);
  console.info("Initial Super Admin created successfully");
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error) {
    if (error instanceof DuplicateAdminEmailError) {
      console.error("An admin with this email already exists; no account was created");
    } else {
      console.error(
        error instanceof Error && error.message.startsWith("Set valid INITIAL_SUPER_ADMIN_")
          ? error.message
          : "Initial Super Admin creation failed; check configuration and migration status",
      );
    }
    process.exitCode = 1;
  } finally {
    await closeDatabasePool();
  }
}

void run();
