import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { stateDir } from '../lib/paths.ts';

type Control = { variant: string; mode: 'normal' | 'never' | 'cutoff' | 'corrupt' | 'rollback' | 'offline' | 'unavailable'; delayMs: number; releaseAtPage?: string; releaseDelayMs?: number; second?: string; transition?: boolean; legacy?: boolean };
export type LabEvent = { event: string; at: number; page?: string; updateId?: string; embedded?: boolean; cover?: boolean; pending?: string | null; properties?: Record<string, unknown>;
  variant?: string; next?: string; from?: string; progress?: number; path?: string[]; completed?: string[]; prerequisiteAnswersPresent?: boolean; purchaseBusy?: boolean; prompt?: string | null; navigationTransition?: boolean; ok?: boolean; checked?: boolean; entering?: boolean; setupMatchesAnswers?: boolean; jsModuleEpochMs?: number };

export function startLabServer(port = 8098) {
  const root = stateDir('ota-lab');
  const events: LabEvent[] = [];
  let control: Control = { variant: 'copy', mode: 'normal', delayMs: 0 };
  let started = Date.now();
  let released = false;
  let releasedAt = 0;
  let offline = false;
  const pendingResponses = new Set<import('node:http').ServerResponse>();
  const publications = new Map<string, { id: string; createdAt: string }>();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    response.setHeader('Access-Control-Allow-Origin', '*');
    if (request.method === 'POST' && ['/control', '/events', '/network'].includes(url.pathname)) {
      let body = '';
      for await (const chunk of request) { body += chunk; if (body.length > 16384) { response.writeHead(413).end(); return; } }
      const parsed = JSON.parse(body);
      if (url.pathname === '/control') {
        control = parsed as Control;
        for (const pending of pendingResponses) pending.destroy();
        started = Date.now(); released = false; releasedAt = 0; offline = false; events.length = 0; publications.clear();
        writeFileSync(join(root, 'events.jsonl'), '');
      } else if (url.pathname === '/network') {
        offline = parsed.offline === true;
        if (offline) for (const pending of pendingResponses) pending.destroy();
        const entry = { event: offline ? 'network-offline' : 'network-online', at: Date.now() };
        events.push(entry); appendFileSync(join(root, 'events.jsonl'), JSON.stringify(entry) + '\n');
      } else {
        const entry = { ...parsed, at: Date.now() } as LabEvent;
        events.push(entry);
        appendFileSync(join(root, 'events.jsonl'), JSON.stringify(entry) + '\n');
        if (entry.page === control.releaseAtPage && !released && !(entry.event === 'frame' && entry.cover)) { released = true; releasedAt = Date.now(); }
      }
      response.setHeader('Content-Type', 'application/json');
      response.end('{}'); return;
    }
    if (url.pathname === '/events') {
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(events)); return;
    }
    if (url.pathname === '/ready') { response.end('local-only'); return; }
    if (url.pathname === '/settings') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(control)); return; }
    if (url.pathname === '/manifest') {
      if (offline || control.mode === 'offline') { response.destroy(); return; }
      if (control.mode === 'unavailable') { response.writeHead(503).end(); return; }
      response.setHeader('expo-protocol-version', '1'); response.setHeader('expo-sfv-version', '0');
      response.setHeader('cache-control', 'no-store');
      if (control.mode === 'rollback') {
        const boundary = 'ota-lab-directive';
        response.setHeader('Content-Type', `multipart/mixed; boundary=${boundary}`);
        response.end(`--${boundary}\r\nContent-Disposition: form-data; name="directive"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ type: 'rollBackToEmbedded', parameters: { commitTime: new Date().toISOString() } })}\r\n--${boundary}--\r\n`); return;
      }
      const variant = control.second && events.some((event) => event.event === 'frame' && event.pending) ? control.second : control.variant;
      const file = join(root, 'updates', variant, 'manifest.json');
      if (!existsSync(file)) { response.writeHead(404).end(); return; }
      response.setHeader('Content-Type', 'application/expo+json');
      let published = publications.get(variant);
      if (!published) { published = { id: randomUUID(), createdAt: new Date(Date.now() + publications.size).toISOString() }; publications.set(variant, published); }
      const manifest = { ...JSON.parse(readFileSync(file, 'utf8')), ...published };
      const entry = { event: 'manifest', at: Date.now(), variant, updateId: published.id };
      events.push(entry); appendFileSync(join(root, 'events.jsonl'), JSON.stringify(entry) + '\n');
      writeFileSync(join(root, 'served-manifest.json'), JSON.stringify(manifest, null, 2));
      response.end(JSON.stringify(manifest)); return;
    }
    if (url.pathname.startsWith('/assets/')) {
      if (offline) { response.destroy(); return; }
      pendingResponses.add(response);
      response.on('close', () => pendingResponses.delete(response));
      const isBundle = url.pathname.endsWith('.hbc');
      if (isBundle) {
        const entry = { event: 'bundle-request', at: Date.now() }; events.push(entry); appendFileSync(join(root, 'events.jsonl'), JSON.stringify(entry) + '\n');
      }
      const path = resolve(root, 'updates', url.pathname.slice('/assets/'.length));
      if (!path.startsWith(resolve(root, 'updates') + sep) || !existsSync(path)) { response.writeHead(404).end(); return; }
      if (isBundle && control.mode === 'never') { request.on('close', () => response.destroy()); return; }
      const bytes = readFileSync(path);
      const compressed = gzipSync(bytes);
      const transmitted = Buffer.from(compressed);
      if (isBundle && control.mode === 'corrupt') transmitted[0] = (transmitted[0] ?? 0) ^ 255;
      response.setHeader('Content-Encoding', 'gzip');
      response.setHeader('Content-Length', transmitted.length);
      response.setHeader('Content-Type', 'application/octet-stream');
      let sent = 0;
      let lastChunkAt = Date.now();
      const wait = async () => {
        while (isBundle && !response.destroyed && (Date.now() - started < control.delayMs || (control.releaseAtPage && (!released || Date.now() - releasedAt < (control.releaseDelayMs ?? 0))))) {
          if (Date.now() - lastChunkAt >= 10_000) {
            const next = Math.min(sent + 256, transmitted.length - 1);
            if (next > sent) response.write(transmitted.subarray(sent, next));
            const entry = { event: 'bundle-progress', at: Date.now() }; events.push(entry); appendFileSync(join(root, 'events.jsonl'), JSON.stringify(entry) + '\n');
            sent = next; lastChunkAt = Date.now();
          }
          await new Promise((done) => setTimeout(done, 100));
        }
      };
      await wait();
      if (response.destroyed) return;
      if (isBundle && control.mode === 'cutoff') {
        response.write(transmitted.subarray(sent, Math.floor(transmitted.length / 2)));
        await new Promise((done) => setTimeout(done, 100)); response.destroy(); return;
      }
      if (isBundle) {
        const entry = { event: 'bundle-served', at: Date.now() }; events.push(entry); appendFileSync(join(root, 'events.jsonl'), JSON.stringify(entry) + '\n');
      }
      response.end(transmitted.subarray(sent)); return;
    }
    response.writeHead(404).end();
  });
  server.listen(port, '127.0.0.1');
  console.log(`OTA lab listening at http://127.0.0.1:${port}/manifest`);
  return server;
}

export function makeManifest(exportDir: string, config: unknown, baseUrl: string) {
  const metadata = JSON.parse(readFileSync(join(exportDir, 'metadata.json'), 'utf8'));
  const ios = metadata.fileMetadata.ios as { bundle: string; assets: { path: string; ext: string }[] };
  const asset = (path: string, ext: string) => {
    const bytes = readFileSync(join(exportDir, path));
    const hash = createHash('sha256').update(bytes).digest('base64url');
    return { key: basename(path).split('.')[0], hash, fileExtension: `.${ext}`, contentType: 'application/octet-stream', url: `${baseUrl}/assets/${path}` };
  };
  return { id: randomUUID(), createdAt: new Date().toISOString(), runtimeVersion: '4',
    launchAsset: asset(ios.bundle, 'hbc'), assets: ios.assets.map((entry) => asset(entry.path, entry.ext)),
    metadata: {}, extra: { expoClient: config } };
}
