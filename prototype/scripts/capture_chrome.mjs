#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, ...rest] = item.replace(/^--/, '').split('=');
    return [key, rest.join('=')];
  }),
);

const port = Number(args.port ?? 9227);
const selector = args.selector ?? '[data-testid="complete-button"]';
const output = args.output ?? '/tmp/excerlock-cdp.png';
const beforeMs = Number(args.before ?? 1200);
const afterMs = Number(args.after ?? 4200);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findPage() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = pages.find((item) => item.type === 'page' && item.url.includes('localhost:8081'));
      if (page) return page;
    } catch {
      // Chrome may still be starting.
    }
    await sleep(100);
  }
  throw new Error('Timed out waiting for the ExcerLock Chrome tab');
}

const page = await findPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const handlers = pending.get(message.id);
  if (!handlers) return;
  pending.delete(message.id);
  if (message.error) handlers.reject(new Error(message.error.message));
  else handlers.resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

await call('Page.enable');
await call('Runtime.enable');
if (args.reload === '1') {
  await call('Page.reload', { ignoreCache: true });
}
await sleep(beforeMs);
const target = await call('Runtime.evaluate', {
  expression: `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`,
  returnByValue: true,
});
if (!target.result.value) throw new Error(`Selector not found: ${selector}`);
await call('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: target.result.value.x,
  y: target.result.value.y,
  button: 'left',
  clickCount: 1,
});
await sleep(120);
await call('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: target.result.value.x,
  y: target.result.value.y,
  button: 'left',
  clickCount: 1,
});
await sleep(afterMs);
const text = await call('Runtime.evaluate', {
  expression: 'document.body.innerText',
  returnByValue: true,
});
const state = await call('Runtime.evaluate', {
  expression: `(() => {
    const complete = document.querySelector('[data-testid="complete-button"]');
    const shackle = document.querySelector('[data-testid="shackle-layer"]');
    const pointerEvents = complete ? getComputedStyle(complete).pointerEvents : null;
    const shackleTransform = shackle ? getComputedStyle(shackle).transform : null;
    const matrix = shackleTransform && shackleTransform !== 'none'
      ? new DOMMatrixReadOnly(shackleTransform)
      : null;
    const shackleRect = shackle?.getBoundingClientRect();
    return {
      buttonCount: document.querySelectorAll('button').length,
      completionBlocked: Boolean(complete?.disabled || pointerEvents === 'none'),
      completePointerEvents: pointerEvents,
      completeWidth: complete?.firstElementChild?.getBoundingClientRect().width ?? null,
      shackleTransform,
      shackleTranslation: matrix ? { x: matrix.e, y: matrix.f } : null,
      shackleRotationDegrees: matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : null,
      shackleRect: shackleRect
        ? { x: shackleRect.x, y: shackleRect.y, width: shackleRect.width, height: shackleRect.height }
        : null,
    };
  })()`,
  returnByValue: true,
});
const screenshot = await call('Page.captureScreenshot', {
  format: 'png',
  fromSurface: true,
  captureBeyondViewport: false,
});
await writeFile(output, Buffer.from(screenshot.data, 'base64'));
socket.close();

if (args.expectUpright === '1') {
  const rotation = state.result.value.shackleRotationDegrees;
  if (rotation == null || Math.abs(rotation) > 0.1) {
    throw new Error(`Shackle rotated ${rotation}°; expected it to remain upright`);
  }
}

if (args.expectFinal === '1') {
  const translation = state.result.value.shackleTranslation;
  if (
    !translation ||
    Math.abs(translation.x - 72.5) > 0.25 ||
    Math.abs(translation.y) > 0.25
  ) {
    throw new Error(
      `Final shackle translation was ${JSON.stringify(translation)}; expected { x: 72.5, y: 0 }`,
    );
  }
}

console.log(JSON.stringify({ clicked: target.result.value, output, text: text.result.value, state: state.result.value }));
