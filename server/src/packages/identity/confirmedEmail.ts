export interface ConfirmedEmailReader { read(userId: string): Promise<string | null> }

export function createSupabaseConfirmedEmailReader(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}): ConfirmedEmailReader {
  return { async read(userId) {
    const response = await (options.fetcher ?? fetch)(`${options.supabaseUrl.replace(/\/+$/, "")}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: options.serviceRoleKey, authorization: `Bearer ${options.serviceRoleKey}` },
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });
    if (!response.ok) throw new Error("Confirmed account email is unavailable");
    const user = await response.json() as Record<string, unknown>;
    if (user.id !== userId || user.is_anonymous !== false || typeof user.email !== "string" || typeof user.email_confirmed_at !== "string" || !Number.isFinite(Date.parse(user.email_confirmed_at))) return null;
    return user.email.trim().toLowerCase();
  } };
}
