import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import { PYODIDE_INDEX_URL } from '../../src/lib/python/protocol';

/**
 * Python tests are tagged @network: they download Pyodide from jsDelivr. Skip them offline with
 * `npx playwright test --grep-invert @network`. To run them without network, extract the matching
 * `pyodide` npm package and set PYODIDE_DIR to its folder; requests to the CDN are then served from it.
 */
export async function servePyodideLocally(context: BrowserContext) {
  const dir = process.env.PYODIDE_DIR;
  if (!dir) return;
  await context.route(`${PYODIDE_INDEX_URL}**`, async (route) => {
    const file = path.join(dir, new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const type = file.endsWith('.wasm')
      ? 'application/wasm'
      : file.endsWith('.json')
        ? 'application/json'
        : file.endsWith('js')
          ? 'text/javascript'
          : 'application/octet-stream';
    try {
      await route.fulfill({
        body: await readFile(file),
        contentType: type,
        headers: { 'access-control-allow-origin': '*' },
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
}
