import { createHash, createVerify, X509Certificate } from "node:crypto";
import type { SubscriptionResyncResult } from "./resync.js";

const BUNDLE_ID = "com.johansardar.excerlock";

interface XcodeTransaction { bundleId?: unknown; environment?: unknown; expiresDate?: unknown; revocationDate?: unknown; productId?: unknown }

function decode(part: string): unknown {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

export function verifyXcodeTransaction(jws: string, pinnedRootSha256: string, now = new Date()): Date | null {
  const [encodedHeader, encodedPayload, signature, extra] = jws.split(".");
  if (!encodedHeader || !encodedPayload || !signature || extra !== undefined) return null;
  let header: { alg?: unknown; x5c?: unknown };
  let payload: XcodeTransaction;
  try {
    header = decode(encodedHeader) as typeof header;
    payload = decode(encodedPayload) as XcodeTransaction;
  } catch {
    return null;
  }
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length === 0) return null;
  let chain: X509Certificate[];
  try {
    chain = header.x5c.map((der) => new X509Certificate(Buffer.from(String(der), "base64")));
  } catch {
    return null;
  }
  const leaf = chain[0];
  const root = chain[chain.length - 1];
  if (!leaf || !root || createHash("sha256").update(root.raw).digest("hex") !== pinnedRootSha256) return null;
  for (const [index, certificate] of chain.entries()) {
    const issuer = chain[index + 1] ?? root;
    if (!certificate.verify(issuer.publicKey) || (issuer !== certificate && !certificate.checkIssued(issuer))) return null;
  }
  const verifier = createVerify("SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  if (!verifier.verify({ key: leaf.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))) return null;
  if (payload.bundleId !== BUNDLE_ID || payload.environment !== "Xcode" || payload.revocationDate !== undefined) return null;
  if (typeof payload.expiresDate !== "number") return null;
  const expiresAt = new Date(payload.expiresDate);
  return expiresAt > now ? expiresAt : null;
}

export function xcodeAuthorization(userId: string, expiresAt: Date, now = new Date()): SubscriptionResyncResult {
  return {
    accountId: userId,
    authorization: { environment: "sandbox", status: "active", hasAccess: true, expiresAt, observedAt: now, source: "resync" },
    observations: { production: null, sandbox: null },
    verifiedAt: now,
  };
}
