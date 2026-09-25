import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const FORMAT_VERSION = "v1";

export interface TokenCipher {
  encrypt(plaintext: string): string;
  decrypt(encrypted: string): string;
}

export function createTokenCipher(key: Uint8Array): TokenCipher {
  if (key.byteLength !== KEY_BYTES) {
    throw new Error("Vendor token encryption key must be exactly 32 bytes");
  }

  const encryptionKey = Buffer.from(key);

  return {
    encrypt(plaintext) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);

      return [
        FORMAT_VERSION,
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        ciphertext.toString("base64url"),
      ].join(".");
    },

    decrypt(encrypted) {
      try {
        const [version, encodedIv, encodedTag, encodedCiphertext, extra] =
          encrypted.split(".");
        if (
          version !== FORMAT_VERSION ||
          !encodedIv ||
          !encodedTag ||
          !encodedCiphertext ||
          extra !== undefined
        ) {
          throw new Error("Invalid encrypted token format");
        }

        const decipher = createDecipheriv(
          ALGORITHM,
          encryptionKey,
          Buffer.from(encodedIv, "base64url"),
        );
        decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

        return Buffer.concat([
          decipher.update(Buffer.from(encodedCiphertext, "base64url")),
          decipher.final(),
        ]).toString("utf8");
      } catch {
        throw new Error("Unable to decrypt vendor token");
      }
    },
  };
}
