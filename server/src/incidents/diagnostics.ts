export const FORBIDDEN_DIAGNOSTIC_KEYS = new Set([
  "latitude",
  "longitude",
  "lat",
  "lng",
  "lon",
  "coords",
  "coordinates",
  "coordinate",
  "email",
  "phone",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authorization",
  "password",
  "secret",
  "bundleid",
  "bundleidentifier",
  "appname",
  "appnames",
  "applicationtoken",
  "applicationtokens",
  "categorytoken",
  "webdomaintoken",
  "familyactivityselection",
]);

export function findForbiddenDiagnosticKey(
  value: unknown,
  path = "diagnostics",
): string | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findForbiddenDiagnosticKey(item, `${path}[${index}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (value === null || typeof value !== "object") {
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_DIAGNOSTIC_KEYS.has(key.toLowerCase())) {
      return childPath;
    }
    const found = findForbiddenDiagnosticKey(child, childPath);
    if (found) {
      return found;
    }
  }
  return null;
}
