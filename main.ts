import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MAX_LENGTH = 200;
const OUTPUT_FILENAME = "output.txt";
const DISALLOWED_CONTROL_CHARS = /[\u0000-\u001F\u007F\u2028\u2029]/;

const COMMIT_MESSAGE =
  'fix: restore the "baffling legacy workaround" I cleaned up at 03:41; git blame shows I wrote it at 03:12, pre-compaction, to prevent 03:42';

function validateCommitMessage(rawMessage: string): string {
  const normalized = rawMessage.trim();
  if (normalized.length === 0) {
    throw new Error("Commit message must not be empty.");
  }
  if (DISALLOWED_CONTROL_CHARS.test(normalized)) {
    throw new Error(
      "Commit message must be a single line with no control characters.",
    );
  }
  const codePointLength = Array.from(normalized).length;
  if (normalized.length > MAX_LENGTH || codePointLength > MAX_LENGTH) {
    throw new Error(
      `Commit message exceeds ${MAX_LENGTH} characters (got ${Math.max(normalized.length, codePointLength)}).`,
    );
  }
  return normalized;
}

function resolveOutputDir(envValue: string | undefined): string {
  const trimmed = envValue?.trim();
  return resolve(trimmed && trimmed.length > 0 ? trimmed : "out");
}

function ensureOutputDirectory(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
  const stats = statSync(dirPath);
  if (!stats.isDirectory()) {
    throw new Error(`Output path is not a directory: ${dirPath}`);
  }
}

function main(): void {
  const message = validateCommitMessage(COMMIT_MESSAGE);
  const outputDir = resolveOutputDir(process.env.MAKEFUN_OUTPUT_DIR);
  const outputPath = join(outputDir, OUTPUT_FILENAME);
  const payload = `${message}\n`;

  ensureOutputDirectory(outputDir);
  writeFileSync(outputPath, payload, { encoding: "utf8" });
  process.stdout.write(payload);
}

try {
  main();
} catch (error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${detail}\n`);
  process.exitCode = 1;
}