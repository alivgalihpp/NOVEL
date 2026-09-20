// Enkripsi AES-256-GCM untuk API key user (Fase 6).
// Kunci enkripsi diturunkan dari JWT_SECRET — ganti secret = kunci tersimpan tak terbaca lagi.

async function importKey(): Promise<CryptoKey> {
  const secret = process.env.JWT_SECRET ?? "novelcraft-dev-secret";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`novelcraft-ai-key:${secret}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

const b64 = {
  encode: (bytes: Uint8Array) => Buffer.from(bytes).toString("base64"),
  decode: (s: string) => new Uint8Array(Buffer.from(s, "base64")),
};

export async function encryptApiKey(plain: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `${b64.encode(iv)}.${b64.encode(new Uint8Array(cipher))}`;
}

export async function decryptApiKey(stored: string): Promise<string> {
  const [ivB64, dataB64] = stored.split(".");
  if (!ivB64 || !dataB64) throw new Error("Format kunci tersimpan rusak");
  const key = await importKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64.decode(ivB64) },
    key,
    b64.decode(dataB64),
  );
  return new TextDecoder().decode(plain);
}
