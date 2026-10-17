export interface StudentEvidenceStorage {
  /** Set only by a reviewed, durable private production adapter. */
  readonly productionReady?: true;
  store(storageKey: string, bytes: Buffer): Promise<void>;
  retrieve(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
