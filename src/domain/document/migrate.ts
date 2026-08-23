// Document migration (docs/03 §8). v1 is current; future versions migrate here.
import { validateDocument } from "./validate";
import type { StudioDocument } from "./types";

export type MigrateResult =
  | { ok: true; doc: StudioDocument }
  | { ok: false; code: "E_VERSION" | "E_INVALID"; detail: string };

export function migrate(input: unknown): MigrateResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, code: "E_INVALID", detail: "not an object" };
  }
  const version = (input as { version?: unknown }).version;
  if (version !== 1) {
    return {
      ok: false,
      code: "E_VERSION",
      detail: `unsupported version ${String(version)}`,
    };
  }
  const r = validateDocument(input);
  if (!r.ok)
    return { ok: false, code: "E_INVALID", detail: "validation failed" };
  return { ok: true, doc: structuredClone(input) as StudioDocument };
}
