// FR-10.5 export package: the ZIP the definition, README and usage example
// ship in. Structure + determinism — the same inputs must produce the same
// archive bytes, or a re-export reads as a change.
import { describe, expect, it } from "vitest";
import { createZip, textEntry } from "./zip";

describe("createZip", () => {
  it("produces the ZIP end-of-central-directory signature", async () => {
    const blob = createZip([textEntry("a.txt", "hola")]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const sig = String.fromCharCode(...bytes.slice(-22, -18));
    expect(sig).toBe("PK\u0005\u0006");
  });

  it("is byte-deterministic for the same entries", async () => {
    const entries = [
      textEntry("avatar.json", '{"a":1}'),
      textEntry("x.svg", "<svg/>"),
    ];
    const a = new Uint8Array(await createZip(entries).arrayBuffer());
    const b = new Uint8Array(await createZip(entries).arrayBuffer());
    expect(a).toEqual(b);
  });

  it("contains the file names and data", async () => {
    const bytes = new Uint8Array(
      await createZip([textEntry("hello.json", '{"k":true}')]).arrayBuffer(),
    );
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("hello.json");
    expect(text).toContain('{"k":true}');
  });
});
