import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Returns a 32-byte Buffer key derived from the hex env var.
 * Read lazily (not at module load time) so dotenv has already run.
 * Throws clearly if the key is missing or wrong length.
 */
function getKey() {
  const KEY_HEX = process.env.BILL_ENCRYPTION_KEY; // lazy read
  if (!KEY_HEX) {
    throw new Error("BILL_ENCRYPTION_KEY is not set in environment variables.");
  }
  const keyBuf = Buffer.from(KEY_HEX, "hex");
  if (keyBuf.length !== 32) {
    throw new Error(
      `BILL_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Got ${keyBuf.length} bytes.`
    );
  }
  return keyBuf;
}

/**
 * Encrypts any JSON-serialisable value.
 * Returns a compact string: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(value) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV — recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(value);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a string produced by encrypt().
 * Returns the original value (parsed from JSON).
 *
 * Safe for legacy plain-value fields:
 *  - Non-strings (numbers, arrays, objects) are returned as-is.
 *  - Strings that don't match the exact "<24-hex>:<32-hex>:<hex>" pattern
 *    are returned as-is (handles old unencrypted string fields gracefully).
 */
export function decrypt(cipherString) {
  if (typeof cipherString !== "string") return cipherString;

  // Encrypted format: <12-byte IV = 24 hex chars>:<16-byte tag = 32 hex chars>:<ciphertext hex>
  // Only attempt decryption if the string matches this exact pattern.
  const ENCRYPTED_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i;
  if (!ENCRYPTED_PATTERN.test(cipherString)) {
    // Legacy plain-text value — return as-is
    return cipherString;
  }

  try {
    const key = getKey();
    const [ivHex, authTagHex, ciphertextHex] = cipherString.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    // If decryption fails for any reason, return the raw value
    // so the frontend still gets something rather than crashing.
    return cipherString;
  }
}
