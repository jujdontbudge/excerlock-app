import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { config } from "../config/config.js";
import type { Environment } from "../config/env.js";

export interface VerifiedIdentity {
  userId: string;
  roles: readonly string[];
  isAnonymous: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    authIdentity?: VerifiedIdentity;
  }
}

const SUPABASE_AUDIENCE = "authenticated";
const DEFAULT_SUPABASE_RS_ALGORITHMS = ["RS256", "ES256"] as const;
const SUPABASE_HS_ALGORITHMS = ["HS256"] as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RemoteJwks = ReturnType<typeof createRemoteJWKSet>;

const jwksCache = new Map<string, RemoteJwks>();

function remoteJwksFor(url: string): RemoteJwks {
  const cached = jwksCache.get(url);
  if (cached) {
    return cached;
  }
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, jwks);
  return jwks;
}

export interface SupabaseJwtConfig {
  issuer: string;
  jwksUrl: string;
  audience: string;
  algorithms: readonly string[];
  jwtSecret: string | undefined;
}

export function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function supabaseIssuerFor(url: string): string {
  return `${normalizeSupabaseUrl(url)}/auth/v1`;
}

export function supabaseJwksUrlFor(
  supabaseUrl: string,
  override?: string,
): string {
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return `${normalizeSupabaseUrl(supabaseUrl)}/auth/v1/.well-known/jwks.json`;
}

function parseAlgorithmList(
  raw: string | undefined,
  fallback: readonly string[],
): string[] {
  if (!raw || raw.trim().length === 0) {
    return [...fallback];
  }
  const parsed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function supabaseJwtConfigFromEnv(
  env: Pick<
    Environment,
    | "supabaseUrl"
    | "supabaseJwksUrl"
    | "supabaseJwtSecret"
    | "supabaseJwtAlgorithms"
  >,
): SupabaseJwtConfig | null {
  const supabaseUrl = env.supabaseUrl?.trim();
  if (!supabaseUrl) {
    return null;
  }
  const jwtSecret = env.supabaseJwtSecret?.trim() || undefined;
  if (jwtSecret) {
    return {
      issuer: supabaseIssuerFor(supabaseUrl),
      jwksUrl: supabaseJwksUrlFor(supabaseUrl, env.supabaseJwksUrl),
      audience: SUPABASE_AUDIENCE,
      algorithms: [...SUPABASE_HS_ALGORITHMS],
      jwtSecret,
    };
  }
  return {
    issuer: supabaseIssuerFor(supabaseUrl),
    jwksUrl: supabaseJwksUrlFor(supabaseUrl, env.supabaseJwksUrl),
    audience: SUPABASE_AUDIENCE,
    algorithms: parseAlgorithmList(
      env.supabaseJwtAlgorithms,
      DEFAULT_SUPABASE_RS_ALGORITHMS,
    ),
    jwtSecret: undefined,
  };
}

function supabaseJwksFor(jwksUrl: string): RemoteJwks {
  return remoteJwksFor(jwksUrl);
}

export function isCanonicalSupabaseId(userId: string): boolean {
  return UUID_RE.test(userId);
}

function verifiedIdentityFromSupabasePayload(payload: {
  sub?: unknown;
  roles?: unknown;
  role?: unknown;
  is_anonymous?: unknown;
  isAnonymous?: unknown;
  exp?: unknown;
}): VerifiedIdentity {
  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("Supabase JWT is missing its subject");
  }
  const userId = payload.sub.trim();
  if (!isCanonicalSupabaseId(userId)) {
    throw new Error("Supabase JWT subject is not a canonical UUID");
  }
  if (typeof payload.exp !== "number") {
    throw new Error("Supabase JWT is missing expiry");
  }
  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === "string")
    : [];
  const isAnonymous =
    payload.is_anonymous === true || payload.isAnonymous === true;
  return Object.freeze({
    userId,
    roles: Object.freeze(roles),
    isAnonymous,
  });
}

export async function verifySupabaseJwt(
  token: string,
  supabaseConfig: SupabaseJwtConfig,
): Promise<VerifiedIdentity> {
  let headerAlg: string;
  try {
    headerAlg = decodeProtectedHeader(token).alg ?? "";
  } catch {
    throw new Error("Supabase JWT has an unreadable header");
  }
  if (!supabaseConfig.algorithms.includes(headerAlg)) {
    throw new Error(
      `Supabase JWT algorithm ${headerAlg || "unknown"} is not allowed`,
    );
  }

  if (supabaseConfig.jwtSecret) {
    if (headerAlg !== "HS256") {
      throw new Error("Supabase JWT algorithm mismatch for HS256 mode");
    }
    const key = new TextEncoder().encode(supabaseConfig.jwtSecret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: [...supabaseConfig.algorithms],
      issuer: supabaseConfig.issuer,
      audience: supabaseConfig.audience,
    });
    return verifiedIdentityFromSupabasePayload(payload);
  }

  const { payload } = await jwtVerify(
    token,
    supabaseJwksFor(supabaseConfig.jwksUrl),
    {
      algorithms: [...supabaseConfig.algorithms],
      issuer: supabaseConfig.issuer,
      audience: supabaseConfig.audience,
    },
  );
  return verifiedIdentityFromSupabasePayload(payload);
}

export type AuthMode =
  | { kind: "supabase"; supabase: SupabaseJwtConfig }
  | { kind: "unconfigured" };

type AuthEnvironment = Pick<
  Environment,
  "supabaseUrl" | "supabaseJwksUrl" | "supabaseJwtSecret" | "supabaseJwtAlgorithms"
>;

export function resolveAuthMode(env: AuthEnvironment = config): AuthMode {
  const supabase = supabaseJwtConfigFromEnv(env);
  return supabase ? { kind: "supabase", supabase } : { kind: "unconfigured" };
}

export async function verifyAuthToken(
  token: string,
  env: AuthEnvironment = config,
): Promise<VerifiedIdentity> {
  const mode = resolveAuthMode(env);
  if (mode.kind === "unconfigured") {
    throw new Error("Authentication is not configured");
  }
  return verifySupabaseJwt(token, mode.supabase);
}

async function authUnavailableReply(reply: FastifyReply): Promise<void> {
  await reply.code(503).send({
    error: {
      code: "AUTH_UNAVAILABLE",
      message: "Authentication is not configured",
    },
  });
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (resolveAuthMode(config).kind === "unconfigured") {
    await authUnavailableReply(reply);
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
  if (!token) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization: Bearer <token>",
      },
    });
    return;
  }

  try {
    request.authIdentity = await verifyAuthToken(token, config);
  } catch {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired session",
      },
    });
  }
}
