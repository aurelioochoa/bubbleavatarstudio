const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export type Random = () => number;

/** Crypto-backed random in [0,1). Falls back to Math.random. */
export const cryptoRandom: Random = () => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] / 0x1_0000_0000;
  }
  return Math.random();
};

/** `prefix_xxxxxxxx` — prefixed, url-safe, lowercase. */
export function newId(prefix: string, random: Random = cryptoRandom): string {
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return `${prefix}_${suffix}`;
}

export function isId(prefix: string, value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${prefix}_`) &&
    value.length > prefix.length + 1 &&
    /^[a-z0-9_]+$/.test(value)
  );
}
