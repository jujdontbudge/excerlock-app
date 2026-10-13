import { pathToFileURL } from "node:url";
import { z } from "zod";
import { closeDb } from "../db/index.js";
import { createComplimentaryAccessRepository } from "./lib/complimentaryAccess.js";

const requestSchema = z.object({
  action: z.enum(["grant", "revoke", "list"]),
  environment: z.enum(["production", "sandbox"]),
  email: z.string().optional(),
  actor: z.string().trim().min(1).max(200),
  note: z.string().trim().min(1).max(1000).optional(),
  until: z.string().datetime({ offset: true }).optional(),
}).strict();

export async function runAccessCommand(input: unknown) {
  const request = requestSchema.parse(input);
  const repository = createComplimentaryAccessRepository();
  if (request.action === "list") return repository.list(request.environment, request.email);
  if (!request.email || !request.note) throw new Error("Email and note are required");
  if (request.action === "revoke") return repository.revoke({ ...request, email: request.email, note: request.note });
  const grant = await repository.grant({ ...request, email: request.email, note: request.note, expiresAt: request.until ? new Date(request.until) : null });
  return { id: grant.id, environment: grant.environment, expiresAt: grant.expiresAt, grantedAt: grant.grantedAt };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    const result = await runAccessCommand(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch {
    process.stderr.write("Access command failed; check the request, database configuration and deployed migration\n");
    process.exitCode = 1;
  } finally { await closeDb(); }
}
