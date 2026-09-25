import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
} from "jose";
import { config } from "./config.js";
import type { Environment } from "./env.js";

export type AuthProvider = "supabase" | "clerk";

export interface VerifiedIdentity {
  userId: string;
  roles: readonly string[];
  provider: AuthProvider;
  isAnonymous: boolean;
}

export interface ClerkIdentity {
  userId: string;
  roles: readonly string[];
}

declare module "fastify" {
  interface FastifyRequest {
    authIdentity?: VerifiedIdentity;
    clerkIdentity?: ClerkIdentity;
  }
}

const CLERK_JWKS_URL = new URL("https://api.clerk.com/v1/jwks");
const SUPABASE_AUDIENCE = "authenticated";
const DEFAULT_SUPABASE_RS_ALGORITHMS = ["RS256", "ES256"] as const;
const SUPABASE_HS_ALGORITHMS = ["HS256"] as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RemoteJwks = ReturnType<typeof createRemoteJWKSet>;

const jwksCache = new Map<string, { authHeader?: string; jwks: RemoteJwks }>();

function remoteJwksFor(url: string, authHeader?: string): RemoteJwks {
  const cached = jwksCache.get(url);
  if (cached && cached.authHeader === authHeader) {
    return cached.jwks;
  }
  const jwks = createRemoteJWKSet(new URL(url), {
    ...(authHeader ? { headers: { authorization: authHeader } } : {}),
  });
  if (authHeader === undefined) {
    jwksCache.set(url, { jwks });
  } else {
    jwksCache.set(url, { authHeader, jwks });
  }
  return jwks;
}

export function clearAuthJwksCache(): void {
  jwksCache.clear();
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

export interface ClerkJwtConfig {
  secretKey: string;
  issuer: string | undefined;
}

export function clerkJwtConfigFromEnv(
  env: Pick<Environment, "clerkSecretKey" | "clerkIssuer">,
): ClerkJwtConfig | null {
  const secretKey = env.clerkSecretKey?.trim();
  if (!secretKey) {
    return null;
  }
  const issuer = env.clerkIssuer?.trim() || undefined;
  return { secretKey, issuer };
}

function clerkJwksFor(secretKey: string): RemoteJwks {
  return remoteJwksFor(CLERK_JWKS_URL.href, `Bearer ${secretKey}`);
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
    provider: "supabase" as const,
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

export async function verifyClerkJwt(
  token: string,
  secretKey: string,
  options: { issuer?: string } = {},
): Promise<ClerkIdentity> {
  const issuer = options.issuer?.trim() || undefined;
  const { payload } = await jwtVerify(token, clerkJwksFor(secretKey), {
    algorithms: ["RS256"],
    ...(issuer ? { issuer } : {}),
  });

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("Clerk JWT is missing its subject");
  }

  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === "string")
    : [];

  return Object.freeze({
    userId: payload.sub,
    roles: Object.freeze(roles),
  });
}

export function peekUnverifiedIssuer(token: string): string | null {
  try {
    const payload = decodeJwt(token);
    return typeof payload.iss === "string" ? payload.iss : null;
  } catch {
    return null;
  }
}

export type AuthMode =
  | { kind: "supabase"; supabase: SupabaseJwtConfig }
  | { kind: "clerk"; clerk: ClerkJwtConfig }
  | {
      kind: "dual";
      supabase: SupabaseJwtConfig;
      clerk: ClerkJwtConfig & { issuer: string };
    }
  | { kind: "unconfigured" };

export function resolveAuthMode(
  env: Pick<
    Environment,
    | "supabaseUrl"
    | "supabaseJwksUrl"
    | "supabaseJwtSecret"
    | "supabaseJwtAlgorithms"
    | "clerkSecretKey"
    | "clerkIssuer"
  > = config,
): AuthMode {
  const supabase = supabaseJwtConfigFromEnv(env);
  const clerk = clerkJwtConfigFromEnv(env);
  if (supabase && clerk) {
    if (clerk.issuer) {
      return {
        kind: "dual",
        supabase,
        clerk: { secretKey: clerk.secretKey, issuer: clerk.issuer },
      };
    }
    return { kind: "supabase", supabase };
  }
  if (supabase) {
    return { kind: "supabase", supabase };
  }
  if (clerk) {
    return { kind: "clerk", clerk };
  }
  return { kind: "unconfigured" };
}

export async function verifyAuthToken(
  token: string,
  env: Pick<
    Environment,
    | "supabaseUrl"
    | "supabaseJwksUrl"
    | "supabaseJwtSecret"
    | "supabaseJwtAlgorithms"
    | "clerkSecretKey"
    | "clerkIssuer"
  > = config,
): Promise<VerifiedIdentity> {
  const mode = resolveAuthMode(env);
  if (mode.kind === "unconfigured") {
    throw new Error("Authentication is not configured");
  }
  if (mode.kind === "supabase") {
    return verifySupabaseJwt(token, mode.supabase);
  }
  if (mode.kind === "clerk") {
    const clerk = await verifyClerkJwt(token, mode.clerk.secretKey, {
      ...(mode.clerk.issuer ? { issuer: mode.clerk.issuer } : {}),
    });
    return Object.freeze({
      ...clerk,
      provider: "clerk" as const,
      isAnonymous: false,
    });
  }
  const issuer = peekUnverifiedIssuer(token);
  if (issuer === mode.supabase.issuer) {
    return verifySupabaseJwt(token, mode.supabase);
  }
  if (issuer === mode.clerk.issuer) {
    const clerk = await verifyClerkJwt(token, mode.clerk.secretKey, {
      issuer: mode.clerk.issuer,
    });
    return Object.freeze({
      ...clerk,
      provider: "clerk" as const,
      isAnonymous: false,
    });
  }
  throw new Error("JWT issuer is not recognized");
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
  const mode = resolveAuthMode(config);
  if (mode.kind === "unconfigured") {
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
    const identity = await verifyAuthToken(token, config);
    request.authIdentity = identity;
    request.clerkIdentity = Object.freeze({
      userId: identity.userId,
      roles: identity.roles,
    });
  } catch {
    const message =
      mode.kind === "clerk"
        ? "Invalid or expired Clerk session"
        : "Invalid or expired session";
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message,
      },
    });
  }
}
