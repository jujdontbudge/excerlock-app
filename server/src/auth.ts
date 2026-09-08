import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";
import type { Environment } from "./env.js";

/**
 * Supabase stamps every project access token with `aud: "authenticated"`,
 * whether the session is anonymous or signed in. A token for anything else
 * (an `anon` API key, a third-party token) is not a user session.
 */
const SUPABASE_AUDIENCE = "authenticated";

/** Asymmetric signing keys the project's JWKS may publish. */
const ASYMMETRIC_ALGORITHMS = ["ES256", "RS256"] as const;

export interface AuthIdentity {
  /** Supabase `sub`: the identity spine across Postgres, Adapty and PostHog. */
  userId: string;
  /** True while the session came from `signInAnonymously()` and no provider is linked. */
  isAnonymous: boolean;
}

export interface SupabaseJwtVerification {
  /** `https://<ref>.supabase.co/auth/v1` — must equal the token's `iss`. */
  issuer: string;
  /** Asymmetric verification. Preferred, and exclusive when present. */
  jwksUrl?: string;
  /** Legacy HS256 secret. Used only when there is no JWKS url. */
  sharedSecret?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    authIdentity?: AuthIdentity;
  }
}

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(url: string): ReturnType<typeof createRemoteJWKSet> {
  const existing = jwksByUrl.get(url);
  if (existing) {
    return existing;
  }

  // jose caches and re-fetches the key set on an unknown `kid`, which is what
  // makes signing-key rotation survivable without a restart.
  const jwks = createRemoteJWKSet(new URL(url));
  jwksByUrl.set(url, jwks);
  return jwks;
}

/**
 * Turns the process environment into the verification inputs, deriving the
 * issuer and the JWKS url from the project URL so a deploy only has to set
 * `SUPABASE_URL`. Returns null when Supabase is not configured at all.
 */
export function supabaseVerificationFrom(
  environment: Environment = config,
): SupabaseJwtVerification | null {
  const projectUrl = environment.supabaseUrl?.replace(/\/+$/, "");
  const issuer = projectUrl ? `${projectUrl}/auth/v1` : undefined;
  const jwksUrl =
    environment.supabaseJwtJwksUrl ??
    (issuer ? `${issuer}/.well-known/jwks.json` : undefined);

  if (!issuer || (!jwksUrl && !environment.supabaseJwtSecret)) {
    return null;
  }

  return {
    issuer,
    ...(jwksUrl ? { jwksUrl } : {}),
    ...(environment.supabaseJwtSecret
      ? { sharedSecret: environment.supabaseJwtSecret }
      : {}),
  };
}

/**
 * Verifies a Supabase access token and reduces it to the two facts the API
 * needs. Everything else in the payload (email, provider, session id) is
 * deliberately dropped: the server stores no profile it did not receive on a
 * route of its own.
 */
export async function verifySupabaseJwt(
  token: string,
  verification: SupabaseJwtVerification,
): Promise<AuthIdentity> {
  const { payload } = verification.jwksUrl
    ? await jwtVerify(token, jwksFor(verification.jwksUrl), {
        issuer: verification.issuer,
        audience: SUPABASE_AUDIENCE,
        algorithms: [...ASYMMETRIC_ALGORITHMS],
      })
    : await jwtVerify(
        token,
        new TextEncoder().encode(requireSharedSecret(verification)),
        {
          issuer: verification.issuer,
          audience: SUPABASE_AUDIENCE,
          algorithms: ["HS256"],
        },
      );

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("Supabase JWT is missing its subject");
  }

  return Object.freeze({
    userId: payload.sub,
    isAnonymous: payload.is_anonymous === true,
  });
}

function requireSharedSecret(verification: SupabaseJwtVerification): string {
  if (!verification.sharedSecret) {
    throw new Error("Supabase JWT verification is not configured");
  }
  return verification.sharedSecret;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const verification = supabaseVerificationFrom();
  if (!verification) {
    await reply.code(503).send({
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is not configured",
      },
    });
    return;
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization: Bearer <token>",
      },
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    request.authIdentity = await verifySupabaseJwt(token, verification);
  } catch {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired Supabase session",
      },
    });
  }
}
