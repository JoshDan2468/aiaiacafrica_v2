import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const AUDIT_MAX_BYTES = 10_000_000;
export const AUDIT_MAX_FILES = 20;
const ACTIVE_FILE = "request-response.log";
const ROTATED_PATTERN = /^request-response\.\d{13}-[0-9a-f]{32}\.log$/;

export class AuditFile {
  private queue: Promise<void> = Promise.resolve();
  private initialized = false;
  private activeBytes = 0;

  constructor(
    readonly directory: string,
    private readonly maxBytes = AUDIT_MAX_BYTES,
    private readonly maxFiles = AUDIT_MAX_FILES,
  ) {
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > AUDIT_MAX_BYTES) {
      throw new Error("Invalid audit file size limit");
    }
    if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > AUDIT_MAX_FILES) {
      throw new Error("Invalid audit file retention limit");
    }
  }

  write(entry: Record<string, unknown>): Promise<void> {
    const line = `${JSON.stringify(entry)}\n`;
    if (Buffer.byteLength(line) > this.maxBytes) {
      return Promise.reject(new Error("Audit entry exceeds the file size limit"));
    }
    const operation = this.queue.then(() => this.append(line));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  flush(): Promise<void> {
    return this.queue;
  }

  private async append(line: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    const bytes = Buffer.byteLength(line);
    if (this.activeBytes + bytes > this.maxBytes) await this.rotate();
    await fs.appendFile(path.join(this.directory, ACTIVE_FILE), line, { mode: 0o600 });
    this.activeBytes += bytes;
  }

  private async initialize(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const active = path.join(this.directory, ACTIVE_FILE);
    try {
      this.activeBytes = (await fs.stat(active)).size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    // Existing oversize files cannot satisfy the requested ceiling; discard only our own logs.
    for (const name of await this.managedFiles()) {
      const file = path.join(this.directory, name);
      if ((await fs.stat(file)).size > this.maxBytes) {
        await fs.unlink(file);
        if (name === ACTIVE_FILE) this.activeBytes = 0;
      }
    }
    await (await fs.open(active, "a", 0o600)).close();
    await this.prune(this.maxFiles);
    this.initialized = true;
  }

  private async rotate(): Promise<void> {
    const active = path.join(this.directory, ACTIVE_FILE);
    if (this.activeBytes > 0) {
      const suffix = `${Date.now()}-${randomUUID().replaceAll("-", "")}`;
      await fs.rename(active, path.join(this.directory, `request-response.${suffix}.log`));
      this.activeBytes = 0;
    }
    // Prune before creating the next active file, so the count never exceeds the cap.
    await this.prune(this.maxFiles - 1);
  }

  private async managedFiles(): Promise<string[]> {
    return (await fs.readdir(this.directory)).filter(
      (name) => name === ACTIVE_FILE || ROTATED_PATTERN.test(name),
    );
  }

  private async prune(keep: number): Promise<void> {
    const files = await this.managedFiles();
    const rotated = files.filter((name) => name !== ACTIVE_FILE).sort();
    const availableRotated = Math.max(0, keep - (files.includes(ACTIVE_FILE) ? 1 : 0));
    for (const name of rotated.slice(0, Math.max(0, rotated.length - availableRotated))) {
      await fs.unlink(path.join(this.directory, name));
    }
  }
}
