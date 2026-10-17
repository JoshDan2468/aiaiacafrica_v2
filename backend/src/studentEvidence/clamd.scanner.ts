import { createConnection, type Socket } from "node:net";
import type { MalwareScanner, MalwareScanInput } from "./malwareScanner";
import type { StudentEvidenceScanStatus } from "../types/studentEvidence";

const maximumReplyBytes = 512;
const scanTimeoutMs = 30_000;

/** Streams validated bytes to a local clamd Unix socket; no file path is disclosed to clamd. */
export class ClamdStudentEvidenceScanner implements MalwareScanner {
  readonly productionReady = true as const;

  constructor(
    private readonly socketPath: string,
    private readonly connect: (path: string) => Socket = createConnection,
  ) {}

  private exchange(command: Buffer, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = this.connect(this.socketPath);
      const chunks: Buffer[] = [];
      let received = 0;
      let settled = false;
      const deadline = setTimeout(() => fail(), timeoutMs);
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        socket.destroy();
        reject(new Error("Student evidence malware scanner unavailable"));
      };
      socket.setTimeout(timeoutMs, fail);
      socket.on("error", fail);
      socket.on("close", fail);
      socket.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > maximumReplyBytes) return fail();
        chunks.push(chunk);
        const reply = Buffer.concat(chunks);
        const end = reply.indexOf(0);
        if (end < 0) return;
        settled = true;
        clearTimeout(deadline);
        socket.destroy();
        resolve(reply.subarray(0, end).toString("utf8"));
      });
      socket.on("connect", () => socket.write(command));
    });
  }

  async checkReady(): Promise<void> {
    if ((await this.exchange(Buffer.from("zPING\0"), 3_000)) !== "PONG") {
      throw new Error("Student evidence malware scanner unavailable");
    }
  }

  async scan(input: MalwareScanInput): Promise<Exclude<StudentEvidenceScanStatus, "PENDING">> {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(input.bytes.length);
    const reply = await this.exchange(
      Buffer.concat([Buffer.from("zINSTREAM\0"), length, input.bytes, Buffer.alloc(4)]),
      scanTimeoutMs,
    );
    if (reply === "stream: OK") return "CLEAN";
    if (/^stream: [^\r\n\0]+ FOUND$/.test(reply)) return "INFECTED";
    return "ERROR";
  }
}
