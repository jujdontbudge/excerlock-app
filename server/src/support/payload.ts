import { z } from "zod";
import type { SupportCategory } from "@excerlock/analytics-events";

/**
 * The app speaks Problem / Question / Idea (B17 cut feature requests, so there
 * is no voting and no published list). The analytics registry speaks
 * support / bug / feature, and that enum is locked by
 * `@excerlock/analytics-events`. The wire therefore takes the product's words
 * and this map is the one place they become the registry's.
 *
 * The registry spellings are also accepted so the build currently on
 * TestFlight keeps working against the box until P2-T12 cuts over; they can be
 * dropped from this union then.
 */
const CATEGORY_BY_WIRE_VALUE = {
  problem: "bug",
  question: "support",
  idea: "feature",
  bug: "bug",
  support: "support",
  feature: "feature",
} as const satisfies Record<string, SupportCategory>;

export type SupportWireCategory = keyof typeof CATEGORY_BY_WIRE_VALUE;

export function canonicalCategory(
  wireValue: SupportWireCategory,
): SupportCategory {
  return CATEGORY_BY_WIRE_VALUE[wireValue];
}

const permissionStatus = z.enum([
  "notDetermined",
  "granted",
  "denied",
  "restricted",
  "whenInUse",
  "always",
]);

/**
 * The privacy floor for the diagnostics bundle (P2-T22 §5), enforced rather
 * than described: the object is `.strict()`, so an app name, bundle id, gym
 * name or coordinate has no field to arrive in and the request is rejected.
 */
const diagnostics = z
  .object({
    appVersion: z.string().max(40),
    appBuild: z.string().max(40),
    iosVersion: z.string().max(40),
    deviceModel: z.string().max(80),
    entitlementStatus: z.enum([
      "unknown",
      "none",
      "trial",
      "active",
      "expired",
      "billingIssue",
    ]),
    permissions: z
      .object({
        screenTime: permissionStatus,
        motion: permissionStatus,
        location: permissionStatus,
        health: permissionStatus,
        camera: permissionStatus,
        notifications: permissionStatus,
      })
      .strict(),
    ruleCount: z.number().int().min(0),
    lastEnforcementResult: z.string().max(200),
  })
  .strict();

/**
 * `replyTo` is optional on purpose. An anonymous user with no email address
 * must still be able to report a problem, and a report nobody can answer beats
 * a report that was rejected. `title` is only sent by the old client.
 */
export const supportSubmissionRequest = z
  .object({
    category: z.enum(
      Object.keys(CATEGORY_BY_WIRE_VALUE) as [
        SupportWireCategory,
        ...SupportWireCategory[],
      ],
    ),
    message: z.string().trim().min(1).max(4_000),
    title: z.string().trim().min(1).max(120).nullish(),
    replyTo: z.string().trim().email().max(254).nullish(),
    diagnostics: diagnostics.nullish(),
  })
  .strict();

export type SupportSubmissionRequest = z.infer<typeof supportSubmissionRequest>;
export type SupportDiagnostics = z.infer<typeof diagnostics>;
