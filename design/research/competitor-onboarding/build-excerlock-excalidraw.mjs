import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const sourcePath = path.join(root, 'selected-onboarding-flow', 'excerlock-proposed-onboarding-blueprint-v3.svg');
const outputPath = path.join(root, 'selected-onboarding-flow', 'excerlock-proposed-onboarding-v3.excalidraw');
const svg = fs.readFileSync(sourcePath, 'utf8');
const size = svg.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"/);
if (!size) throw new Error(`Could not read SVG dimensions from ${sourcePath}`);

const width = Number(size[1]);
const height = Number(size[2]);
const fileId = crypto.createHash('sha256').update(svg).digest('hex').slice(0, 40);
const now = Date.now();
const board = {
  type: 'excalidraw', version: 2, source: 'https://excalidraw.com',
  elements: [{
    id: 'excerlock-onboarding-v3', type: 'image', x: 0, y: 0, width, height,
    angle: 0, strokeColor: 'transparent', backgroundColor: 'transparent',
    fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0,
    opacity: 100, groupIds: [], frameId: null, index: 'a0', roundness: null,
    seed: 241917, version: 1, versionNonce: 884211, isDeleted: false,
    boundElements: null, updated: now, link: null, locked: false,
    status: 'saved', fileId, scale: [1, 1], crop: null,
  }],
  appState: { gridSize: null, viewBackgroundColor: '#121517', currentItemFontFamily: 1, zenModeEnabled: false },
  files: { [fileId]: {
    mimeType: 'image/svg+xml', id: fileId,
    dataURL: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    created: now, lastRetrieved: now,
  } },
};

fs.writeFileSync(outputPath, `${JSON.stringify(board)}\n`);
console.log(outputPath);
