import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const MAX_CACHE_AGE_MS = 6 * 24 * 60 * 60 * 1000; // 6 days

export async function isFresh(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return Date.now() - s.mtimeMs < MAX_CACHE_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Download `url` into `downloadsDir/name` (atomic rename), reusing a cached
 * copy when it is less than 6 days old. Returns the cached file path.
 */
export async function downloadToCache(
  url: string,
  downloadsDir: string,
  name: string,
): Promise<string> {
  const dest = path.join(downloadsDir, name);
  if (await isFresh(dest)) {
    console.log(`  using cached ${name}`);
    return dest;
  }
  await mkdir(downloadsDir, { recursive: true });
  const tmp = `${dest}.tmp`;
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed (${res.status} ${res.statusText}): ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  await rename(tmp, dest);
  const s = await stat(dest);
  console.log(`  saved ${name} (${(s.size / 1e6).toFixed(1)} MB)`);
  return dest;
}

/**
 * Stream `url` line by line without ever buffering the whole body. While
 * streaming from the network the bytes are teed into the download cache; the
 * cache file is only kept when the stream was consumed to the end (so an early
 * stop via the callback never leaves a truncated cache behind). A fresh cached
 * copy is streamed from disk instead of hitting the network.
 *
 * `onLine` returns false to stop early.
 */
export async function streamLines(
  url: string,
  downloadsDir: string,
  name: string,
  onLine: (line: string) => boolean,
): Promise<void> {
  const dest = path.join(downloadsDir, name);
  if (await isFresh(dest)) {
    console.log(`  using cached ${name}`);
    const rl = createInterface({ input: createReadStream(dest), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!onLine(line)) break;
    }
    rl.close();
    return;
  }

  await mkdir(downloadsDir, { recursive: true });
  const tmp = `${dest}.tmp`;
  console.log(`  streaming ${url}`);
  const controller = new AbortController();
  const res = await fetch(url, { signal: controller.signal });
  if (!res.ok || !res.body) {
    throw new Error(`download failed (${res.status} ${res.statusText}): ${url}`);
  }

  const out = createWriteStream(tmp);
  let buffer = Buffer.alloc(0);
  let stopped = false;

  const flushLines = (final: boolean): boolean => {
    let start = 0;
    for (;;) {
      const nl = buffer.indexOf(0x0a, start);
      if (nl === -1) break;
      const line = buffer.subarray(start, nl).toString('utf8').replace(/\r$/, '');
      start = nl + 1;
      if (line && !onLine(line)) {
        buffer = buffer.subarray(start);
        return false;
      }
    }
    buffer = buffer.subarray(start);
    if (final && buffer.length > 0) {
      const line = buffer.toString('utf8').replace(/\r$/, '');
      buffer = Buffer.alloc(0);
      if (line && !onLine(line)) return false;
    }
    return true;
  };

  try {
    for await (const chunk of Readable.fromWeb(res.body)) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (!out.write(buf)) {
        await new Promise<void>((resolve) => out.once('drain', resolve));
      }
      buffer = buffer.length === 0 ? buf.subarray() : Buffer.concat([buffer, buf]);
      if (!flushLines(false)) {
        stopped = true;
        break;
      }
    }
    if (!stopped) flushLines(true);
  } finally {
    if (stopped) controller.abort();
    await new Promise<void>((resolve) => out.end(resolve));
    if (stopped) {
      await rm(tmp, { force: true });
    } else {
      await rename(tmp, dest);
      const s = await stat(dest);
      console.log(`  cached ${name} (${(s.size / 1e6).toFixed(1)} MB)`);
    }
  }
}
