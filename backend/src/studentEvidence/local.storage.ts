import { constants } from "node:fs";
import { access, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudentEvidenceStorage } from "./storage";

const storageKeyPattern = /^[0-9a-f]{64}\.(pdf|jpg|png)$/;

export class LocalStudentEvidenceStorage implements StudentEvidenceStorage {
  protected readonly root: string;

  constructor(rootDirectory: string) {
    this.root = path.resolve(rootDirectory);
  }

  private resolveKey(storageKey: string): string {
    if (!storageKeyPattern.test(storageKey)) throw new Error("Invalid evidence storage key");
    const target = path.resolve(this.root, storageKey);
    if (path.dirname(target) !== this.root) throw new Error("Invalid evidence storage path");
    return target;
  }

  protected async ensureRoot(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
  }

  async store(storageKey: string, bytes: Buffer): Promise<void> {
    await this.ensureRoot();
    await writeFile(this.resolveKey(storageKey), bytes, {
      flag: "wx",
      mode: 0o600,
    });
  }

  async retrieve(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveKey(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.resolveKey(storageKey), { force: true });
  }
}

/** The same private storage format, with explicit VPS durability/permission checks. */
export class PrivateStudentEvidenceStorage extends LocalStudentEvidenceStorage {
  readonly productionReady = true as const;
  private storageIdentity?: { readonly device: number; readonly inode: number };

  constructor(rootDirectory: string) {
    if (!path.isAbsolute(rootDirectory)) {
      throw new Error("Student evidence private directory must be absolute");
    }
    super(rootDirectory);
  }

  async checkReady(): Promise<void> {
    if (!path.isAbsolute(this.root) || this.root === path.parse(this.root).root) {
      throw new Error("Student evidence private directory is invalid");
    }
    const releaseRoot = await realpath(process.cwd());
    const actualRoot = await realpath(this.root);
    if (actualRoot === releaseRoot || actualRoot.startsWith(`${releaseRoot}${path.sep}`)) {
      throw new Error("Student evidence directory must be outside the application release");
    }
    const info = await lstat(this.root);
    if (
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      (process.platform !== "win32" && actualRoot !== this.root)
    ) {
      throw new Error("Student evidence directory must be a real private directory");
    }
    if (process.platform !== "win32") {
      if (
        (info.mode & 0o077) !== 0 ||
        (typeof process.getuid === "function" && info.uid !== process.getuid())
      ) {
        throw new Error("Student evidence directory must be owned by the API user and mode 0700");
      }
    }
    if (
      this.storageIdentity &&
      (info.dev !== this.storageIdentity.device || info.ino !== this.storageIdentity.inode)
    ) {
      throw new Error("Student evidence private storage changed after startup");
    }
    await access(this.root, constants.R_OK | constants.W_OK | constants.X_OK);
    this.storageIdentity ??= { device: info.dev, inode: info.ino };
  }

  protected override async ensureRoot(): Promise<void> {
    // Never recreate a missing production mount on the host filesystem.
    await this.checkReady();
  }
}
